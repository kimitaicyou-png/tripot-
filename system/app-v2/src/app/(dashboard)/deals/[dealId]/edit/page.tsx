import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { DealEditForm } from './edit-form';

export default async function DealEditPage({ params }: { params: Promise<{ dealId: string }> }) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { dealId } = await params;

  const deal = await db
    .select()
    .from(deals)
    .where(and(eq(deals.id, dealId), eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!deal) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href={`/deals/${dealId}`} className="text-muted hover:text-ink text-sm">
          ← 案件詳細
        </Link>
        <h1 className="text-lg font-semibold text-ink">案件を編集</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <DealEditForm
          dealId={dealId}
          initial={{
            title: deal.title,
            stage: deal.stage,
            amount: deal.amount ?? 0,
            monthly_amount: deal.monthly_amount ?? 0,
            revenue_type: deal.revenue_type,
            expected_close_date: deal.expected_close_date,
          }}
        />
      </div>
    </main>
  );
}
