import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Sans_JP, IBM_Plex_Mono, Instrument_Serif, Noto_Serif_JP } from 'next/font/google';
import './globals.css';

// §7.1 フォント（最重要・統一）IBM Plex Sans JP 一本化
// 欧文 IBM Plex Sans と日本語 IBM Plex Sans JP は同じ IBM 設計、ウェイト感が完全揃う
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexSansJp = IBM_Plex_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans-jp',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif-jp',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'tripot — Coaris AI',
  description: 'コアリスホールディングス基準値プロジェクト：個人の行動の結晶を月次・週次・事業計画に積み上げる経営管理システム',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ja"
      className={`${ibmPlexSans.variable} ${ibmPlexSansJp.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} ${notoSerifJp.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-ink font-sans">{children}</body>
    </html>
  );
}
