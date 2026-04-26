import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // coaris.ai/tripot で配信される構成
  // Vercel Microfrontends ホスト側で /tripot/* がこのアプリに rewrite される
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '/tripot',
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '/tripot',

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

  // 13社展開時のテンプレ流用前提
  // 各社の coaris.config.ts を読み込んでビルド時に環境別設定を注入
  // experimental.typedRoutes は Next.js 16 で安定化、ただし動的path（/home/[memberId]）と相性悪く一旦オフ
  // 必要に応じて useRouter 経由に切り替え可能

  // 旧 v1 で発生した「巨大ファイル肥大化」を防ぐ
  // 1ファイル 800行 max は ESLint で別途制御
};

export default nextConfig;
