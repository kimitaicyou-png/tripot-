import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers, meetings, proposals, estimates, invoices, deal_contracts, deal_artifacts, deal_comments } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';
import { DealTabs } from './_components/deal-tabs';
import { OverviewTab } from './_components/overview-tab';
import { MeetingsTab } from './_components/meetings-tab';
import { ProposalsTab } from './_components/proposals-tab';
import { EstimatesTab } from './_components/estimates-tab';
import { InvoicesTab } from './_components/invoices-tab';
import { ResourcesTab } from './_components/resources-tab';

export default async function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { dealId } = await params;

  const [deal, mCountRow, pCountRow, eCountRow, iCountRow, contractsRow, artifactsRow, commentsRow] = await Promise.all([
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        amount: deals.amount,
        monthly_amount: deals.monthly_amount,
        revenue_type: deals.revenue_type,
        expected_close_date: deals.expected_close_date,
        ordered_at: deals.ordered_at,
        paid_at: deals.paid_at,
        metadata: deals.metadata,
        assignee_name: members.name,
        customer_name: customers.name,
      })
      .from(deals)
      .leftJoin(members, eq(deals.assignee_id, members.id))
      .leftJoin(customers, eq(deals.customer_id, customers.id))
      .where(
        and(
          eq(deals.id, dealId),
          eq(deals.company_id, session.user.company_id),
          isNull(deals.deleted_at)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(meetings)
      .where(
        and(
          eq(meetings.deal_id, dealId),
          eq(meetings.company_id, session.user.company_id),
          isNull(meetings.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(proposals)
      .where(
        and(
          eq(proposals.deal_id, dealId),
          eq(proposals.company_id, session.user.company_id),
          isNull(proposals.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(estimates)
      .where(
        and(
          eq(estimates.deal_id, dealId),
          eq(estimates.company_id, session.user.company_id),
          isNull(estimates.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(invoices)
      .where(
        and(
          eq(invoices.deal_id, dealId),
          eq(invoices.company_id, session.user.company_id),
          isNull(invoices.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(deal_contracts)
      .where(
        and(
          eq(deal_contracts.deal_id, dealId),
          eq(deal_contracts.company_id, session.user.company_id),
          isNull(deal_contracts.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(deal_artifacts)
      .where(
        and(
          eq(deal_artifacts.deal_id, dealId),
          eq(deal_artifacts.company_id, session.user.company_id),
          isNull(deal_artifacts.deleted_at)
        )
      ),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(deal_comments)
      .where(
        and(
          eq(deal_comments.deal_id, dealId),
          eq(deal_comments.company_id, session.user.company_id),
          isNull(deal_comments.deleted_at)
        )
      ),
  ]);

  if (!deal) notFound();

  const stageDef = TRIPOT_CONFIG.stages.find((s) => s.key === deal.stage);
  const stageLabel = stageDef?.label ?? deal.stage;
  const stageBadge = stageDef?.badgeClass ?? 'bg-slate-100 text-slate-700';

  const resourceCount =
    (contractsRow[0]?.n ?? 0) +
    (artifactsRow[0]?.n ?? 0) +
    (commentsRow[0]?.n ?? 0);

  const counts = {
    meetings: mCountRow[0]?.n ?? 0,
    proposals: pCountRow[0]?.n ?? 0,
    estimates: eCountRow[0]?.n ?? 0,
    invoices: iCountRow[0]?.n ?? 0,
    resources: resourceCount,
  };

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/deals" className="text-muted hover:text-ink text-sm">
          ← 案件一覧
        </Link>
        <h1 className="text-lg font-semibold text-ink truncate flex-1">{deal.title}</h1>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${stageBadge}`}
        >
          {stageLabel}
        </span>
      </header>

      <DealTabs
        counts={counts}
        overview={<OverviewTab deal={{ ...deal, metadata: (deal.metadata as Record<string, unknown> | null) ?? null }} />}
        meetings={<MeetingsTab dealId={dealId} />}
        proposals={<ProposalsTab dealId={dealId} />}
        estimates={<EstimatesTab dealId={dealId} />}
        invoices={<InvoicesTab dealId={dealId} />}
        resources={<ResourcesTab dealId={dealId} />}
      />
    </main>
  );
}
