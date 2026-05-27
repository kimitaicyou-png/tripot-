import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LayoutGrid, List, CalendarRange } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, members, customers } from '@/db/schema';
import { eq, and, isNull, desc, asc, sql, gte, type SQL } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { DealsKanban } from './_components/deals-kanban';
import { KanbanFilters } from './_components/kanban-filters';
import { ConfidenceBadge } from './[dealId]/_components/confidence-badge';
import { DealsWeekGrid } from './_components/deals-week-grid';
import { InlineAmountInput } from './_components/inline-amount-input';
import { InlineConfidenceSelect } from './_components/inline-confidence-select';
import { InlineNextActionInput, type NextActionData } from './_components/inline-next-action-input';
import { InlineAssigneeSelect } from './_components/inline-assignee-select';
import { InlineExpectedCloseInput } from './_components/inline-expected-close-input';
import { InlineStageChanger } from './[dealId]/_components/inline-stage-changer';
import type { WeekGridDeal } from '@/lib/deals/week-grid';
import { getDealForecastAmount, getDealForecastWeight } from '@/lib/deals/forecast-weight';
import { formatYen } from '@/lib/format';
import { TRIPOT_CONFIG } from '../../../../coaris.config';

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

const STAGE_ORDER: readonly string[] = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
];

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'this_week': {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case 'this_month': {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }
    case 'this_quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), q * 3, 1);
    }
    default:
      return null;
  }
}

