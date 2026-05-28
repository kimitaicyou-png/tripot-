import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members, deals, tasks, actions, budgets } from '@/db/schema';
import { eq, and, sql, isNull, gte, desc } from 'drizzle-orm';
import { LogActionButton } from '@/components/log-action-button';
import { MorningBrief } from './_components/morning-brief';
import { CommitmentsSection } from './_components/commitments-section';
import { RevenueAchievementCard } from './_components/revenue-achievement-card';
import { RevenueTrendCard } from './_components/revenue-trend-card';
import { FunnelCard } from './_components/funnel-card';
import { SilentCustomersCard } from './_components/silent-customers-card';
import { WelcomeFirstSteps } from './_components/welcome-first-steps';
import type { Brief, FocusItem, AlertItem } from './_components/morning-brief';
import { getLatestAiJobForMember } from '@/lib/ai/jobs';

/**
 * morning-brief AI の output を Brief に正規化する。
 * 過去 ai_jobs.output には schema 変更前の形式（focus / alerts 欠け）が残っており、
 * 型 cast で渡すと client component で TypeError になっていた
 * （2026-05-28 隊長報告 "undefined is not an object (evaluating 'o.focus.length')"）。
 */
function normalizeBrief(raw: unknown): Brief | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  return {
    focus: Array.isArray(obj.focus) ? (obj.focus as FocusItem[]) : [],
    alerts: Array.isArray(obj.alerts) ? (obj.alerts as AlertItem[]) : [],
    message: typeof obj.message === 'string' ? obj.message : '',
  };
}
import { pickQuoteForMember } from '@/lib/actions/quotes';
import { formatYen } from '@/lib/format';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';

