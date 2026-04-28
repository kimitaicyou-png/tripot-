import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <p className="font-semibold text-8xl text-gray-900/30 tabular-nums">404</p>
        <h1 className="font-semibold text-3xl text-gray-900 mt-4">ページが見つかりません</h1>
        <p className="text-sm text-gray-700 mt-3">
          お探しのページは削除されたか、URL が変更された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block mt-8 px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
        >
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
