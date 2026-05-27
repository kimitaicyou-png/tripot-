'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect, useState } from 'react';

/**
 * Route-level error boundary（Next.js App Router）
 *
 * 隊長明示 2026-05-28 02:19「けっこうエラー起きるから対応してー」改善：
 * - エラーメッセージを画面に出す（QA / 営業がスクショ送るだけで原因特定可能）
 * - 「詳細をコピー」ボタン（1 タップで隊長 / 私に貼り付け報告できる）
 * - エラー digest = Sentry の event_id 相当、原因追跡 key
 * - 発生時刻 + URL も含める（再現条件の絞り込み材料）
 *
 * Sentry 送信は維持。dashboard 見ない隊長でも、画面上の情報だけで切り分け可。
 */
export default function Error({
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
      `[tripot エラー報告]`,
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
      // fallback: textarea を選択
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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">
        <div className="text-center space-y-2">
          <h1 className="font-semibold text-3xl text-gray-900">エラーが発生しました</h1>
          <p className="text-sm text-gray-700">
            画面の読み込みに失敗しました。<br />
            「詳細をコピー」して隊長 / 開発に送ってください。
          </p>
        </div>

        {/* エラー詳細（折りたたみせず常時表示、QA に必要） */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
              エラー内容
            </p>
            <p className="text-sm text-gray-900 break-words font-mono">
              {error.message || '(メッセージなし)'}
            </p>
          </div>
          {error.digest && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                エラー ID
              </p>
              <p className="text-xs font-mono text-gray-700 break-all">{error.digest}</p>
            </div>
          )}
        </div>

        {/* 操作ボタン群 */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
          >
            再試行
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              {copied ? '✓ コピー済み' : '詳細をコピー'}
            </button>
            <a
              href="/"
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors active:scale-[0.98] text-center"
            >
              ホームへ
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
