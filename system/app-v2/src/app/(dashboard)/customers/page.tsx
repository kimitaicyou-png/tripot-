import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers, deals } from '@/db/schema';
import { eq, and, isNull, sql, desc } from 'drizzle-orm';

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      contact_email: customers.contact_email,
      contact_phone: customers.contact_phone,
      deal_count: sql<number>`COUNT(${deals.id})::int`,
      total_amount: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
    })
    .from(customers)
    .leftJoin(deals, and(eq(deals.customer_id, customers.id), isNull(deals.deleted_at)))
    .where(and(eq(customers.company_id, session.user.company_id), isNull(customers.deleted_at)))
    .groupBy(customers.id, customers.name, customers.contact_email, customers.contact_phone)
    .orderBy(desc(sql`COUNT(${deals.id})`))
    .limit(200);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">顧客</h1>
        <Link
          href="/customers/new"
          className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98]"
        >
          新規登録
        </Link>
      </header>

      <div className="px-6 py-6 max-w-5xl mx-auto">
        {rows.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted">顧客がまだ登録されていません</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">顧客名</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted">連絡先</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">案件数</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted">入金累計</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-ink font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {c.contact_email && <p>{c.contact_email}</p>}
                      {c.contact_phone && <p className="font-mono mt-0.5">{c.contact_phone}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-ink">{c.deal_count}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-sm text-ink font-semibold">{formatYen(c.total_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
