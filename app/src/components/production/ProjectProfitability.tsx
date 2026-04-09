'use client';

type ProjectProfit = {
  id: string;
  name: string;
  budgetHours: number;
  actualHours: number;
  budgetCost: number;
  actualCost: number;
  revenue: number;
  budgetGrossProfit: number;
  actualGrossProfit: number;
  completion: number;
};

type Props = {
  projects: ProjectProfit[];
};

function hoursRate(actual: number, budget: number): number {
  if (budget <= 0) return 0;
  return Math.round((actual / budget) * 100);
}

function isOverPace(actualHours: number, budgetHours: number, completion: number): boolean {
  if (budgetHours <= 0 || completion <= 0) return false;
  const consumptionRate = hoursRate(actualHours, budgetHours);
  return consumptionRate > completion;
}

function formatYen(n: number): string {
  if (Math.abs(n) >= 10000) {
    return `${Math.round(n / 10000).toLocaleString()}万円`;
  }
  return `${n.toLocaleString()}円`;
}

export default function ProjectProfitability({ projects }: Props) {
  if (projects.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">案件データがありません</p>
      </div>
    );
  }

  const totalBudgetProfit = projects.reduce((s, p) => s + p.budgetGrossProfit, 0);
  const totalActualProfit = projects.reduce((s, p) => s + p.actualGrossProfit, 0);
  const totalDiff = totalActualProfit - totalBudgetProfit;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">案件採算比較</span>
          <span className="text-xs text-gray-500">{projects.length}件</span>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500">予算粗利合計</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">{formatYen(totalBudgetProfit)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">実績粗利合計</p>
            <p className={`text-sm font-semibold tabular-nums ${totalActualProfit < totalBudgetProfit ? 'text-red-600' : 'text-gray-900'}`}>
              {formatYen(totalActualProfit)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">差異</p>
            <p className={`text-sm font-semibold tabular-nums ${totalDiff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {totalDiff >= 0 ? '+' : ''}{formatYen(totalDiff)}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">案件名</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">予算工数</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">実績工数</th>
              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">消化率</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">予算粗利</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">実績粗利</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">差異</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 w-40">予算残バー</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map((p) => {
              const consumptionRate = hoursRate(p.actualHours, p.budgetHours);
              const overPace = isOverPace(p.actualHours, p.budgetHours, p.completion);
              const diff = p.actualGrossProfit - p.budgetGrossProfit;
              const budgetRemainRate = Math.max(0, Math.min(100, 100 - consumptionRate));
              const isOver = consumptionRate > 100;

              return (
                <tr key={p.id} className={`hover:bg-gray-50 ${overPace ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      {overPace && (
                        <p className="text-xs font-semibold text-red-600 mt-0.5">工数オーバーペース</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{p.budgetHours}h</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`font-semibold ${overPace ? 'text-red-600' : 'text-gray-900'}`}>
                      {p.actualHours}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        overPace
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : isOver
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        消化{consumptionRate}%
                      </span>
                      <p className="text-xs text-gray-500 mt-0.5">進捗{p.completion}%</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {formatYen(p.budgetGrossProfit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`font-semibold ${p.actualGrossProfit < p.budgetGrossProfit ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatYen(p.actualGrossProfit)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={`text-xs font-semibold ${diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {diff >= 0 ? '+' : ''}{formatYen(diff)}
                    </span>
                  </td>
                  <td className="px-4 py-3 w-40">
                    <div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isOver ? 'bg-red-600' : overPace ? 'bg-red-400' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, consumptionRate)}%` }}
                        />
                      </div>
                      <p className={`text-xs mt-0.5 tabular-nums ${isOver ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                        {isOver
                          ? `${consumptionRate - 100}%オーバー`
                          : `残 ${budgetRemainRate}%`}
                      </p>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { ProjectProfit };

export const MOCK_PROJECT_PROFITS: ProjectProfit[] = [
  {
    id: 'pp1',
    name: '基幹システム開発',
    budgetHours: 200,
    actualHours: 186,
    budgetCost: 2000000,
    actualCost: 1860000,
    revenue: 3500000,
    budgetGrossProfit: 1500000,
    actualGrossProfit: 1640000,
    completion: 75,
  },
  {
    id: 'pp2',
    name: 'ECサイトリニューアル',
    budgetHours: 120,
    actualHours: 115,
    budgetCost: 1200000,
    actualCost: 1150000,
    revenue: 2000000,
    budgetGrossProfit: 800000,
    actualGrossProfit: 850000,
    completion: 60,
  },
  {
    id: 'pp3',
    name: '社内DXツール導入支援',
    budgetHours: 80,
    actualHours: 74,
    budgetCost: 800000,
    actualCost: 740000,
    revenue: 1200000,
    budgetGrossProfit: 400000,
    actualGrossProfit: 460000,
    completion: 90,
  },
  {
    id: 'pp4',
    name: '採用管理システム',
    budgetHours: 100,
    actualHours: 68,
    budgetCost: 1000000,
    actualCost: 680000,
    revenue: 1500000,
    budgetGrossProfit: 500000,
    actualGrossProfit: 280000,
    completion: 30,
  },
];
