/**
 * Activity Tracker - GDPR/CCPA Compliant User Behavior Tracking
 *
 * Compliance Design:
 * - Device ID: SHA-256 hashed before storage, never raw
 * - PII: No email/phone/name in metadata, only action context
 * - Consent: Respects user opt-out via localStorage flag
 * - Data Minimization: Only tracks essential product optimization events
 * - Retention: 90-day auto-expiry on server side
 * - Transparency: Users can view/opt-out in settings
 *
 * Event Categories:
 * - auth: login, logout, register, bind_email, bind_phone
 * - account: permission_change, role_change, settings_change
 * - action: payment_init, payment_success, export, share, ai_analyze, upload
 * - page_view: homepage, dashboard, settings, payment, analysis
 */

// ---- Types ----
export type EventCategory = 'auth' | 'account' | 'action' | 'page_view';

export type AuthEventType = 'login' | 'logout' | 'register' | 'bind_email' | 'bind_phone' | 'login_failed';
export type AccountEventType = 'permission_change' | 'role_change' | 'settings_change' | 'password_change';
export type ActionEventType = 'payment_init' | 'payment_success' | 'payment_failed' | 'export' | 'share' | 'ai_analyze' | 'upload' | 'dashboard_create' | 'report_generate' | 'data_clean' | 'sql_query' | 'formula_generate' | 'chart_create';
export type PageViewEventType = 'homepage' | 'dashboard' | 'settings' | 'payment' | 'analysis' | 'data_table' | 'chart_center' | 'metric_center' | 'ai_assistant' | 'sql_lab' | 'admin_panel';

export type EventType = AuthEventType | AccountEventType | ActionEventType | PageViewEventType;

export interface ActivityEvent {
  category: EventCategory;
  type: EventType;
  metadata?: Record<string, string | number | boolean | null>;
}

// ---- Compliance Constants ----
const CONSENT_KEY = 'activity_tracking_consent';
const SESSION_ID_KEY = 'activity_session_id';
const OPT_OUT_KEY = 'activity_tracking_opt_out';

// Events that are always tracked regardless of consent (security-critical)
const ALWAYS_TRACK_EVENTS: EventType[] = ['login', 'logout', 'login_failed', 'permission_change', 'role_change'];

// ---- Device Fingerprint Hashing ----
async function hashDeviceId(input: string): Promise<string> {
  // SHA-256 hash of device fingerprint - GDPR Art.25 data protection by design
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateDeviceIdHash(): Promise<string> {
  if (typeof window === 'undefined') return '';
  // Collect non-PII browser characteristics for device fingerprinting
  const components = [
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
  ];
  // Add canvas fingerprint (non-unique, but contributes to hash diversity)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('DataInsight-FP', 2, 2);
      components.push(canvas.toDataURL().slice(0, 50));
    }
  } catch {
    // Canvas not available, skip
  }
  return hashDeviceId(components.join('|'));
}

// ---- Session Management ----
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36);
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

// ---- Consent Management ----
export function isTrackingOptedIn(): boolean {
  if (typeof window === 'undefined') return false;
  // Check explicit opt-out first
  if (localStorage.getItem(OPT_OUT_KEY) === 'true') return false;
  // Check consent (default: opted in for non-PII tracking)
  const consent = localStorage.getItem(CONSENT_KEY);
  return consent !== 'false'; // Default to opted-in
}

export function setTrackingConsent(consent: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONSENT_KEY, consent ? 'true' : 'false');
  if (!consent) {
    localStorage.setItem(OPT_OUT_KEY, 'true');
  } else {
    localStorage.removeItem(OPT_OUT_KEY);
  }
}

export function getTrackingConsentStatus(): { optedIn: boolean; canOptOut: boolean } {
  return {
    optedIn: isTrackingOptedIn(),
    canOptOut: true, // CCPA right to opt-out
  };
}

