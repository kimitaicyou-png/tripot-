import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, mf_journals, time_logs, members } from '@/db/schema';
import { eq, and, isNull, sql, gte, lte, inArray } from 'drizzle-orm';
import { WeeklyTabs } from '../_components/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

const COGS_CODES = ['5110', '5210', '5310', '5410', '5510', '5610']; // 売上原価系
const SGA_CODES = ['6110', '6210', '6310', '6410', '6510', '6610', '6710', '6810']; // 販管費系

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

function startOfWeek(today: Date, offsetWeeks = 0): Date {
  const d = new Date(today);
  d.setDate(d.getDate() - d.getDay() + (offsetWeeks * 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type SearchParams = { focus?: string };

export default async function WeeklyPlPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const presentation = sp.focus === 'presentation';

  const companyId = session.user.company_id;
  const today = new Date();
  const thisWeekStart = startOfWeek(today, 0);
  const thisWeekEnd = new Date(thisWeekStart);
  thisWeekEnd.setDate(thisWeekEnd.getDate() + 6);
  const lastWeekStart = startOfWeek(today, -1);
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);

  const sixWeeksAgo = startOfWeek(today, -5);

  const [
    thisRevenueRow,
    lastRevenueRow,
    thisJournalRows,
    lastJournalRows,
    timeLogRows,
    trendRows,
  ] = await Promise.all([
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid','invoiced')), 0)::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, isoDate(thisWeekStart)),
          lte(deals.paid_at, isoDate(thisWeekEnd))
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid','invoiced')), 0)::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, isoDate(lastWeekStart)),
          lte(deals.paid_at, isoDate(lastWeekEnd))
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        cogs: sql<number>`COALESCE(SUM(${mf_journals.amount}) FILTER (WHERE ${mf_journals.account_code} = ANY(${COGS_CODES})), 0)::int`,
        sga: sql<number>`COALESCE(SUM(${mf_journals.amount}) FILTER (WHERE ${mf_journals.account_code} = ANY(${SGA_CODES})), 0)::int`,
      })
      .from(mf_journals)
      .where(
        and(
          eq(mf_journals.company_id, companyId),
          gte(mf_journals.entry_date, isoDate(thisWeekStart)),
          lte(mf_journals.entry_date, isoDate(thisWeekEnd))
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        cogs: sql<number>`COALESCE(SUM(${mf_journals.amount}) FILTER (WHERE ${mf_journals.account_code} = ANY(${COGS_CODES})), 0)::int`,
        sga: sql<number>`COALESCE(SUM(${mf_journals.amount}) FILTER (WHERE ${mf_journals.account_code} = ANY(${SGA_CODES})), 0)::int`,
      })
      .from(mf_journals)
      .where(
        and(
          eq(mf_journals.company_id, companyId),
          gte(mf_journals.entry_date, isoDate(lastWeekStart)),
          lte(mf_journals.entry_date, isoDate(lastWeekEnd))
        )
      )
      .then((rows) => rows[0]),
    db
      .select({
        member_name: members.name,
        minutes: sql<number>`COALESCE(SUM(${time_logs.minutes}), 0)::int`,
      })
      .from(time_logs)
      .leftJoin(members, eq(time_logs.member_id, members.id))
      .where(
        and(
          eq(time_logs.company_id, companyId),
          gte(time_logs.occurred_on, isoDate(thisWeekStart)),
          lte(time_logs.occurred_on, isoDate(thisWeekEnd))
        )
      )
      .groupBy(members.id, members.name)
      .orderBy(sql`SUM(${time_logs.minutes}) DESC`),
    db.execute<{ week_label: string; revenue: number; cogs: number; sga: number }>(
      sql`
        WITH weeks AS (
          SELECT generate_series(
            date_trunc('week', ${isoDate(sixWeeksAgo)}::date),
            date_trunc('week', CURRENT_DATE),
            '1 week'::interval
          ) AS w
        )
        SELECT
          to_char(w, 'MM/DD') AS week_label,
          COALESCE((
            SELECT SUM(amount)::int FROM ${deals}
            WHERE company_id = ${companyId}
              AND deleted_at IS NULL
              AND stage IN ('paid','invoiced')
              AND paid_at >= w::date AND paid_at < (w + INTERVAL '7 days')::date
          ), 0) AS revenue,
          COALESCE((
            SELECT SUM(amount)::int FROM ${mf_journals}
            WHERE company_id = ${companyId}
              AND account_code = ANY(${COGS_CODES})
              AND entry_date >= w::date AND entry_date < (w + INTERVAL '7 days')::date
          ), 0) AS cogs,
          COALESCE((
            SELECT SUM(amount)::int FROM ${mf_journals}
            WHERE company_id = ${companyId}
              AND account_code = ANY(${SGA_CODES})
              AND entry_date >= w::date AND entry_date < (w + INTERVAL '7 days')::date
          ), 0) AS sga
        FROM weeks
        ORDER BY w
      `
    ),
  ]);

  void inArray;

  const thisRevenue = thisRevenueRow?.revenue ?? 0;
  const lastRevenue = lastRevenueRow?.revenue ?? 0;
  const thisCogs = thisJournalRows?.cogs ?? 0;
  const thisSga = thisJournalRows?.sga ?? 0;
  const lastCogs = lastJournalRows?.cogs ?? 0;
  const lastSga = lastJournalRows?.sga ?? 0;

  const thisOp = thisRevenue - thisCogs - thisSga;
  const lastOp = lastRevenue - lastCogs - lastSga;

  function ratio(curr: number, prev: number): { value: number; tone: 'up' | 'down' | 'default' } {
    if (prev === 0) return { value: 0, tone: 'default' };
    const r = ((curr - prev) / Math.abs(prev)) * 100;
    return { value: Math.round(r), tone: r > 0 ? 'up' : r < 0 ? 'down' : 'default' };
  }

  const revenueRatio = ratio(thisRevenue, lastRevenue);
  const opRatio = ratio(thisOp, lastOp);

  const trendData = ((trendRows.rows as Array<{ week_label: string; revenue: number; cogs: number; sga: number }>) ?? []).map((r) => ({
    week: r.week_label,
    revenue: Number(r.revenue),
    cogs: Number(r.cogs),
    sga: Number(r.sga),
    op: Number(r.revenue) - Number(r.cogs) - Number(r.sga),
  }));

  const totalMinutes = timeLogRows.reduce((s, r) => s + (r.minutes ?? 0), 0);
  const hasJournalData = thisCogs > 0 || thisSga > 0 || lastCogs > 0 || lastSga > 0;

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="WEEKLY · PL"
        title="週次PL（損益）"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-ink">{isoDate(thisWeekStart)}</span> 〜{' '}
            <span className="font-mono tabular-nums text-ink">{isoDate(thisWeekEnd)}</span>
          </>
        }
        actions={
          <Link
            href={presentation ? '/weekly/pl' : '/weekly/pl?focus=presentation'}
            className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
          >
            {presentation ? '通常表示' : '大画面モード'}
          </Link>
        }
      />
      <WeeklyTabs />

      <div className={`${presentation ? 'max-w-7xl text-lg' : 'max-w-5xl'} mx-auto px-6 py-8 space-y-10`}>
        <section>
          <HeroValue
            label="今週の営業利益"
            value={formatYen(thisOp)}
            sub={
              opRatio.value !== 0
                ? `前週比 ${opRatio.value > 0 ? '+' : ''}${opRatio.value}%`
                : '前週比データなし'
            }
            tone={opRatio.tone}
          />
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="売上"
            value={formatYen(thisRevenue)}
            sub={revenueRatio.value !== 0 ? `前週比 ${revenueRatio.value > 0 ? '+' : ''}${revenueRatio.value}%` : '—'}
            tone={revenueRatio.tone}
          />
          <StatCard
            label="売上原価"
            value={formatYen(thisCogs)}
            sub={hasJournalData ? `先週 ${formatYen(lastCogs)}` : 'MF未連携'}
          />
          <StatCard
            label="販管費"
            value={formatYen(thisSga)}
            sub={hasJournalData ? `先週 ${formatYen(lastSga)}` : 'MF未連携'}
          />
          <StatCard
            label="営業利益"
            value={formatYen(thisOp)}
            sub={`先週 ${formatYen(lastOp)}`}
            tone={opRatio.tone}
          />
        </section>

        {!hasJournalData && (
          <section>
            <EmptyState
              icon="◌"
              title="MFクラウド連携データがありません"
              description="売上原価 / 販管費は mf_journals テーブルから集計します。/settings/mf で連携を有効にしてください"
              cta={{ label: 'MF連携設定へ', href: '/settings/mf' }}
            />
          </section>
        )}

        <section>
          <SectionHeading
            eyebrow="6 WEEKS"
            title="6週間トレンド"
            count={trendData.length}
          />
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="grid grid-cols-6 gap-3">
              {trendData.map((r, i) => {
                const op = r.op;
                const opLabel = op >= 0 ? `+${(op / 10000).toFixed(0)}` : `${(op / 10000).toFixed(0)}`;
                return (
                  <div key={i} className="text-center">
                    <p className="text-xs font-mono tabular-nums text-subtle">{r.week}</p>
                    <p
                      className={`font-semibold text-2xl tabular-nums mt-1 ${
                        op > 0 ? 'text-kpi-up' : op < 0 ? 'text-kpi-down' : 'text-ink'
                      }`}
                    >
                      {opLabel}
                    </p>
                    <p className="text-xs text-subtle">万円</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-subtle mt-4 text-center">数値は営業利益（万円）</p>
          </div>
        </section>

        <section>
          <SectionHeading
            eyebrow="MEMBER HOURS"
            title="今週のメンバー稼働"
            count={timeLogRows.length}
          />
          {timeLogRows.length === 0 ? (
            <EmptyState
              icon="◌"
              title="今週の稼働記録なし"
              description="time_logs に登録があれば集計されます"
            />
          ) : (
            <div className="bg-card border border-border rounded-xl p-6 space-y-3">
              <div className="flex items-baseline gap-3 pb-3 border-b border-border">
                <p className="text-xs uppercase tracking-widest text-subtle">合計</p>
                <p className="font-semibold text-3xl text-ink tabular-nums">
                  {(totalMinutes / 60).toFixed(1)}h
                </p>
                <p className="text-xs text-subtle">/ {timeLogRows.length}名</p>
              </div>
              {timeLogRows.map((r, i) => (
                <div key={i} className="flex items-baseline gap-3">
                  <p className="text-sm font-medium text-ink min-w-[6rem]">{r.member_name ?? '（不明）'}</p>
                  <p className="font-mono tabular-nums text-base text-ink">
                    {(r.minutes / 60).toFixed(1)}h
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
