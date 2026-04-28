'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="font-semibold text-5xl text-ink mb-4">エラーが発生しました</h1>
        <p className="text-sm text-muted">
          ページの読み込みに失敗しました。もう一度お試しください。
        </p>
        {error.digest && (
          <p className="text-xs font-mono text-subtle mt-4">エラーID: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="mt-8 px-6 py-3 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98]"
        >
          再試行
        </button>
      </div>
    </main>
  );
}
