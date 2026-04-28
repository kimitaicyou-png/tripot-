import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { mf_journals, mf_invoices } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export default async function MfSettingsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const journalStats = await db
    .select({
      imported: sql<number>`COUNT(*) FILTER (WHERE ${mf_journals.status} = 'imported')::int`,
      matched: sql<number>`COUNT(*) FILTER (WHERE ${mf_journals.status} = 'matched')::int`,
      reflected: sql<number>`COUNT(*) FILTER (WHERE ${mf_journals.status} = 'reflected')::int`,
    })
    .from(mf_journals)
    .where(eq(mf_journals.company_id, session.user.company_id))
    .then((rows) => rows[0]);

  const invoiceCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(mf_invoices)
    .where(eq(mf_invoices.company_id, session.user.company_id))
    .then((rows) => rows[0]?.count ?? 0);

  const isConnected = !!process.env.MF_CLIENT_ID && !!process.env.MF_API_KEY;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">MoneyForward クラウド連携</h1>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <section className={`border rounded-xl p-5 shadow-sm ${isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <p className="text-sm font-medium text-gray-900">
              {isConnected ? 'MF クラウドと接続済み' : 'MF クラウドと未接続（環境変数を設定してください）'}
            </p>
          </div>
          {!isConnected && (
            <p className="text-xs text-gray-700 mt-2 ml-6">
              .env に <code className="font-mono">MF_CLIENT_ID</code> / <code className="font-mono">MF_API_KEY</code> を設定
            </p>
          )}
        </section>

        <section>
          <h3 className="text-sm font-medium text-gray-900 mb-4">仕訳取込 3工程</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500">① 取り込み済</p>
              <p className="font-semibold text-4xl text-gray-900 mt-1 tabular-nums">{journalStats?.imported ?? 0}</p>
              <p className="text-xs text-gray-700 mt-2">MF から取り込まれた仕訳</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500">② 照合済</p>
              <p className="font-semibold text-4xl text-gray-900 mt-1 tabular-nums">{journalStats?.matched ?? 0}</p>
              <p className="text-xs text-gray-700 mt-2">案件と紐付けされた仕訳</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <p className="text-xs text-gray-500">③ KPI反映済</p>
              <p className="font-semibold text-4xl text-gray-900 mt-1 tabular-nums">{journalStats?.reflected ?? 0}</p>
              <p className="text-xs text-gray-700 mt-2">月次KPIに反映された仕訳</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900">請求書</p>
          <p className="font-semibold text-4xl text-gray-900 mt-2 tabular-nums">{invoiceCount}</p>
          <p className="text-xs text-gray-700 mt-1">MF から取得済み</p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">操作</p>
          <div className="space-y-2">
            <button
              type="button"
              disabled
              className="w-full px-4 py-2 bg-slate-100 text-gray-700 text-sm rounded-lg cursor-not-allowed"
            >
              MF と認証する（OAuth、明日朝実装）
            </button>
            <button
              type="button"
              disabled
              className="w-full px-4 py-2 bg-slate-100 text-gray-700 text-sm rounded-lg cursor-not-allowed"
            >
              仕訳を取り込む（明日朝実装）
            </button>
          </div>
        </section>

        <p className="text-xs text-gray-500 text-center">
          ※ OAuth/取込/照合 の実装は秋美担当（4/30 完成目標、tripot-v2-schedule.md B9）
        </p>
      </div>
    </main>
  );
}
