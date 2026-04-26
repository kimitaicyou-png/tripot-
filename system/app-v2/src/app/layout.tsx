import type { Metadata } from 'next';
import { Manrope, Noto_Sans_JP, Instrument_Serif, Noto_Serif_JP, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-sans-jp',
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
  variable: '--font-serif-jp',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
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
      className={`${manrope.variable} ${notoSansJp.variable} ${instrumentSerif.variable} ${notoSerifJp.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-surface text-ink font-sans">{children}</body>
    </html>
  );
}
