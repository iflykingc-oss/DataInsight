import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';
import { GlobalErrorBoundary } from '@/components/error-boundary';
import { AuthProvider } from '@/lib/use-auth';
import { DataLifecycleProvider } from '@/components/data-lifecycle-provider';
import { I18nProvider } from '@/lib/i18n';

export const metadata: Metadata = {
  title: {
    default: 'DataInsight Pro | AI-Powered Data Analysis Platform',
    template: '%s | DataInsight Pro',
  },
  description:
    'DataInsight Pro - Enterprise-grade AI data analysis platform. AI-driven analytics, NL2Dashboard, multi-source data integration, one-click dashboards and reports.',
  keywords: [
    'data analysis',
    'AI analytics',
    'business intelligence',
    'data visualization',
    'dashboard',
    'report generation',
    'Excel',
    'CSV',
    'data cleaning',
    'metrics',
    'NL2SQL',
    'NL2Dashboard',
  ],
  authors: [{ name: 'DataInsight Team' }],
  generator: 'DataInsight Pro',
  openGraph: {
    title: 'DataInsight Pro | AI-Powered Data Analysis Platform',
    description:
      'Enterprise-grade AI data analysis platform with AI-driven analytics, NL2Dashboard, multi-source data integration, and one-click dashboards.',
    siteName: 'DataInsight Pro',
    locale: 'en_US',
    type: 'website',
  },
  // twitter: {
  //   card: 'summary_large_image',
  //   title: 'Coze Code | Your AI Engineer is Here',
  //   description:
  //     'Build and deploy full-stack applications through AI conversation. No env setup, just flow.',
  //   // images: [''],
  // },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        <GlobalErrorBoundary>
          <I18nProvider>
            <AuthProvider>
              <DataLifecycleProvider>
                {children}
              </DataLifecycleProvider>
            </AuthProvider>
          </I18nProvider>
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
