'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Megaphone, Info, AlertTriangle, AlertCircle, Wrench } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'urgent' | 'maintenance';
  priority: 'low' | 'normal' | 'high';
  remind_strategy: 'once' | 'always';
  created_at: string;
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  info: <Info className="h-5 w-5 text-blue-500" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
  urgent: <AlertCircle className="h-5 w-5 text-red-500" />,
  maintenance: <Wrench className="h-5 w-5 text-muted-foreground" />,
};

const TYPE_BORDER: Record<string, string> = {
  info: 'border-l-blue-500',
  warning: 'border-l-amber-500',
  urgent: 'border-l-red-500',
  maintenance: 'border-l-muted-foreground',
};

// Compliance: read status stored ONLY in client localStorage, no server tracking
const DISMISSED_KEY = 'dismissed_announcements';

function getDismissedIds(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as Array<{ id: number; ts: number }>;
    // Clean up entries older than 90 days (auto-expiry)
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const valid = parsed.filter((e) => e.ts > cutoff);
    if (valid.length !== parsed.length) {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(valid));
    }
    return new Set(valid.map((e) => e.id));
  } catch {
    return new Set();
  }
}

function markDismissed(id: number): void {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    const existing: Array<{ id: number; ts: number }> = raw ? JSON.parse(raw) : [];
    if (!existing.some((e) => e.id === id)) {
      existing.push({ id, ts: Date.now() });
    }
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(existing));
  } catch {
    // Silently fail - non-critical feature
  }
}

function clearDismissedForAlwaysRemind(): void {
  // For 'always' remind strategy, we don't persist dismissal across sessions
  // But within a session we still want to allow dismissal
  // This is handled in component state, not localStorage
}

interface AnnouncementPopupProps {
  isLoggedIn: boolean;
}

export function AnnouncementPopup({ isLoggedIn }: AnnouncementPopupProps) {
  const { t } = useI18n();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/announcements');
      if (!res.ok) return;
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAnnouncements(json.data);
      }
    } catch {
      // Silently fail - non-critical
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) fetchAnnouncements();
    else setLoaded(true);
  }, [isLoggedIn, fetchAnnouncements]);

  // Determine which announcements to show
  useEffect(() => {
    if (!loaded || announcements.length === 0) return;

    const dismissedIds = getDismissedIds();
    const visible = announcements.filter((a) => {
      // If session-dismissed, skip
      if (sessionDismissed.has(a.id)) return false;
      // If remind_strategy is 'once' and already dismissed, skip
      if (a.remind_strategy === 'once' && dismissedIds.has(a.id)) return false;
      // 'always' strategy: always show unless session-dismissed
      return true;
    });

    if (visible.length > 0) {
      setCurrentIndex(0);
      setOpen(true);
      // Re-filter announcements to only visible ones for navigation
      setAnnouncements(visible);
    }
  }, [loaded, sessionDismissed]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentAnnouncement = announcements[currentIndex];

  const handleDismiss = useCallback(() => {
    if (!currentAnnouncement) return;

    // Mark as dismissed based on strategy
    if (currentAnnouncement.remind_strategy === 'once') {
      markDismissed(currentAnnouncement.id);
    }
    // For 'always' strategy, only dismiss for this session
    setSessionDismissed((prev) => new Set(prev).add(currentAnnouncement.id));

    // If more announcements to show, move to next
    if (currentIndex < announcements.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setOpen(false);
    }
  }, [currentAnnouncement, currentIndex, announcements.length]);

  const handleSkipAll = useCallback(() => {
    announcements.forEach((a) => {
      if (a.remind_strategy === 'once') {
        markDismissed(a.id);
      }
      setSessionDismissed((prev) => new Set(prev).add(a.id));
    });
    setOpen(false);
  }, [announcements]);

  if (!currentAnnouncement) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleSkipAll(); }}>
      <DialogContent className="sm:max-w-lg border-l-4 border-l-0">
        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${TYPE_BORDER[currentAnnouncement.type] ?? 'border-l-blue-500'}`} 
             style={{ borderLeftWidth: '4px', borderLeftStyle: 'solid', borderLeftColor: 'var(--tw-border-opacity, 1)' }} />
        <DialogHeader className="pl-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {TYPE_ICON[currentAnnouncement.type] ?? <Megaphone className="h-5 w-5" />}
            {currentAnnouncement.title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {new Date(currentAnnouncement.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            {currentAnnouncement.remind_strategy === 'once'
              ? ` · ${t('announcement.remindOnce')}`
              : ` · ${t('announcement.remindAlways')}`}
          </DialogDescription>
        </DialogHeader>
        <div className="pl-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {currentAnnouncement.content}
        </div>
        <DialogFooter className="flex-row items-center justify-between gap-2 pl-4 sm:justify-between">
          <span className="text-xs text-muted-foreground">
            {announcements.length > 1
              ? `${currentIndex + 1} / ${announcements.length}`
              : ''}
          </span>
          <div className="flex gap-2">
            {announcements.length > 1 && (
              <Button variant="ghost" size="sm" onClick={handleSkipAll}>
                {t('announcement.closeAll')}
              </Button>
            )}
            <Button size="sm" onClick={handleDismiss}>
              {currentIndex < announcements.length - 1 ? t('announcement.next') : t('announcement.gotIt')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
