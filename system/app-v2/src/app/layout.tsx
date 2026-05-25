import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';

// 正典：秋美+隊長「Tripot Design System v1.0」§2 タイポグラフィ
// フォント: Geist Sans (font-sans)
// 数値には tabular-nums を付ける

export const metadata: Metadata = {
  title: 'tripot — Coaris AI',
  description: 'コアリスホールディングス基準値プロジェクト：個人の行動の結晶を月次・週次・事業計画に積み上げる経営管理システム',
};

// モバイル対応：Next.js 16 推奨形式の viewport export
// initialScale=1 で意図しないズーム回避、maximumScale=5 で拡大は許可（A11y）
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#f9fafb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900 font-sans">{children}</body>
    </html>
  );
}
