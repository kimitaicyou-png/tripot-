import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, budgets } from '@/db/schema';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue } from '@/components/ui/stat-card';
import { SendToHqButton } from './_components/send-to-hq-button';
import { VsBudgetCard } from './_components/vs-budget-card';
import { MonthlyKpiCards } from './_components/monthly-kpi-cards';
import { PlVsTargetCards } from './_components/pl-vs-target-cards';
import { OpexInputForm } from './_components/opex-input-form';
import { getMonthlyOpex } from '@/lib/actions/monthly-opex';
import { getDealForecastAmount } from '@/lib/deals/forecast-weight';
import { formatYen } from '@/lib/format';
import { TRIPOT_CONFIG } from '../../../../coaris.config';

export default async function MonthlyPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);
  const yearMonth = `${year}-${String(month).padStart(2, '0')}`;

  // 売上 / 受注 / 粗利 を 1 クエリで取得
  const actualKpi = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced') AND ${deals.paid_at} >= ${monthStart} AND ${deals.paid_at} <= ${monthEnd}), 0)::int`,
      ordered: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} = 'ordered' AND ${deals.ordered_at} >= ${monthStart} AND ${deals.ordered_at} <= ${monthEnd}), 0)::int`,
      gross_profit: sql<number>`COALESCE(SUM(${deals.gross_profit}) FILTER (WHERE ${deals.stage} IN ('paid', 'invoiced') AND ${deals.paid_at} >= ${monthStart} AND ${deals.paid_at} <= ${monthEnd}), 0)::int`,
    })
    .from(deals)
    .where(and(eq(deals.company_id, session.user.company_id), isNull(deals.deleted_at)))
    .then((rows) => rows[0]);

  // 進行中パイプライン（行単位で取得、ヨミ予測売上ハイブリッド計算用）
  // 隊長明示 2026-05-27 02:10：「/weekly /monthly の予測売上もハイブリッド計算に統一」
  // 旧 SQL 集計（stage 別 SUM）→ 行単位取得 + forecast-weight でメモリ集計に変更
  const activeDealsForCf = await db
    .select({
      stage: deals.stage,
      amount: deals.amount,
      subjective_confidence: deals.subjective_confidence,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
        sql`${deals.stage} NOT IN ('paid', 'lost')`
      )
    );

  // 予算（今月）
  const budgetRow = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.company_id, session.user.company_id),
        eq(budgets.year, year),
        eq(budgets.month, month),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  // 販管費（手動入力、companies.config.monthly_opex[YM]）
  const monthlyOpex = await getMonthlyOpex(yearMonth);

  const targetRevenue = budgetRow?.target_revenue ?? 0;
  const actualRevenue = actualKpi?.revenue ?? 0;
  const progressRate = targetRevenue > 0 ? Math.round((actualRevenue / targetRevenue) * 100) : 0;

  const targetGrossProfit = budgetRow?.target_gross_profit ?? 0;
  const actualGrossProfit = actualKpi?.gross_profit ?? 0;

  const targetOperatingProfit = budgetRow?.target_operating_profit ?? 0;
  const actualOperatingProfit = actualGrossProfit - monthlyOpex;

  // ヨミ予測売上ハイブリッド（forecast-weight：stage CF + 主観確度の段階別 fallback）
  const cfByStage = new Map<string, { amount: number; weighted: number }>();
  for (const d of activeDealsForCf) {
    const cur = cfByStage.get(d.stage) ?? { amount: 0, weighted: 0 };
    cur.amount += d.amount ?? 0;
    cur.weighted += getDealForecastAmount(d.amount, d.stage, d.subjective_confidence);
    cfByStage.set(d.stage, cur);
  }
  const cfBreakdown = Array.from(cfByStage.entries())
    .map(([stage, v]) => {
      const stageDef = TRIPOT_CONFIG.stages.find((s) => s.key === stage);
      // 実効加重平均（A 多ければ高い、E 多ければ低い、未設定なら stage CF 加重に等しい）
      const effectiveWeight = v.amount > 0 ? v.weighted / v.amount : (stageDef?.cashflowWeight ?? 0);
      return {
        stage,
        label: stageDef?.label ?? stage,
        amount: v.amount,
        weight: effectiveWeight,
        weighted: v.weighted,
        order: stageDef?.order ?? 999,
      };
    })
    .filter((b) => b.amount > 0)
    .sort((a, b) => a.order - b.order);

  const cfForecast = cfBreakdown.reduce((s, b) => s + b.weighted, 0);

  const remaining = calculateRemainingDays(year, month);
  const canEditOpex =
    session.user.role === 'president' || session.user.role === 'hq_member';

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="MONTHLY"
        title={`${year}年 ${month}月`}
        subtitle="今月の実績 vs 計画"
        actions={
          <div className="flex items-center gap-3 flex-wrap">
            <SendToHqButton yearMonth={yearMonth} />
            <Link
              href={`/monthly/finance?ym=${yearMonth}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-900 rounded-lg hover:bg-slate-50"
            >
              ファイナンス
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href={`/monthly/detail/${yearMonth}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 text-xs font-medium text-gray-900 rounded-lg hover:bg-slate-50"
            >
              ドリルダウン
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        <HeroValue
          label="今月の売上（入金確定）"
          value={formatYen(actualRevenue)}
          sub={
            targetRevenue > 0 ? (
              <>
                目標{' '}
                <span className="font-mono tabular-nums text-gray-900">
                  {formatYen(targetRevenue)}
                </span>
                {' '}に対し{' '}
                <span
                  className={`font-mono tabular-nums font-medium ${
                    progressRate >= 100
                      ? 'text-emerald-700'
                      : progressRate >= 80
                        ? 'text-gray-900'
                        : 'text-red-700'
                  }`}
                >
                  {progressRate}%
                </span>
              </>
            ) : (
              '目標未設定（事業計画から設定できます）'
            )
          }
        />

        <VsBudgetCard
          targetRevenue={targetRevenue}
          actualRevenue={actualRevenue}
          progressRate={progressRate}
        />

        {/* 粗利 / 営業利益 / CF 見通し（新規） */}
        <PlVsTargetCards
          targetGrossProfit={targetGrossProfit}
          actualGrossProfit={actualGrossProfit}
          targetOperatingProfit={targetOperatingProfit}
          actualOperatingProfit={actualOperatingProfit}
          opexInput={monthlyOpex}
          cfForecast={cfForecast}
          cfBreakdown={cfBreakdown.map(({ stage, label, weighted, weight }) => ({
            stage,
            label,
            amount: weighted,
            weight,
          }))}
        />

        {/* 販管費 手動入力（MF 接続前の仮 UI） */}
        <OpexInputForm
          yearMonth={yearMonth}
          initialAmount={monthlyOpex}
          canEdit={canEditOpex}
        />

        <MonthlyKpiCards
          ordered={actualKpi?.ordered ?? 0}
          remainingDays={remaining}
          progressRate={progressRate}
          targetRevenue={targetRevenue}
          actualRevenue={actualRevenue}
        />
      </div>
    </main>
  );
}

function calculateRemainingDays(year: number, month: number): number {
  const today = new Date();
  const lastDay = new Date(year, month, 0).getDate();
  const currentDay = today.getDate();
  let remaining = 0;
  for (let d = currentDay; d <= lastDay; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0 && day !== 6) remaining++;
  }
  return remaining;
}
