'use client';

import { useMemo } from 'react';
import type { Deal, ProductionCard } from '@/lib/stores/types';
import { calcDealKpi, calcMemberStats, calcFunnel } from '@/lib/calc/dealCalc';
import { calcProductionKpi, calcMemberPerf } from '@/lib/calc/productionCalc';
import { MEMBERS } from '@/lib/constants/members';
import { formatYen } from '@/lib/format';
import { safePercent } from '@/lib/safeMath';

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
};

export function WeeklySummary({ deals, cards }: Props) {
  const dealKpi = useMemo(() => calcDealKpi(deals), [deals]);
  const prodKpi = useMemo(() => calcProductionKpi(cards), [cards]);
  const memberStats = useMemo(() => calcMemberStats(deals), [deals]);
  const memberPerfs = useMemo(() => calcMemberPerf(cards, MEMBERS), [cards]);
  const funnel = useMemo(() => calcFunnel(deals), [deals]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">週次サマリー</h2>
        <p className="text-xs text-gray-500 mt-0.5">営業 + 制作の自動集計</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox label="受注件数" value={`${dealKpi.orderedCount}`} sub={formatYen(dealKpi.totalRevenue)} />
        <KpiBox label="パイプライン" value={`${dealKpi.pipelineCount}`} sub={`加重 ${formatYen(dealKpi.pipelineWeighted)}`} />
        <KpiBox label="制作稼働" value={`${prodKpi.activeCount}`} sub={`完了 ${prodKpi.completedCount}件`} />
        <KpiBox label="粗利率" value={`${dealKpi.grossMarginRate}%`} sub={formatYen(dealKpi.totalGrossProfit)} highlight={dealKpi.grossMarginRate < 30} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">営業ファネル</h3>
          <div className="space-y-2">
            {funnel.map((f) => {
              const maxCount = Math.max(...funnel.map((x) => x.count), 1);
              const pct = safePercent(f.count, maxCount);
              return (
                <div key={f.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-700 w-12 shrink-0">{f.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-900 tabular-nums w-6 text-right">{f.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">制作進捗</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">タスク消化率</span>
              <span className="font-semibold text-gray-900 tabular-nums">{prodKpi.completionRate}%（{prodKpi.taskDone}/{prodKpi.taskTotal}）</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${prodKpi.completionRate}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">予算消化率</span>
              <span className={`font-semibold tabular-nums ${prodKpi.budgetUsedPct > 90 ? 'text-red-600' : 'text-gray-900'}`}>{prodKpi.budgetUsedPct}%</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500">内製</p>
                <p className="font-semibold text-gray-900 tabular-nums">{prodKpi.internalTaskCount}件</p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-gray-500">外注</p>
                <p className="font-semibold text-gray-900 tabular-nums">{prodKpi.externalTaskCount}件</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">メンバー別（営業）</h3>
        {memberStats.length === 0 ? (
          <p className="text-xs text-gray-500 py-3 text-center">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 font-medium">メンバー</th>
                  <th className="text-right py-2 font-medium">リード</th>
                  <th className="text-right py-2 font-medium">商談</th>
                  <th className="text-right py-2 font-medium">受注</th>
                  <th className="text-right py-2 font-medium">売上</th>
                  <th className="text-right py-2 font-medium">粗利</th>
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m) => (
                  <tr key={m.name} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{m.name}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{m.leads}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{m.meetings}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{m.orders}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{formatYen(m.revenue)}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{formatYen(m.grossProfit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">メンバー別（制作）</h3>
        {memberPerfs.length === 0 ? (
          <p className="text-xs text-gray-500 py-3 text-center">データがありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 font-medium">メンバー</th>
                  <th className="text-right py-2 font-medium">完了</th>
                  <th className="text-right py-2 font-medium">残タスク</th>
                  <th className="text-right py-2 font-medium">納期順守率</th>
                  <th className="text-right py-2 font-medium">コスト</th>
                </tr>
              </thead>
              <tbody>
                {memberPerfs.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{p.name}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{p.completed}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{p.activeTasks}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{p.onTimeRate}%</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{formatYen(p.totalCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiBox({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold tabular-nums mt-1 ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{sub}</p>
    </div>
  );
}
