'use client';

import { useMemo } from 'react';
import type { Deal, ProductionCard } from '@/lib/stores/types';
import { calcPl, calcShotRunning } from '@/lib/calc/plCalc';
import { formatYen } from '@/lib/format';

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
};

export function MonthlyPl({ deals, cards }: Props) {
  const plRows = useMemo(() => calcPl(deals, cards), [deals, cards]);
  const shotRunning = useMemo(() => calcShotRunning(deals), [deals]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">損益計算書（PL）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="text-left py-2 font-medium">科目</th>
                <th className="text-right py-2 font-medium">予算（万）</th>
                <th className="text-right py-2 font-medium">実績（万）</th>
                <th className="text-right py-2 font-medium">累計予算</th>
                <th className="text-right py-2 font-medium">累計実績</th>
              </tr>
            </thead>
            <tbody>
              {plRows.map((row) => {
                const isProfit = row.label.includes('利益');
                return (
                  <tr key={row.label} className={`border-b border-gray-100 ${isProfit ? 'bg-gray-50' : ''}`}>
                    <td className={`py-2 ${isProfit ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{row.label}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500">{row.budget > 0 ? `¥${row.budget.toLocaleString()}` : '—'}</td>
                    <td className={`py-2 text-right tabular-nums ${row.reverse ? 'text-red-600' : 'text-gray-900'} font-medium`}>¥{row.actual.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-gray-500">{row.ytdBudget > 0 ? `¥${row.ytdBudget.toLocaleString()}` : '—'}</td>
                    <td className="py-2 text-right tabular-nums text-gray-700">¥{row.ytdActual.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">売上構成</h3>
        <div className="grid grid-cols-2 gap-3">
          {shotRunning.map((item) => (
            <div key={item.label} className="p-3 rounded-lg border border-gray-200 bg-white">
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-lg font-semibold text-gray-900 tabular-nums mt-1">¥{item.actual.toLocaleString()}<span className="text-xs text-gray-500 ml-1">万</span></p>
              {item.budget > 0 && <p className="text-xs text-gray-500 mt-0.5">予算 ¥{item.budget.toLocaleString()}万</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
