import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  // ADR-0003 Vercel Multi-Zones 真意：各 zone は root 動作、外側で /tripot/* rewrite
  // basePath を内側で持つと NextAuth callback URL と不整合（Next.js が strip / NextAuth が basePath 知らない）
  // 本番では coaris.ai が `/tripot/*` を tripot-v2-coaris.vercel.app/* に rewrite

  // 本部・他事業会社への遷移を許可
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },

  // PostHog: ad-blocker 回避のためにリバースプロキシ経由で送信
  async rewrites() {
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
    return [
      {
        source: '/ingest/static/:path*',
        destination: `${posthogHost}/static/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${posthogHost}/:path*`,
      },
      {
        source: '/ingest/decide',
        destination: `${posthogHost}/decide`,
      },
    ];
  },

  // 13社展開時のテンプレ流用前提
  // 各社の coaris.config.ts を読み込んでビルド時に環境別設定を注入
  // experimental.typedRoutes は Next.js 16 で安定化、ただし動的path（/home/[memberId]）と相性悪く一旦オフ
  // 必要に応じて useRouter 経由に切り替え可能

  // 旧 v1 で発生した「巨大ファイル肥大化」を防ぐ
  // 1ファイル 800行 max は ESLint で別途制御
};

export default withSentryConfig(nextConfig, {
  // Sentry webpack plugin 設定
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // ソースマップをビルド時にアップロード（SENTRY_AUTH_TOKEN が必要）
  silent: true,

  // Vercel デプロイ時のソースマップ自動アップロード
  widenClientFileUpload: true,

  // ソースマップ設定（クライアントに公開しない）
  sourcemaps: { disable: false, deleteSourcemapsAfterUpload: true },
  disableLogger: true,

  // auth token 未設定でもビルドを止めない
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
