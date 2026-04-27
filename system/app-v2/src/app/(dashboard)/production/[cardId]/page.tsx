import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { production_cards, deals } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { listBugsForCard } from '@/lib/actions/bugs';
import { listTestCasesForCard, listChangeLogsForCard } from '@/lib/actions/test-cases';
import { setTenantContext } from '@/lib/db';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { ProductionStatusButton } from '../_components/production-status-button';
import { BugForm } from './_components/bug-form';
import { BugRow } from './_components/bug-row';
import { TestCaseForm } from './_components/test-case-form';
import { TestCaseRow } from './_components/test-case-row';

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

  const [card, bugList, testCases, changeLogs] = await Promise.all([
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
        back={{ href: '/production', label: '製造管理' }}
        actions={<ProductionStatusButton cardId={cardId} currentStatus={card.status} />}
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
              description="製造中の不具合は ここで追跡してクローズまで管理"
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
