import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers, deals, members } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { deleteCustomer } from '@/lib/actions/customers';

const STAGE_LABEL: Record<string, string> = {
  prospect: '見込み',
  proposing: '提案中',
  ordered: '受注',
  in_production: '制作中',
  delivered: '納品済',
  acceptance: '検収',
  invoiced: '請求済',
  paid: '入金済',
  lost: '失注',
};

const STAGE_COLOR: Record<string, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  proposing: 'bg-blue-50 text-blue-700',
  ordered: 'bg-amber-50 text-amber-700',
  in_production: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-purple-50 text-purple-700',
  acceptance: 'bg-pink-50 text-pink-700',
  invoiced: 'bg-rose-50 text-rose-700',
  paid: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { customerId } = await params;

  const customer = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.company_id, session.user.company_id),
        isNull(customers.deleted_at),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!customer) notFound();

  const customerDeals = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      assignee_name: members.name,
      updated_at: deals.updated_at,
    })
    .from(deals)
    .leftJoin(members, eq(deals.assignee_id, members.id))
    .where(
      and(
        eq(deals.customer_id, customerId),
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
      ),
    )
    .orderBy(desc(deals.updated_at));

  const totalRevenue = customerDeals
    .filter((d) => d.stage === 'paid' || d.stage === 'invoiced')
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const handleDelete = deleteCustomer.bind(null, customerId);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/customers" className="text-gray-700 hover:text-gray-900 text-sm">
          ← 顧客一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{customer.name}</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-xs text-gray-500">入金累計</p>
          <p className="font-semibold text-5xl text-gray-900 tracking-tight tabular-nums mt-1">
            {formatYen(totalRevenue)}
          </p>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <p className="text-xs text-gray-500 mb-1">メール</p>
            <p className="text-gray-900 font-medium">{customer.contact_email ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">電話番号</p>
            <p className="text-gray-900 font-medium font-mono">{customer.contact_phone ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">登録日</p>
            <p className="text-gray-900 font-medium font-mono">
              {new Date(customer.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">案件数</p>
            <p className="text-gray-900 font-medium font-mono tabular-nums">{customerDeals.length} 件</p>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            案件 <span className="text-xs text-gray-500 font-normal">{customerDeals.length}件</span>
          </h3>
          {customerDeals.length === 0 ? (
            <p className="text-sm text-gray-700">この顧客の案件はまだありません</p>
          ) : (
            <ul className="divide-y divide-border">
              {customerDeals.map((d) => (
                <li key={d.id} className="py-3 flex items-center gap-3">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-lg text-xs font-medium ${STAGE_COLOR[d.stage] ?? ''}`}
                  >
                    {STAGE_LABEL[d.stage] ?? d.stage}
                  </span>
                  <Link href={`/deals/${d.id}`} className="flex-1 text-sm text-gray-900 hover:underline truncate">
                    {d.title}
                  </Link>
                  <span className="text-xs text-gray-700 shrink-0">{d.assignee_name ?? '—'}</span>
                  <span className="font-mono tabular-nums text-sm text-gray-900 shrink-0">
                    {formatYen(d.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex items-center justify-end gap-3">
          <Link
            href={`/customers/${customerId}/edit`}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-900 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            編集
          </Link>
          <form action={handleDelete}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100"
            >
              削除
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
