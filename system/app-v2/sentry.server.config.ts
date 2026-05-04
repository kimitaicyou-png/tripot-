import * as Sentry from '@sentry/nextjs';

const SENSITIVE_KEYS = [
  'email',
  'phone',
  'auth_token',
  'authorization',
  'api_key',
  'password',
  'secret',
  'token',
  'cookie',
  'session',
  'database_url',
];

function redactSensitive(obj: Record<string, unknown> | undefined): void {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      obj[key] = '[REDACTED]';
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      redactSensitive(obj[key] as Record<string, unknown>);
    }
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // サーバー側はすべてのトランザクションをサンプリング（低頻度想定）
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NODE_ENV,

  sendDefaultPii: false,

  // PII / シークレット漏洩防止（docs/error-alert-policy.md §3-3 準拠）
  beforeSend(event) {
    redactSensitive(event.request?.data as Record<string, unknown> | undefined);
    redactSensitive(event.extra);
    redactSensitive(event.contexts as Record<string, unknown> | undefined);
    return event;
  },
});