export default async function DealsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    assignee?: string;
    confidence?: string;
    period?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const {
    view,
    assignee,
    confidence,
    period = 'all',
    sort = 'updated_desc',
    page: pageStr,
  } = await searchParams;
  // view: 'kanban' (default) | 'list' | 'week-grid'
  const isWeekGrid = view === 'week-grid';
  const isList = view === 'list';
  const isKanban = !isWeekGrid && !isList;

  // ページネーション（List view のみ有効、Kanban / WeekGrid は全件 = フィルタで絞る）
  const PAGE_SIZE = 50;
  const KANBAN_LIMIT = 300;
  const requestedPage = Math.max(1, Number(pageStr) || 1);
  const offset = isList ? (requestedPage - 1) * PAGE_SIZE : 0;
  const queryLimit = isList ? PAGE_SIZE : KANBAN_LIMIT;

  // フィルタ条件構築
  const whereConditions: SQL[] = [
    eq(deals.company_id, session.user.company_id),
    isNull(deals.deleted_at),
  ];
  if (assignee) {
    whereConditions.push(eq(deals.assignee_id, assignee));
  }
  // 主観確度フィルタ（2026-05-26 G7 拡張、隊長要望「確度で絞り込み」）
  // 'unset' は null のみ、それ以外は enum 値で eq
  if (confidence) {
    if (confidence === 'unset') {
      whereConditions.push(isNull(deals.subjective_confidence));
    } else if (
      ['a', 'b', 'c', 'd', 'e', 'expected', 'continuing'].includes(confidence)
    ) {
      whereConditions.push(
        eq(deals.subjective_confidence, confidence as 'a' | 'b' | 'c' | 'd' | 'e' | 'expected' | 'continuing'),
      );
    }
  }
  const periodStart = getPeriodStart(period);
  if (periodStart) {
    whereConditions.push(gte(deals.updated_at, periodStart));
  }

  // ソート条件
  const orderBy = (() => {
    switch (sort) {
      case 'amount_desc':
        return desc(deals.amount);
      case 'amount_asc':
        return asc(deals.amount);
      case 'expected_close_asc':
        // NULLS LAST：未設定の案件は最後、期日近い順
        return sql`${deals.expected_close_date} ASC NULLS LAST`;
      case 'expected_close_desc':
        return sql`${deals.expected_close_date} DESC NULLS LAST`;
      case 'updated_asc':
        return asc(deals.updated_at);
      // cf_weighted_desc は cashflowWeight が config 側のためメモリでソート
      case 'updated_desc':
      default:
        return desc(deals.updated_at);
    }
  })();

  const [rowsRaw, memberOptions, filteredCountRow] = await Promise.all([
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        amount: deals.amount,
        monthly_amount: deals.monthly_amount,
        revenue_type: deals.revenue_type,
        assignee_id: deals.assignee_id,
        assignee_name: members.name,
        customer_name: customers.name,
        updated_at: deals.updated_at,
        gross_profit: deals.gross_profit,
        gross_profit_rate: deals.gross_profit_rate,
        subjective_confidence: deals.subjective_confidence,
        metadata: deals.metadata,
        expected_close_date: deals.expected_close_date,
      })
      .from(deals)
      .leftJoin(members, eq(deals.assignee_id, members.id))
      .leftJoin(customers, eq(deals.customer_id, customers.id))
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(queryLimit)
      .offset(offset),
    db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(
        and(eq(members.company_id, session.user.company_id), isNull(members.deleted_at))
      )
      .orderBy(members.name),
    // フィルタ後の総件数（ページネーション計算用）
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(deals)
      .where(and(...whereConditions))
      .then((r) => r[0]),
  ]);

  const filteredTotal = filteredCountRow?.count ?? 0;
  const totalPages = isKanban ? 1 : Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = isKanban ? 1 : Math.min(requestedPage, totalPages);

  // cf_weighted_desc は メモリソート（forecast-weight 経由、stage CF と主観確度のハイブリッド）
  const rows =
    sort === 'cf_weighted_desc'
      ? [...rowsRaw].sort((a, b) => {
          const wa = getDealForecastAmount(a.amount, a.stage, a.subjective_confidence);
          const wb = getDealForecastAmount(b.amount, b.stage, b.subjective_confidence);
          return wb - wa;
        })
      : rowsRaw;

  const totalDealsCount = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((r) => r[0]?.count ?? 0);
  const isPartialList = (isKanban || isWeekGrid) && rows.length >= KANBAN_LIMIT && filteredTotal > KANBAN_LIMIT;
  const hasActiveFilter = Boolean(assignee) || Boolean(confidence) || period !== 'all';

  // 案件グリッド view（隊長明示 2026-05-27 02:02 で週列は廃止、案件 table のみ残す）
  // 次やること（text/due_date/assignee_id）も列として追加（2026-05-27 02:10）
  const weekGridDeals: WeekGridDeal[] = isWeekGrid
    ? rows.map((d) => {
        const meta = (d.metadata as Record<string, unknown> | null) ?? {};
        const nextText = typeof meta.next_action === 'string' ? meta.next_action : null;
        const nextDue =
          typeof meta.next_action_due_date === 'string' ? meta.next_action_due_date : null;
        const nextAssignee =
          typeof meta.next_action_assignee_id === 'string'
            ? meta.next_action_assignee_id
            : null;
        return {
          id: d.id,
          title: d.title,
          stage: d.stage,
          amount: d.amount,
          customer_name: d.customer_name,
          assignee_id: d.assignee_id,
          assignee_name: d.assignee_name,
          subjective_confidence: d.subjective_confidence,
          next_action_text: nextText,
          next_action_due_date: nextDue,
          next_action_assignee_id: nextAssignee,
        };
      })
    : [];

  const totalActive = rows.filter((d) =>
    ['proposing', 'ordered', 'in_production'].includes(d.stage),
  ).length;
  const totalRevenue = rows
    .filter((d) => d.stage === 'paid' || d.stage === 'invoiced')
    .reduce((s, d) => s + (d.amount ?? 0), 0);
  // 「ヨミ予測売上」= 失注以外の全案件の (amount × forecast weight) 合計
  // stage CF 加重 + 主観確度のハイブリッド（ADR-0013 + 秋美レビュー 2026-05-26 反映）
  const totalForecast = rows
    .filter((d) => d.stage !== 'lost')
    .reduce(
      (s, d) => s + getDealForecastAmount(d.amount, d.stage, d.subjective_confidence),
      0,
    );
  // 純パイプライン（重み付けなし、参考表示用）
  const totalPipelineRaw = rows
    .filter((d) => !['paid', 'lost'].includes(d.stage))
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const grouped = STAGE_ORDER.map((stage) => ({
    stage,
    items: rows.filter((d) => d.stage === stage),
  })).filter((g) => g.items.length > 0);

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="DEALS"
        title="案件"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-gray-900">{rows.length}</span> 件
            {hasActiveFilter && (
              <span className="text-amber-700"> （フィルタ適用中、全 {totalDealsCount} 件中）</span>
            )}
            {' '}／ 進行中{' '}
            <span className="font-mono tabular-nums text-gray-900">{totalActive}</span>
          </>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
              <Link
                href="/deals?view=kanban"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                  isKanban
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={isKanban}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Kanban
              </Link>
              <Link
                href="/deals?view=list"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                  isList
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={isList}
              >
                <List className="w-3.5 h-3.5" />
                リスト
              </Link>
              <Link
                href="/deals?view=week-grid"
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150 ${
                  isWeekGrid
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-pressed={isWeekGrid}
                title="月別週グリッド（現行スプレッドシート互換）"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                週グリッド
              </Link>
            </div>
            <Link
              href="/deals/import"
              className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
            >
              CSV 取込
            </Link>
            <Link
              href="/deals/new"
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
            >
              新規登録
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-7xl mx-auto space-y-8">
        {/* フィルタバー */}
        <KanbanFilters
          members={memberOptions}
          currentView={isWeekGrid ? 'week-grid' : isKanban ? 'kanban' : 'list'}
        />

        {isPartialList && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-sm text-amber-900">
              <span className="font-semibold">Kanban の表示件数上限に達しています。</span>{' '}
              該当 <span className="font-mono tabular-nums">{filteredTotal}</span> 件中、最新{' '}
              <span className="font-mono tabular-nums">{KANBAN_LIMIT}</span> 件のみ表示中。
              フィルタで絞り込むかリスト view（ページネーション付き）に切り替えてください。
            </p>
          </div>
        )}

        {rows.length === 0 ? (
          hasActiveFilter ? (
            <EmptyState
              icon="◯"
              title="フィルタ条件に一致する案件がありません"
              description="フィルタを解除するか、条件を変えてみてください。"
            />
          ) : (
            <EmptyState
              icon="◯"
              title="まだ案件が登録されていません"
              description="最初の案件を登録して、行動を積み上げていきましょう。"
              cta={{ href: '/deals/new', label: '案件を登録する' }}
            />
          )
        ) : (
          <>
            <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard label="入金確定累計" value={formatYen(totalRevenue)} tone="up" big />
              <StatCard
                label="ヨミ予測売上"
                value={formatYen(totalForecast)}
                sub={`総額 ${formatYen(totalPipelineRaw)}`}
                tone="accent"
                big
              />
              <StatCard
                label="進行中の案件"
                value={totalActive}
                sub={`全${rows.length}件中`}
                big
              />
            </section>

            {isWeekGrid ? (
              <DealsWeekGrid deals={weekGridDeals} members={memberOptions} />
            ) : isKanban ? (
              <DealsKanban
                deals={rows.map((d) => ({
                  ...d,
                  updated_at: d.updated_at instanceof Date ? d.updated_at : new Date(d.updated_at),
                }))}
              />
            ) : (
              <>
                {/* G7 拡張：List view 全体の列ヘッダ（金額/期日/更新日 クリックで sort 切替、2026-05-26 03:00） */}
                {(() => {
                  const buildSortHref = (nextSort: string) => {
                    const p = new URLSearchParams();
                    p.set('view', 'list');
                    if (assignee) p.set('assignee', assignee);
                    if (confidence) p.set('confidence', confidence);
                    if (period !== 'all') p.set('period', period);
                    p.set('sort', nextSort);
                    return `/deals?${p.toString()}`;
                  };
                  const SortLink = ({
                    label,
                    ascSort,
                    descSort,
                  }: {
                    label: string;
                    ascSort: string;
                    descSort: string;
                  }) => {
                    const isAsc = sort === ascSort;
                    const isDesc = sort === descSort;
                    const next = isDesc ? ascSort : descSort;
                    const arrow = isAsc ? '▲' : isDesc ? '▼' : '⇅';
                    const active = isAsc || isDesc;
                    return (
                      <Link
                        href={buildSortHref(next) as never}
                        className={`inline-flex items-center gap-0.5 hover:text-gray-900 active:scale-[0.98] transition-colors ${active ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}
                      >
                        {label}
                        <span className="text-[9px] opacity-70">{arrow}</span>
                      </Link>
                    );
                  };
                  return (
                    <div className="hidden md:flex items-center gap-4 px-5 py-2 text-[11px] text-gray-600 border-b border-gray-200">
                      <span className="shrink-0 w-[88px]">ステージ</span>
                      <span className="shrink-0 w-[64px]">確度</span>
                      <span className="w-[14rem] shrink-0">案件</span>
                      <span className="flex-1 min-w-0">次やること</span>
                      <span className="shrink-0 w-32">顧客</span>
                      <span className="shrink-0 w-20">担当</span>
                      <span className="shrink-0 w-[104px]">
                        <SortLink label="受注予定" ascSort="expected_close_asc" descSort="expected_close_desc" />
                      </span>
                      <span className="shrink-0 w-[120px] text-right">
                        <SortLink label="金額" ascSort="amount_asc" descSort="amount_desc" />
                      </span>
                      <span className="shrink-0 w-16 text-center">粗利率</span>
                    </div>
                  );
                })()}
              {grouped.map((g) => (
                <section key={g.stage}>
                  <SectionHeading
                    eyebrow={g.stage.toUpperCase()}
                    title={STAGE_LABEL[g.stage] ?? g.stage}
                    count={g.items.length}
                  />
                  {/* G7（2026-05-26）：行を Link → div 化、案件名のみ Link、金額・確度は inline 編集 */}
                  <div className="bg-white border border-gray-200 rounded-xl divide-y divide-border">
                    {g.items.map((d) => (
                      <div
                        key={d.id}
                        className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                      >
                        {/* G7 拡張：stage inline 編集（見出しと幅揃え 88px） */}
                        <span className="shrink-0 w-[88px] inline-flex items-center">
                          <InlineStageChanger dealId={d.id} currentStage={d.stage} />
                        </span>
                        {/* G3 + G7：主観確度（見出しと幅揃え 64px） */}
                        <span className="shrink-0 w-[64px] hidden md:inline-flex items-center">
                          <InlineConfidenceSelect dealId={d.id} initial={d.subjective_confidence} />
                        </span>
                        {/* mobile: 表示のみ */}
                        <span className="shrink-0 inline-flex md:hidden">
                          <ConfidenceBadge value={d.subjective_confidence} size="sm" />
                        </span>
                        <Link
                          href={`/deals/${d.id}`}
                          className="text-sm text-gray-900 truncate font-medium hover:underline decoration-gray-400 w-[14rem] shrink-0"
                        >
                          {d.title}
                        </Link>
                        {/* G7 拡張：「次やること」3 要素 inline 編集（隊長明示 2026-05-26 03:14、いつ/誰/何を） */}
                        <span className="flex-1 min-w-0 hidden md:inline-flex">
                          {(() => {
                            const meta = (d.metadata as Record<string, unknown> | null) ?? {};
                            const initial: NextActionData = {
                              text: typeof meta.next_action === 'string' ? meta.next_action : '',
                              due_date:
                                typeof meta.next_action_due_date === 'string'
                                  ? meta.next_action_due_date
                                  : null,
                              assignee_id:
                                typeof meta.next_action_assignee_id === 'string'
                                  ? meta.next_action_assignee_id
                                  : null,
                            };
                            return (
                              <InlineNextActionInput
                                dealId={d.id}
                                initial={initial}
                                members={memberOptions}
                                fallbackAssigneeId={d.assignee_id}
                              />
                            );
                          })()}
                        </span>
                        <span className="text-xs text-gray-700 shrink-0 hidden md:inline w-32 truncate">
                          {d.customer_name ?? '—'}
                        </span>
                        {/* G7 拡張：担当 inline 編集（隊長明示 2026-05-27 01:39） */}
                        <span className="shrink-0 w-20 hidden md:inline-flex items-center">
                          <InlineAssigneeSelect dealId={d.id} initial={d.assignee_id} members={memberOptions} />
                        </span>
                        {/* G7 拡張：受注予定日 inline（見出しと幅揃え 104px） */}
                        <span className="shrink-0 w-[104px] hidden md:inline-flex items-center">
                          <InlineExpectedCloseInput dealId={d.id} initial={d.expected_close_date} />
                        </span>
                        <span className="text-right shrink-0 w-[120px] inline-flex items-center justify-end flex-col">
                          {/* G7：金額 inline（見出しと幅揃え 120px、右寄せ） */}
                          <InlineAmountInput dealId={d.id} initialAmount={d.amount} />
                          {d.revenue_type !== 'spot' && d.monthly_amount ? (
                            <span className="text-xs text-amber-700 font-mono tabular-nums block mt-0.5">
                              月 {formatYen(d.monthly_amount)}
                            </span>
                          ) : null}
                        </span>
                        {(() => {
                          const rate =
                            d.gross_profit_rate == null ? null : Number(d.gross_profit_rate);
                          if (rate == null || (d.amount ?? 0) === 0) return null;
                          const tone =
                            rate >= 50
                              ? 'bg-emerald-50 text-emerald-700'
                              : rate >= 20
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-red-700';
                          return (
                            <span
                              className={`hidden md:inline-flex items-center px-2 py-0.5 text-xs font-mono tabular-nums rounded-lg shrink-0 w-16 justify-center ${tone}`}
                              title={`粗利 ${formatYen(d.gross_profit)} / 粗利率 ${rate.toFixed(2)}%`}
                            >
                              {rate.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              </>
            )}

            {/* ページネーション（List view のみ） */}
            {isList && totalPages > 1 && (
              <nav
                className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200"
                aria-label="ページネーション"
              >
                <p className="text-xs text-gray-600">
                  {(currentPage - 1) * PAGE_SIZE + 1}–
                  {Math.min(currentPage * PAGE_SIZE, filteredTotal)} / 全{' '}
                  <span className="font-mono tabular-nums text-gray-900">{filteredTotal}</span> 件
                </p>
                <div className="flex items-center gap-2">
                  {currentPage > 1 ? (
                    <Link
                      href={(() => {
                        const p = new URLSearchParams();
                        if (view) p.set('view', view);
                        if (assignee) p.set('assignee', assignee);
                        if (confidence) p.set('confidence', confidence);
                        if (period !== 'all') p.set('period', period);
                        if (sort !== 'updated_desc') p.set('sort', sort);
                        if (currentPage - 1 > 1) p.set('page', String(currentPage - 1));
                        return `/deals${p.toString() ? `?${p.toString()}` : ''}`;
                      })()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                    >
                      ← 前へ
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg">
                      ← 前へ
                    </span>
                  )}
                  <span className="font-mono tabular-nums text-xs text-gray-700 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  {currentPage < totalPages ? (
                    <Link
                      href={(() => {
                        const p = new URLSearchParams();
                        if (view) p.set('view', view);
                        if (assignee) p.set('assignee', assignee);
                        if (confidence) p.set('confidence', confidence);
                        if (period !== 'all') p.set('period', period);
                        if (sort !== 'updated_desc') p.set('sort', sort);
                        p.set('page', String(currentPage + 1));
                        return `/deals?${p.toString()}`;
                      })()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                    >
                      次へ →
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-300 border border-gray-100 rounded-lg">
                      次へ →
                    </span>
                  )}
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </main>
  );
}
