'use client';

import { useState, useMemo } from 'react';

type TaskForOptimize = {
  id: string;
  name: string;
  estimatedHours: number;
  category: string;
};

type Props = {
  tasks: TaskForOptimize[];
  unitPrice: number;
};

export const MOCK_TASKS_FOR_OPTIMIZE: TaskForOptimize[] = [
  { id: 'opt1', name: 'ユーザー認証CRUD', estimatedHours: 40, category: 'development' },
  { id: 'opt2', name: 'ユニットテスト作成', estimatedHours: 24, category: 'testing' },
  { id: 'opt3', name: 'API仕様書作成', estimatedHours: 16, category: 'document' },
  { id: 'opt4', name: 'ダッシュボードUI実装', estimatedHours: 32, category: 'ui' },
  { id: 'opt5', name: '権限管理ロジック', estimatedHours: 48, category: 'business_logic' },
];

const AI_REDUCTION_MAP: Record<string, number> = {
  development: 0.80,
  testing: 0.60,
  document: 0.50,
  template: 0.70,
};

const HUMAN_ONLY_CATEGORIES = new Set(['ui', 'business_logic', 'customer_facing', 'negotiation']);

function getOptimizedHours(task: TaskForOptimize): { hours: number; isAi: boolean; reductionRate: number } {
  if (HUMAN_ONLY_CATEGORIES.has(task.category)) {
    return { hours: task.estimatedHours, isAi: false, reductionRate: 0 };
  }

  const rate = AI_REDUCTION_MAP[task.category];
  if (rate !== undefined) {
    const reduced = Math.round(task.estimatedHours * (1 - rate));
    return { hours: reduced, isAi: true, reductionRate: rate };
  }

  return { hours: task.estimatedHours, isAi: false, reductionRate: 0 };
}

export function AiWorkOptimizer({ tasks, unitPrice }: Props) {
  const [optimized, setOptimized] = useState(false);

  const hourlyRate = unitPrice / 160;

  const results = useMemo(() => {
    return tasks.map((task) => {
      const opt = getOptimizedHours(task);
      return { ...task, ...opt };
    });
  }, [tasks]);

  const totalOriginal = results.reduce((s, r) => s + r.estimatedHours, 0);
  const totalOptimized = results.reduce((s, r) => s + r.hours, 0);
  const totalReduction = totalOriginal - totalOptimized;
  const reductionRate = totalOriginal > 0 ? Math.round((totalReduction / totalOriginal) * 100) : 0;
  const costSaving = Math.round(totalReduction * hourlyRate);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white w-full max-w-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-gray-900">AI工数最適化</span>
      </div>

      {!optimized ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-gray-500">
            タスク一覧を分析し、AIで自動化できる工数を算出します。
          </p>
          <button
            onClick={() => setOptimized(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            AIで工数を最適化
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-3 font-medium text-gray-500 text-xs">タスク</th>
                  <th className="text-right py-2 px-2 font-medium text-gray-500 text-xs whitespace-nowrap">元工数</th>
                  <th className="text-right py-2 pl-2 font-medium text-gray-500 text-xs whitespace-nowrap">最適化</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 text-gray-900">{result.name}</td>
                    <td className="py-2 px-2 text-right text-gray-500 tabular-nums">
                      {result.estimatedHours}h
                    </td>
                    <td className="py-2 pl-2 text-right tabular-nums">
                      {result.isAi ? (
                        <span className="text-blue-600 font-medium">
                          {result.hours}h{' '}
                          <span className="text-base leading-none" aria-label="AI自動化">🤖</span>
                        </span>
                      ) : (
                        <span className="text-gray-900">
                          {result.hours}h{' '}
                          <span className="text-base leading-none" aria-label="人間">👤</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td className="pt-2 pr-3 font-semibold text-gray-900">合計</td>
                  <td className="pt-2 px-2 text-right font-semibold text-gray-900 tabular-nums">
                    {totalOriginal}h
                  </td>
                  <td className="pt-2 pl-2 text-right font-semibold text-blue-600 tabular-nums">
                    {totalOptimized}h
                  </td>
                </tr>
                <tr>
                  <td className="pt-1 pr-3 text-xs text-gray-500">削減率</td>
                  <td />
                  <td className="pt-1 pl-2 text-right text-xs font-semibold text-blue-600 tabular-nums">
                    {reductionRate}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-blue-700">予算削減効果</span>
              <span className="text-lg font-semibold text-blue-700">
                ¥{costSaving.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-blue-500 mt-0.5">
              削減工数 {totalReduction}h × 時間単価 ¥{Math.round(hourlyRate).toLocaleString()}
            </p>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setOptimized(false)}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300 rounded transition-colors"
            >
              リセット
            </button>
          </div>
        </>
      )}
    </div>
  );
}
