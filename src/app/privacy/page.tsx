import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
          ← Back to DataInsight
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: May 15, 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Data We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              DataInsight is designed with a <strong>data-minimization-first</strong> philosophy. We only collect the minimum information necessary to provide our service:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account Information</strong>: Username, email (for verification), and hashed password. We never store passwords in plain text.</li>
              <li><strong>Usage Logs</strong>: Login/logout timestamps, user ID, device ID hash (SHA-256). We do <strong>not</strong> store raw device identifiers, IP addresses (beyond session), or full phone numbers.</li>
              <li><strong>Action Logs</strong>: Key actions such as file uploads, AI feature usage counts. No file content is stored on our servers.</li>
              <li><strong>AI Configuration</strong>: Model settings (API key, base URL, model name) stored encrypted in the database. API keys are never exposed to other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Data We Do NOT Collect</h2>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li><strong>Your uploaded data files</strong> — All spreadsheet data is processed in your browser and never sent to our servers unless you explicitly use AI features.</li>
              <li><strong>Dashboard configurations</strong> — Stored locally in your browser only.</li>
              <li><strong>Custom metrics, alerts, or templates</strong> — Stored locally in your browser only.</li>
              <li><strong>Browsing history or tracking pixels</strong> — We do not use analytics trackers from third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. AI Feature Data Handling</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you use AI-powered features (Smart Insights, AI Q&A, NL2Dashboard, etc.), your data is temporarily sent to the AI model provider you configured. This data:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
              <li>Is transmitted over encrypted connections (TLS 1.3)</li>
              <li>Is not stored by DataInsight after the AI response is returned</li>
              <li>Is subject to the AI provider&apos;s own privacy policy</li>
              <li>We track only metadata: function type, model name, token counts, and latency for cost management</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Your Rights (GDPR / CCPA)</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">Under applicable data protection regulations, you have the right to:</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access</strong> — Request a copy of all data we hold about you (available in Settings → Data Compliance)</li>
              <li><strong>Deletion</strong> — Request complete erasure of your account and all associated data</li>
              <li><strong>Portability</strong> — Export your data in machine-readable format (JSON)</li>
              <li><strong>Objection</strong> — Opt out of usage tracking at any time (Settings → Data Compliance)</li>
              <li><strong>Rectification</strong> — Update your account information at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Retention</h2>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li><strong>Activity logs</strong>: Automatically deleted after 90 days</li>
              <li><strong>Form collection data</strong>: 72-hour TTL with 24-hour advance warning</li>
              <li><strong>Account data</strong>: Retained until account deletion is requested</li>
              <li><strong>AI usage metadata</strong>: Retained for 12 months for cost analysis, then auto-deleted</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Security</h2>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>All data in transit is encrypted via TLS 1.3</li>
              <li>Passwords are hashed using bcrypt (cost factor 12)</li>
              <li>Device IDs are stored as SHA-256 hashes only</li>
              <li>API keys are stored encrypted in the database</li>
              <li>Row-level security policies prevent cross-user data access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
            <p className="text-sm text-muted-foreground">
              For privacy-related inquiries, contact us through the in-app support or email privacy@datainsight.app
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
