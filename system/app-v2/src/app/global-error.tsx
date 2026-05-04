'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="font-semibold text-5xl text-gray-900 mb-4">重大なエラーが発生しました</h1>
            <p className="text-sm text-gray-700">
              アプリケーションの読み込みに失敗しました。ページを再読み込みしてください。
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-gray-500 mt-4">エラーID: {error.digest}</p>
            )}
            <button
              type="button"
              onClick={reset}
              className="mt-8 px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              再読み込み
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