export default async function MemberHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const companyId = session.user.company_id;
  const { memberId } = await params;
  const { welcome: welcomeOverride } = await searchParams;
  const forceWelcome = welcomeOverride === '1';

  if (memberId !== session.user.member_id && session.user.role === 'member') {
    redirect(`/home/${session.user.member_id}`);
  }

  const member = await db
    .select()
    .from(members)
    .where(and(eq(members.id, memberId), eq(members.company_id, companyId), isNull(members.deleted_at)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!member) redirect('/login');

  const dealStats = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      activeCount: sql<number>`COUNT(*) FILTER (WHERE ${deals.stage} IN ('proposing', 'ordered', 'in_production'))::int`,
      grossProfit: sql<number>`COALESCE(SUM(${deals.gross_profit}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
    })
    .from(deals)
    .where(and(eq(deals.assignee_id, memberId), eq(deals.company_id, companyId), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  const taskCount = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(tasks)
    .where(
      and(
        eq(tasks.assignee_id, memberId),
        eq(tasks.company_id, companyId),
        eq(tasks.status, 'todo'),
        isNull(tasks.deleted_at),
      )
    )
    .then((rows) => rows[0]?.count ?? 0);

  // 初日メンバー判定：自分の進行中案件 0 件 && 残タスク 0 件のとき、
  // または ?welcome=1 で強制（経験者でも改めて見られる）。
  // tripot 固有の業務フロー（顧客 → 案件 → 議事録 AI）に絞った導線を提示。
  const isFirstDayView =
    forceWelcome || ((dealStats?.activeCount ?? 0) === 0 && taskCount === 0);
  if (isFirstDayView) {
    // Step 3 のボタン分岐用：自分の最新案件が 1 件でもあれば、議事録タブへ直接飛ばす。
    // 無ければ Step 3 は注釈のままで「先に Step 2 を完了して」と促す。
    const latestDeal = await db
      .select({ id: deals.id })
      .from(deals)
      .where(
        and(
          eq(deals.assignee_id, memberId),
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
        ),
      )
      .orderBy(desc(deals.created_at))
      .limit(1)
      .then((rows) => rows[0]);

    return (
      <main className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-gray-700">{member.name} のホーム</p>
            <div className="flex items-center gap-3">
              {forceWelcome && (
                <a
                  href={`/home/${memberId}`}
                  className="text-xs text-gray-700 hover:text-gray-900 underline decoration-gray-300 hover:decoration-gray-900"
                >
                  通常ホームに戻る
                </a>
              )}
              <p className="text-xs font-mono text-gray-500">
                {new Date().toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </p>
            </div>
          </div>
        </header>
        <div className="px-6 py-10 max-w-5xl mx-auto pb-32 md:pb-12">
          <WelcomeFirstSteps memberName={member.name} latestDealId={latestDeal?.id} />
        </div>
        <LogActionButton />
      </main>
    );
  }

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const actionStats = await db
    .select({
      total: sql<number>`COUNT(*)::int`,
      calls: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'call')::int`,
      meetings: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'meeting')::int`,
      proposals: sql<number>`COUNT(*) FILTER (WHERE ${actions.type} = 'proposal')::int`,
    })
    .from(actions)
    .where(and(eq(actions.member_id, memberId), eq(actions.company_id, companyId), gte(actions.occurred_at, weekStart)))
    .then((rows) => rows[0]);

  const quote = await pickQuoteForMember(memberId);

  const accent = TRIPOT_CONFIG.branding.accentColorHex;
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1;

  const monthStart = new Date(currentYear, currentMonth - 1, 1);
  const monthEnd = new Date(currentYear, currentMonth, 0);

  const [budgetRow, monthRevenueRow, weekTrendRows, funnelRows, latestMorningBriefJob] = await Promise.all([
    db
      .select({ target: budgets.target_revenue })
      .from(budgets)
      .where(
        and(
          eq(budgets.company_id, companyId),
          eq(budgets.year, currentYear),
          eq(budgets.month, currentMonth)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced')), 0)::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.assignee_id, memberId),
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, monthStart.toISOString().slice(0, 10))
        )
      )
      .then((rows) => rows[0]),
    db.execute<{ week_label: string; revenue: number }>(
      sql`
        SELECT
          to_char(date_trunc('week', occurred_at), 'MM/DD') AS week_label,
          COALESCE(SUM((meta->>'amount')::int), 0) AS revenue
        FROM (
          SELECT ${deals.paid_at} AS occurred_at, jsonb_build_object('amount', ${deals.amount}) AS meta
          FROM ${deals}
          WHERE ${deals.company_id} = ${companyId}
            AND ${deals.assignee_id} = ${memberId}
            AND ${deals.deleted_at} IS NULL
            AND ${deals.paid_at} >= (CURRENT_DATE - INTERVAL '8 weeks')
        ) t
        WHERE occurred_at IS NOT NULL
        GROUP BY date_trunc('week', occurred_at)
        ORDER BY date_trunc('week', occurred_at)
      `
    ),
    db
      .select({
        stage: deals.stage,
        n: sql<number>`count(*)::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.assignee_id, memberId),
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at)
        )
      )
      .groupBy(deals.stage),
    getLatestAiJobForMember<Brief>({
      memberId,
      jobType: 'morning-brief',
      companyId,
    }),
  ]);

  const targetRevenue = budgetRow?.target ?? 0;
  const monthRevenue = monthRevenueRow?.revenue ?? 0;

  const trendRows = (weekTrendRows.rows as Array<{ week_label: string; revenue: number }>) ?? [];
  const trendData = trendRows.map((r) => ({
    week: r.week_label,
    value: Math.round(Number(r.revenue) / 10000),
  }));

  const funnelOrder: string[] = ['prospect', 'proposing', 'ordered', 'in_production', 'paid'];
  const funnelMap = new Map<string, number>(funnelRows.map((r) => [r.stage as string, r.n]));
  const funnelData = funnelOrder.map((stage) => {
    const stageDef = TRIPOT_CONFIG.stages.find((s) => s.key === stage);
    return {
      label: stageDef?.label ?? stage,
      count: funnelMap.get(stage) ?? 0,
    };
  });
  void monthEnd;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-700">{member.name} のホーム</p>
          <div className="flex items-center gap-3">
            <a
              href={`/home/${memberId}?welcome=1`}
              className="text-xs text-gray-500 hover:text-gray-900 underline decoration-gray-300 hover:decoration-gray-900"
            >
              最初の 3 ステップを見る
            </a>
            <p className="text-xs font-mono text-gray-500">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
          </div>
        </div>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto pb-32 md:pb-12">
        <section className="overflow-hidden">
          <p className="text-sm text-gray-700">あなたの売上（入金確定）</p>
          <h1
            className="font-semibold text-5xl md:text-7xl text-gray-900 tracking-tight tabular-nums mt-2 truncate"
            title={formatYen(dealStats?.revenue ?? 0)}
          >
            {formatYen(dealStats?.revenue ?? 0)}
          </h1>
        </section>

        {quote ? (
          <section className="mt-12 border-l-2 border-gray-900 pl-6 py-2">
            <p className="font-semibold text-2xl text-gray-700 leading-relaxed">{quote.body}</p>
            {quote.author && (
              <p className="text-xs text-gray-500 mt-2">— {quote.author}</p>
            )}
          </section>
        ) : (
          <section className="mt-12 border-l-2 border-gray-200 pl-6 py-2">
            <p className="text-sm text-gray-700">
              名言が未登録です。
              <a href="/settings/quotes" className="text-gray-900 underline ml-1">
                設定の名言
              </a>{' '}
              から「初期データ投入」を実行してください
            </p>
          </section>
        )}

        <div className="mt-12">
          <MorningBrief
            memberId={memberId}
            initialBrief={normalizeBrief(latestMorningBriefJob?.output)}
            initialGeneratedAt={
              latestMorningBriefJob?.finishedAt.toISOString() ?? null
            }
          />
        </div>

        <section className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm overflow-hidden">
            <p className="text-xs text-gray-500 truncate">進行中の案件</p>
            <p className="font-semibold text-4xl text-gray-900 mt-1 tabular-nums truncate">
              {dealStats?.activeCount ?? 0}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm overflow-hidden">
            <p className="text-xs text-gray-500 truncate">残タスク</p>
            <p className="font-semibold text-4xl text-gray-900 mt-1 tabular-nums truncate">
              {taskCount}
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm col-span-2 md:col-span-1 overflow-hidden">
            <p className="text-xs text-gray-500 truncate">粗利合計（入金確定）</p>
            <p
              className="font-semibold text-2xl md:text-3xl text-emerald-700 mt-1 tabular-nums truncate"
              title={formatYen(dealStats?.grossProfit ?? 0)}
            >
              {formatYen(dealStats?.grossProfit ?? 0)}
            </p>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <RevenueAchievementCard
            current={monthRevenue}
            target={targetRevenue}
            accent={accent}
          />
          <RevenueTrendCard data={trendData} accent="#0F172A" />
          <FunnelCard data={funnelData} accent="#1E293B" />
        </section>

        <div className="mt-8">
          <CommitmentsSection memberId={memberId} />
        </div>

        <div className="mt-8">
          <SilentCustomersCard companyId={companyId} />
        </div>

        <section className="mt-8 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-3">今週の行動量（直近7日）</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <p className="text-xs text-gray-500">合計</p>
              <p className="font-semibold text-3xl text-gray-900 tabular-nums">{actionStats?.total ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">電話</p>
              <p className="font-mono tabular-nums text-xl text-gray-900">{actionStats?.calls ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">商談</p>
              <p className="font-mono tabular-nums text-xl text-gray-900">{actionStats?.meetings ?? 0}</p>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">提案</p>
              <p className="font-mono tabular-nums text-xl text-gray-900">{actionStats?.proposals ?? 0}</p>
            </div>
          </div>
        </section>
      </div>

      <LogActionButton />
    </main>
  );
}
