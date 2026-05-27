'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

/**
 * Root-level error boundary（layout.tsx より上、SSR が完全に死んだ時）
 *
 * 隊長明示 2026-05-28 02:19「けっこうエラー起きるから対応してー」改善：
 * - error.tsx と同等の情報量を表示（メッセージ / digest / URL / 時刻 / UA）
 * - 「詳細をコピー」で 1 タップ報告
 * - html / body タグ含む（root error なので layout も死んでる前提）
 *
 * Tailwind が読まれない可能性に備え、inline style も併用。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<string>('');

  useEffect(() => {
    Sentry.captureException(error);
    console.error(error);

    const url = typeof window !== 'undefined' ? window.location.href : '(unknown)';
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '(unknown)';
    const text = [
      `[tripot 重大エラー報告]`,
      `発生時刻: ${new Date().toLocaleString('ja-JP')}`,
      `画面 URL: ${url}`,
      `エラー: ${error.message || '(メッセージなし)'}`,
      `エラー ID: ${error.digest ?? '(なし)'}`,
      `ブラウザ: ${ua}`,
    ].join('\n');
    setDetails(text);
  }, [error]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(details);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = details;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <main
          style={{
            minHeight: '100vh',
            background: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{ width: '100%', maxWidth: '512px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                重大なエラーが発生しました
              </h1>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
                アプリの読み込みに失敗しました。<br />
                「詳細をコピー」して隊長 / 開発に送ってください。
              </p>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#6b7280',
                  margin: '0 0 4px',
                }}
              >
                エラー内容
              </p>
              <p
                style={{
                  fontSize: '14px',
                  color: '#111827',
                  margin: 0,
                  wordBreak: 'break-word',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {error.message || '(メッセージなし)'}
              </p>
              {error.digest && (
                <>
                  <p
                    style={{
                      fontSize: '11px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#6b7280',
                      margin: '12px 0 4px',
                    }}
                  >
                    エラー ID
                  </p>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#374151',
                      margin: 0,
                      wordBreak: 'break-all',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {error.digest}
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={reset}
              style={{
                width: '100%',
                padding: '12px 24px',
                background: '#111827',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              再読み込み
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  padding: '10px 16px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  color: '#111827',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                {copied ? '✓ コピー済み' : '詳細をコピー'}
              </button>
              <a
                href="/"
                style={{
                  padding: '10px 16px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  color: '#111827',
                  fontSize: '14px',
                  fontWeight: 500,
                  borderRadius: '8px',
                  textDecoration: 'none',
                  textAlign: 'center',
                  display: 'inline-block',
                }}
              >
                ホームへ
              </a>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
