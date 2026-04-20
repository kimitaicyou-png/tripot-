'use client';

import type { Deal, ProductionCard } from '@/lib/stores/types';
import { MonthlyPl } from './MonthlyPl';
import { MonthlyCashFlow } from './MonthlyCashFlow';
import { MonthlyProduction } from './MonthlyProduction';

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
};

export function MonthlySummary({ deals, cards }: Props) {
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">月次レポート</h2>
        <p className="text-xs text-gray-500 mt-0.5">{monthLabel}</p>
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
        <MonthlyPl deals={deals} cards={cards} />
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
        <MonthlyCashFlow deals={deals} />
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
        <MonthlyProduction cards={cards} />
      </div>
    </div>
  );
}
