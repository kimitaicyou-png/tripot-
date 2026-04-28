import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listActiveQuotes } from '@/lib/actions/quotes';
import { EmptyState } from '@/components/ui/empty-state';
import { QuotesAdmin } from './_components/quotes-admin';

export default async function SettingsQuotesPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await listActiveQuotes();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-gray-900">名言管理</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          ホーム画面で表示される名言の管理。
          初回は「初期データ投入」で coaris.config の seed を読み込めます。
        </p>

        <QuotesAdmin existingCount={items.length} />

        {items.length === 0 ? (
          <EmptyState
            icon="🎴"
            title="名言が未登録です"
            description="上の「初期データ投入」で 6 個の seed が一括登録されます"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((q) => (
              <li
                key={q.id}
                className="bg-white border border-gray-200 rounded-xl p-5 border-l-2 border-l-amber-300"
              >
                <p className="font-semibold text-lg text-gray-900 leading-snug">{q.body}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{q.author ? `— ${q.author}` : '（無記名）'}</span>
                  <span className="font-mono">weight {q.weight}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
