import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { production_cards, deals } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { listBugsForCard } from '@/lib/actions/bugs';
import { listTestCasesForCard, listChangeLogsForCard } from '@/lib/actions/test-cases';
import { listPurchaseOrdersForCard, listVendorsForSelect } from '@/lib/actions/purchase-orders';
import { listDeliverablesForCard } from '@/lib/actions/deliverables';
import { listReviewsForCard } from '@/lib/actions/reviews';
import { setTenantContext } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductionStatusButton } from '../_components/production-status-button';
import { ProductionEditForm } from './_components/production-edit-form';
import { BugForm } from './_components/bug-form';
import { BugRow } from './_components/bug-row';
import { TestCaseForm } from './_components/test-case-form';
import { TestCaseRow } from './_components/test-case-row';
import { PurchaseOrderForm } from './_components/purchase-order-form';
import { PurchaseOrderRow } from './_components/purchase-order-row';
import { DeliverableForm } from './_components/deliverable-form';
import { ReviewForm } from './_components/review-form';
import { ReviewRow } from './_components/review-row';

const STATUS_LABEL: Record<string, string> = {
  requirements: '要件定義',
  designing: '設計',
  building: '実装',
  reviewing: 'レビュー',
  delivered: '納品済',
  cancelled: 'キャンセル',
};

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

