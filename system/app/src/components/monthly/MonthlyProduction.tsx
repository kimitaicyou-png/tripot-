'use client';

import { useMemo } from 'react';
import type { ProductionCard } from '@/lib/stores/types';
import { calcProductionKpi, calcVendorPerf } from '@/lib/calc/productionCalc';
import { PHASE_LABEL } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';

type Props = {
  cards: ProductionCard[];
};

export function MonthlyProduction({ cards }: Props) {
  const kpi = useMemo(() => calcProductionKpi(cards), [cards]);
  const vendorPerf = useMemo(() => calcVendorPerf(cards), [cards]);

  const activeCards = cards.filter((c) => c.status === 'active');
  const phaseDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of activeCards) map.set(c.phase, (map.get(c.phase) ?? 0) + 1);
    return [...map.entries()].sort(([a], [b]) => {
      const order = ['kickoff', 'requirements', 'design', 'development', 'test', 'release', 'operation'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [activeCards]);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold text-gray-900">制作月次</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">稼働中</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{kpi.activeCount}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">完了</p>
          <p className="text-xl font-semibold text-emerald-600 tabular-nums mt-1">{kpi.completedCount}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">粗利</p>
          <p className={`text-xl font-semibold tabular-nums mt-1 ${kpi.grossRate >= 40 ? 'text-blue-600' : kpi.grossRate >= 20 ? 'text-gray-900' : 'text-red-600'}`}>{kpi.grossRate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">{formatYen(kpi.grossProfit)}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">タスク消化</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{kpi.completionRate}%</p>
          <p className="text-xs text-gray-500 mt-0.5">{kpi.taskDone}/{kpi.taskTotal}</p>
        </div>
      </div>

      {phaseDistribution.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">フェーズ別分布</h4>
          <div className="flex gap-2 flex-wrap">
            {phaseDistribution.map(([phase, count]) => (
              <div key={phase} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-xs text-gray-700">{PHASE_LABEL[phase as keyof typeof PHASE_LABEL] ?? phase}</span>
                <span className="text-xs font-semibold text-gray-900 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {vendorPerf.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">外注パフォーマンス</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 font-medium">外注先</th>
                  <th className="text-right py-2 font-medium">完了</th>
                  <th className="text-right py-2 font-medium">合計</th>
                  <th className="text-right py-2 font-medium">納期順守</th>
                  <th className="text-right py-2 font-medium">差戻</th>
                  <th className="text-right py-2 font-medium">コスト</th>
                </tr>
              </thead>
              <tbody>
                {vendorPerf.map((v) => (
                  <tr key={v.name} className="border-b border-gray-100">
                    <td className="py-2 text-gray-900">{v.name}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{v.completed}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{v.total}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{v.onTimeRate}%</td>
                    <td className={`py-2 text-right tabular-nums ${v.rejected > 0 ? 'text-red-600' : 'text-gray-700'}`}>{v.rejected}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">{formatYen(v.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
