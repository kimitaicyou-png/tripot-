'use client';

import { useState } from 'react';

type EstimateVsActual = {
  dealId: string;
  dealName: string;
  estimatedHours: number;
  actualHours: number;
  accuracy: number;
  completedAt: string;
};

type Props = {
  records: EstimateVsActual[];
};

const MOCK_RECORDS: EstimateVsActual[] = [
  {
    dealId: 'deal-001',
    dealName: 'SaaSプラットフォーム開発',
    estimatedHours: 520,
    actualHours: 624,
    accuracy: 120,
    completedAt: '2026-03-31',
  },
  {
    dealId: 'deal-002',
    dealName: 'リスク管理ダッシュボード',
    estimatedHours: 480,
    actualHours: 432,
    accuracy: 90,
    completedAt: '2026-02-28',
  },
  {
    dealId: 'deal-003',
    dealName: '内部管理ツール開発',
    estimatedHours: 190,
    actualHours: 228,
    accuracy: 120,
    completedAt: '2026-01-31',
  },
  {
    dealId: 'deal-004',
    dealName: '電子カルテAPI連携',
    estimatedHours: 720,
    actualHours: 792,
    accuracy: 110,
    completedAt: '2025-12-31',
  },
  {
    dealId: 'deal-005',
    dealName: '学習管理システム',
    estimatedHours: 840,
    actualHours: 882,
    accuracy: 105,
    completedAt: '2025-11-30',
  },
  {
    dealId: 'deal-006',
    dealName: 'QC管理システム追加開発',
    estimatedHours: 200,
    actualHours: 230,
    accuracy: 115,
    completedAt: '2025-10-31',
  },
];

function buildAiComment(records: EstimateVsActual[]): string {
  const avgAccuracy = Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length);
  const overCount = records.filter((r) => r.accuracy > 100).length;
  const overRate = Math.round((overCount / records.length) * 100);
  if (avgAccuracy > 110) {
    return `平均精度${avgAccuracy}% = 約${avgAccuracy - 100}%の過小見積もり傾向。${overRate}%の案件で工数超過が発生。次回の見積もりには1.${String(avgAccuracy - 100).padStart(2, '0')}倍の係数を適用することを推奨。`;
  }
  if (avgAccuracy > 100) {
    return `平均精度${avgAccuracy}% = わずかな過小見積もり傾向。全体的には精度が高い水準。継続的な記録と振り返りで更なる精度向上が可能。`;
  }
  return `平均精度${avgAccuracy}% = 見積もり通りまたは余裕を持った工数管理ができている。この水準を維持することが重要。`;
}

function AccuracyBar({ accuracy }: { accuracy: number }) {
  const over = accuracy > 100;
  const pct = Math.min(Math.abs(accuracy - 100) / 50 * 100, 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
        {over ? (
          <div className="absolute right-0 h-2 bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
        ) : (
          <div className="absolute left-0 h-2 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
        )}
      </div>
    </div>
  );
}

export function EstimateAccuracy({ records }: Props) {
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...records].sort((a, b) =>
    sortAsc ? a.accuracy - b.accuracy : b.accuracy - a.accuracy
  );

  const avgAccuracy = Math.round(records.reduce((s, r) => s + r.accuracy, 0) / records.length);
  const overCount = records.filter((r) => r.accuracy > 100).length;
  const underCount = records.filter((r) => r.accuracy <= 100).length;
  const aiComment = buildAiComment(records);

  const chronological = [...records].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
  const maxAcc = Math.max(...records.map((r) => r.accuracy));

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">見積精度トラッキング</p>
            <p className="text-xs text-gray-500 mt-0.5">見積工数 vs 実績工数の比較・傾向分析</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">AI分析</span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        {[
          { label: '平均精度', value: `${avgAccuracy}%`, color: avgAccuracy > 110 ? 'text-red-600' : avgAccuracy > 100 ? 'text-gray-900' : 'text-blue-600' },
          { label: '工数超過件数', value: `${overCount}件`, color: overCount > 0 ? 'text-red-600' : 'text-gray-900' },
          { label: '余裕あり件数', value: `${underCount}件`, color: 'text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-lg font-semibold tabular-nums mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-b border-gray-200 bg-blue-50">
        <p className="text-xs font-semibold text-gray-500 mb-1">AIコメント</p>
        <p className="text-xs font-semibold text-gray-900">{aiComment}</p>
      </div>

      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">精度推移（時系列）</p>
        <div className="space-y-2">
          {chronological.map((r) => {
            const over = r.accuracy > 100;
            const barWidth = Math.min((r.accuracy / (maxAcc * 1.1)) * 100, 100);
            return (
              <div key={r.dealId} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-20 shrink-0 truncate">{r.completedAt.slice(0, 7)}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${over ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <span className={`text-sm font-semibold tabular-nums w-12 text-right ${over ? 'text-red-600' : 'text-blue-600'}`}>
                  {r.accuracy}%
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-red-500 rounded-full" />
            <span className="text-xs text-gray-500">工数超過（100%超）</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-blue-500 rounded-full" />
            <span className="text-xs text-gray-500">余裕あり（100%以下）</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">案件名</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right whitespace-nowrap">見積工数</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right whitespace-nowrap">実績工数</th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right whitespace-nowrap">差分</th>
              <th
                className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right whitespace-nowrap cursor-pointer hover:text-gray-900"
                onClick={() => setSortAsc(!sortAsc)}
              >
                精度 {sortAsc ? '▲' : '▼'}
              </th>
              <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">完了日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((r) => {
              const over = r.accuracy > 100;
              const diffHours = r.actualHours - r.estimatedHours;
              return (
                <tr key={r.dealId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 whitespace-nowrap">{r.dealName}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-500 tabular-nums whitespace-nowrap">
                    {r.estimatedHours}h
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {r.actualHours}h
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                    <span className={`font-semibold ${over ? 'text-red-600' : 'text-blue-600'}`}>
                      {diffHours > 0 ? '+' : ''}{diffHours}h
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <AccuracyBar accuracy={r.accuracy} />
                      <span className={`text-sm font-semibold tabular-nums ${over ? 'text-red-600' : 'text-blue-600'}`}>
                        {r.accuracy}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.completedAt}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 text-xs font-semibold text-gray-500">平均</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-500 tabular-nums">
                {Math.round(records.reduce((s, r) => s + r.estimatedHours, 0) / records.length)}h
              </td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums">
                {Math.round(records.reduce((s, r) => s + r.actualHours, 0) / records.length)}h
              </td>
              <td className="px-4 py-3" />
              <td className="px-4 py-3 text-right font-semibold tabular-nums">
                <span className={avgAccuracy > 100 ? 'text-red-600' : 'text-blue-600'}>{avgAccuracy}%</span>
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function EstimateAccuracyDemo() {
  return <EstimateAccuracy records={MOCK_RECORDS} />;
}
