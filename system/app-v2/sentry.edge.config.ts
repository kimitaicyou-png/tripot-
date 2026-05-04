import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Edge Runtime（middleware）はサンプリング低め
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NODE_ENV,
});
