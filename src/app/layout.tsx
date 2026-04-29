import type { Metadata } from 'next';
import { Inspector } from 'react-dev-inspector';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'DataInsight Pro | 智能数据分析平台',
    template: '%s | DataInsight Pro',
  },
  description:
    'DataInsight Pro - 企业级智能数据分析平台，支持AI驱动分析、NL2Dashboard、多数据源集成，一键生成仪表盘和报表。',
  keywords: [
    '数据分析',
    '智能分析',
    'AI分析',
    '数据可视化',
    '仪表盘',
    '报表生成',
    'Excel',
    'CSV',
    '数据清洗',
    '指标体系',
  ],
  authors: [{ name: 'DataInsight Team' }],
  generator: 'DataInsight Pro',
  // icons: {
  //   icon: '',
  // },
  openGraph: {
    title: 'DataInsight Pro | 智能数据分析平台',
    description:
      '企业级智能数据分析平台，支持AI驱动分析、NL2Dashboard、多数据源集成，一键生成仪表盘和报表。',
    siteName: 'DataInsight Pro',
    locale: 'zh_CN',
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
  const isDev = process.env.COZE_PROJECT_ENV === 'DEV';

  return (
    <html lang="en">
      <body className={`antialiased`}>
        {isDev && <Inspector />}
        {children}
      </body>
    </html>
  );
}
