import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // DSN 未設定時は no-op（ローカル開発・env 未投入環境で安全に動作）
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // パフォーマンス計測：全トランザクションの 10%（本番では調整）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // セッションリプレイ：本番のみ、エラー発生時は 100% キャプチャ
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],

  // ソースマップとリリース追跡
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NODE_ENV,

  // PII をログに含めない
  sendDefaultPii: false,

  // PII / シークレット漏洩防止（docs/error-alert-policy.md §3-3 準拠）
  beforeSend(event) {
    const SENSITIVE_KEYS = ['email', 'phone', 'auth_token', 'api_key', 'password', 'secret', 'token'];
    const redact = (obj: Record<string, unknown> | undefined) => {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          redact(obj[key] as Record<string, unknown>);
        }
      }
    };
    redact(event.request?.data as Record<string, unknown> | undefined);
    redact(event.extra);
    return event;
  },
});