export default async function ProductionCardDetailPage({
  params,
}: {
  params: Promise<{ cardId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');
  await setTenantContext(session.user.company_id);

  const { cardId } = await params;

  const [card, bugList, testCases, changeLogs, poList, vendorList, deliverableList, reviewList] = await Promise.all([
    db
      .select({
        id: production_cards.id,
        title: production_cards.title,
        status: production_cards.status,
        deal_id: production_cards.deal_id,
        deal_title: deals.title,
        estimated_cost: production_cards.estimated_cost,
        actual_cost: production_cards.actual_cost,
        started_at: production_cards.started_at,
        delivered_at: production_cards.delivered_at,
        requirements: production_cards.requirements,
      })
      .from(production_cards)
      .leftJoin(deals, eq(production_cards.deal_id, deals.id))
      .where(
        and(
          eq(production_cards.id, cardId),
          eq(production_cards.company_id, session.user.company_id),
          isNull(production_cards.deleted_at)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    listBugsForCard(cardId),
    listTestCasesForCard(cardId),
    listChangeLogsForCard(cardId),
    listPurchaseOrdersForCard(cardId),
    listVendorsForSelect(),
    listDeliverablesForCard(cardId),
    listReviewsForCard(cardId),
  ]);

  if (!card) notFound();

  const openBugs = bugList.filter((b) => b.status === 'open' || b.status === 'in_progress').length;
  const passedTests = testCases.filter((t) => t.passed === 1).length;
  const totalTests = testCases.length;
  const testRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  const costDiff = (card.actual_cost ?? 0) - (card.estimated_cost ?? 0);
  const costRatio =
    (card.estimated_cost ?? 0) > 0
      ? Math.round((costDiff / (card.estimated_cost ?? 1)) * 100)
      : 0;

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="PRODUCTION CARD"
        title={card.title}
        subtitle={
          <span className="flex items-center gap-3 flex-wrap">
            <span className="text-xs uppercase tracking-widest text-subtle">{STATUS_LABEL[card.status] ?? card.status}</span>
            {card.deal_id && card.deal_title && (
              <Link href={`/deals/${card.deal_id}`} className="text-xs text-muted hover:text-ink">
                ↗ {card.deal_title}
              </Link>
            )}
          </span>
        }
        back={{ href: '/production', label: '制作管理' }}
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <ProductionStatusButton cardId={cardId} currentStatus={card.status} />
            <ProductionEditForm
              cardId={cardId}
              title={card.title}
              estimatedCost={card.estimated_cost ?? 0}
              actualCost={card.actual_cost ?? 0}
            />
          </div>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="見積コスト" value={formatYen(card.estimated_cost)} />
          <StatCard
            label="実績コスト"
            value={formatYen(card.actual_cost)}
            sub={costDiff !== 0 ? `${costDiff > 0 ? '+' : ''}${costRatio}%` : '—'}
            tone={costDiff > 0 ? 'down' : costDiff < 0 ? 'up' : 'default'}
          />
          <StatCard
            label="未対応バグ"
            value={openBugs}
            tone={openBugs > 0 ? 'down' : 'default'}
            sub={`合計 ${bugList.length}件`}
          />
          <StatCard
            label="QA Pass率"
            value={totalTests > 0 ? `${testRate}%` : '—'}
            tone={testRate >= 90 ? 'up' : testRate < 50 ? 'down' : 'default'}
            sub={`${passedTests} / ${totalTests}件 PASS`}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading
              eyebrow="BUGS"
              title="バグ追跡"
              count={bugList.length}
            />
            <BugForm cardId={cardId} />
          </div>
          {bugList.length === 0 ? (
            <EmptyState
              icon="◌"
              title="バグ報告なし"
              description="制作中の不具合は ここで追跡してクローズまで管理"
            />
          ) : (
            <ul className="space-y-2">
              {bugList.map((b) => (
                <BugRow
                  key={b.id}
                  id={b.id}
                  cardId={cardId}
                  title={b.title}
                  description={b.description}
                  severity={b.severity}
                  status={b.status}
                  reporter_name={b.reporter_name}
                  created_at={b.created_at}
                  resolved_at={b.resolved_at}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading
              eyebrow="PURCHASE ORDERS"
              title="外注発注"
              count={poList.length}
            />
            <PurchaseOrderForm cardId={cardId} vendors={vendorList} />
          </div>
          {poList.length === 0 ? (
            <EmptyState
              icon="◌"
              title="発注なし"
              description="外注先への発注をここで管理（発注・納品・支払の3ステップ）"
            />
          ) : (
            <ul className="space-y-2">
              {poList.map((p) => (
                <PurchaseOrderRow
                  key={p.id}
                  id={p.id}
                  cardId={cardId}
                  title={p.title}
                  amount={p.amount}
                  vendor_name={p.vendor_name}
                  issued_on={p.issued_on}
                  delivered_on={p.delivered_on}
                  paid_on={p.paid_on}
                  created_at={p.created_at}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading
              eyebrow="DELIVERABLES"
              title="成果物"
              count={deliverableList.length}
            />
            <DeliverableForm cardId={cardId} />
          </div>
          {deliverableList.length === 0 ? (
            <EmptyState
              icon="◌"
              title="成果物なし"
              description="納品物・中間成果物のバージョン管理"
            />
          ) : (
            <ul className="space-y-2">
              {deliverableList.map((d) => (
                <li
                  key={d.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <p className="text-base font-medium text-ink">{d.name}</p>
                      <span className="text-xs uppercase tracking-widest text-subtle">v{d.version}</span>
                    </div>
                    {d.note && (
                      <p className="text-sm text-muted whitespace-pre-wrap mt-1">{d.note}</p>
                    )}
                    <p className="text-xs text-subtle font-mono tabular-nums mt-1">
                      {new Date(d.created_at).toLocaleString('ja-JP')}
                      {d.delivered_at && ` · 納品 ${new Date(d.delivered_at).toLocaleString('ja-JP')}`}
                    </p>
                  </div>
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors shrink-0"
                    >
                      ↗ ファイル
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <SectionHeading
              eyebrow="REVIEWS"
              title="レビュー"
              count={reviewList.length}
            />
            <ReviewForm
              cardId={cardId}
              deliverables={deliverableList.map((d) => ({ id: d.id, name: d.name, version: d.version }))}
            />
          </div>
          {reviewList.length === 0 ? (
            <EmptyState
              icon="◌"
              title="レビューなし"
              description="成果物の承認・差戻・修正依頼をここで管理"
            />
          ) : (
            <ul className="space-y-2">
              {reviewList.map((r) => (
                <ReviewRow
                  key={r.id}
                  id={r.id}
                  cardId={cardId}
                  deliverable_name={r.deliverable_name}
                  deliverable_version={r.deliverable_version}
                  reviewer_name={r.reviewer_name}
                  status={r.status}
                  feedback={r.feedback}
                  reviewed_at={r.reviewed_at}
                  created_at={r.created_at}
                />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeading
            eyebrow="TEST CASES"
            title="QA テストケース"
            count={testCases.length}
          />
          <TestCaseForm cardId={cardId} />
          {testCases.length === 0 ? (
            <EmptyState
              icon="◌"
              title="テストケースなし"
              description="納品前の品質チェック項目を登録"
            />
          ) : (
            <ul className="space-y-2 mt-3">
              {testCases.map((t) => (
                <TestCaseRow
                  key={t.id}
                  id={t.id}
                  cardId={cardId}
                  title={t.title}
                  expected={t.expected}
                  result={t.result}
                  passed={t.passed}
                  last_run_at={t.last_run_at}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeading
            eyebrow="CHANGE LOGS"
            title="変更履歴"
            count={changeLogs.length}
          />
          {changeLogs.length === 0 ? (
            <EmptyState
              icon="◌"
              title="変更履歴なし"
              description="ステータス変更などの業務ログがここに表示されます"
            />
          ) : (
            <ul className="space-y-1 mt-3">
              {changeLogs.map((l) => (
                <li
                  key={l.id}
                  className="px-4 py-2 bg-card border border-border rounded text-sm flex items-baseline justify-between gap-3"
                >
                  <span className="text-ink">{l.summary}</span>
                  <span className="font-mono tabular-nums text-xs text-subtle shrink-0">
                    {new Date(l.occurred_at).toLocaleString('ja-JP')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {(() => {
          const req = card.requirements as Record<string, unknown> | null;
          if (!req || Object.keys(req).length === 0) return null;
          return (
            <section>
              <SectionHeading eyebrow="REQUIREMENTS" title="要件メタ" />
              <pre className="bg-card border border-border rounded-lg p-4 text-xs font-mono text-ink overflow-x-auto">
                {JSON.stringify(req, null, 2)}
              </pre>
            </section>
          );
        })()}
      </div>
    </main>
  );
}
