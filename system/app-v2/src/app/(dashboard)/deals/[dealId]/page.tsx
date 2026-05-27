import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers, meetings, proposals, estimates, invoices, deal_contracts, deal_artifacts, deal_comments } from '@/db/schema';
import { DealTabs } from './_components/deal-tabs';
import { OverviewTab } from './_components/overview-tab';
import { MeetingsTab } from './_components/meetings-tab';
import { ProposalsTab } from './_components/proposals-tab';
import { EstimatesTab } from './_components/estimates-tab';
import { InvoicesTab } from './_components/invoices-tab';
import { ResourcesTab } from './_components/resources-tab';
import { StageStepper } from './_components/stage-stepper';
import { NextStageChecklist } from './_components/next-stage-checklist';
import { InlineStageChanger } from './_components/inline-stage-changer';
import { StageBar } from './_components/stage-bar';
import { ShareDealButton } from './_components/share-deal-button';
import { getStageRequirements } from '@/lib/deals/stage-requirements';

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
        external_cost: deals.external_cost,
        gross_profit: deals.gross_profit,
        gross_profit_rate: deals.gross_profit_rate,
        subjective_confidence: deals.subjective_confidence,
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

  const stageRequirements = await getStageRequirements(
    dealId,
    session.user.company_id,
    deal.stage
  );

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
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/deals" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          案件一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 truncate flex-1">{deal.title}</h1>
        <ShareDealButton
          dealTitle={deal.title}
          customerName={deal.customer_name}
          stage={deal.stage}
        />
        <InlineStageChanger dealId={dealId} currentStage={deal.stage} />
      </header>

      <div className="px-6 py-4 max-w-5xl mx-auto">
        <details className="group bg-white border border-gray-200 rounded-xl">
          <summary className="cursor-pointer list-none px-5 py-3 hover:bg-gray-50 active:scale-[0.998] transition-all duration-150 rounded-xl">
            <StageBar currentStage={deal.stage} requirements={stageRequirements} />
          </summary>
          <div className="px-5 pb-5 pt-2 space-y-4 border-t border-gray-100">
            <StageStepper currentStage={deal.stage} />
            <NextStageChecklist dealId={dealId} data={stageRequirements} />
          </div>
        </details>
      </div>

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