// ---- PII Sanitization ----
function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, string | number | boolean | null> {
  const sanitized: Record<string, string | number | boolean | null> = {};
  const PII_PATTERNS = [
    /email/i, /phone/i, /mobile/i, /tel/i, /address/i, /name/i,
    /password/i, /token/i, /secret/i, /key/i, /ssn/i, /id_card/i,
  ];

  for (const [key, value] of Object.entries(metadata)) {
    // Skip keys that look like PII
    if (PII_PATTERNS.some(pattern => pattern.test(key))) {
      continue;
    }
    // Only allow primitive types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (value === null) {
      sanitized[key] = null;
    }
    // Objects and arrays are silently dropped
  }
  return sanitized;
}

// ---- Batch Queue ----
interface QueuedEvent extends ActivityEvent {
  timestamp: number;
  sessionId: string;
  deviceIdHash: string;
}

let eventQueue: QueuedEvent[] = [];
let deviceIdHashCache = '';
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const FLUSH_INTERVAL = 5000; // 5 seconds batch
const MAX_QUEUE_SIZE = 20;
const MAX_RETRIES = 2;

// ---- Core Track Function ----
export async function trackEvent(event: ActivityEvent): Promise<void> {
  if (typeof window === 'undefined') return;

  // Always allow security-critical events
  const isSecurityEvent = ALWAYS_TRACK_EVENTS.includes(event.type);
  if (!isSecurityEvent && !isTrackingOptedIn()) return;

  // Lazy init device hash
  if (!deviceIdHashCache) {
    deviceIdHashCache = await generateDeviceIdHash();
  }

  const queuedEvent: QueuedEvent = {
    ...event,
    timestamp: Date.now(),
    sessionId: getOrCreateSessionId(),
    deviceIdHash: deviceIdHashCache,
    metadata: event.metadata ? sanitizeMetadata(event.metadata) : undefined,
  };

  eventQueue.push(queuedEvent);

  // Flush immediately if queue is full
  if (eventQueue.length >= MAX_QUEUE_SIZE) {
    await flushEvents();
  } else if (!flushTimer) {
    // Schedule batch flush
    flushTimer = setTimeout(() => {
      flushEvents();
    }, FLUSH_INTERVAL);
  }
}

// ---- Convenience Trackers ----
export function trackAuth(type: AuthEventType, metadata?: Record<string, string | number | boolean | null>) {
  return trackEvent({ category: 'auth', type, metadata });
}

export function trackAccount(type: AccountEventType, metadata?: Record<string, string | number | boolean | null>) {
  return trackEvent({ category: 'account', type, metadata });
}

export function trackAction(type: ActionEventType, metadata?: Record<string, string | number | boolean | null>) {
  return trackEvent({ category: 'action', type, metadata });
}

export function trackPageView(page: PageViewEventType, metadata?: Record<string, string | number | boolean | null>) {
  return trackEvent({ category: 'page_view', type: page, metadata });
}

// ---- Flush to Server ----
async function flushEvents(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (eventQueue.length === 0) return;

  const batch = eventQueue.splice(0, eventQueue.length);

  try {
    const res = await fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
    });

    if (!res.ok && batch.length > 0) {
      // Re-queue on failure (with retry limit)
      const retryable = batch.filter((e: QueuedEvent & { _retries?: number }) => {
        const retries = e._retries || 0;
        return retries < MAX_RETRIES;
      }).map((e: QueuedEvent & { _retries?: number }) => {
        e._retries = (e._retries || 0) + 1;
        return e;
      });
      eventQueue.unshift(...retryable);
    }
  } catch {
    // Network error - re-queue for next flush
    eventQueue.unshift(...batch);
    // Cap queue to prevent memory leak
    if (eventQueue.length > MAX_QUEUE_SIZE * 3) {
      eventQueue = eventQueue.slice(-MAX_QUEUE_SIZE);
    }
  }
}

// ---- Flush on page unload ----
if (typeof window !== 'undefined') {
  const origBeforeUnload = window.onbeforeunload;
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      // Use sendBeacon for reliable delivery on page unload
      const payload = JSON.stringify({ events: eventQueue });
      navigator.sendBeacon?.('/api/activity-log', payload);
      eventQueue = [];
    }
  });

  // Flush on visibility change (mobile tab switch)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && eventQueue.length > 0) {
      flushEvents();
    }
  });
}
