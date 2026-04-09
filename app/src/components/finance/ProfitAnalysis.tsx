'use client';

import { useState } from 'react';

type ProfitByType = {
  type: string;
  dealCount: number;
  totalRevenue: number;
  totalCost: number;
  avgGrossMargin: number;
  avgDuration: number;
  winRate: number;
};

type Props = {
  data: ProfitByType[];
};

const MOCK_DATA: ProfitByType[] = [
  {
    type: 'LP制作',
    dealCount: 8,
    totalRevenue: 12400000,
    totalCost: 4960000,
    avgGrossMargin: 60,
    avgDuration: 21,
    winRate: 78,
  },
  {
    type: 'コンサル',
    dealCount: 5,
    totalRevenue: 9500000,
    totalCost: 3990000,
    avgGrossMargin: 58,
    avgDuration: 90,
    winRate: 65,
  },
  {
    type: '保守・運用',
    dealCount: 12,
    totalRevenue: 14400000,
    totalCost: 6480000,
    avgGrossMargin: 55,
    avgDuration: 365,
    winRate: 90,
  },
  {
    type: 'Webシステム',
    dealCount: 9,
    totalRevenue: 52200000,
    totalCost: 28200000,
    avgGrossMargin: 46,
    avgDuration: 120,
    winRate: 55,
  },
  {
    type: 'スマホアプリ',
    dealCount: 4,
    totalRevenue: 18800000,
    totalCost: 11280000,
    avgGrossMargin: 40,
    avgDuration: 150,
    winRate: 45,
  },
];

function yen(v: number): string {
  if (v >= 100000000) return `¥${(v / 100000000).toFixed(1)}億`;
  if (v >= 10000) return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

type SortKey = 'avgGrossMargin' | 'totalRevenue' | 'dealCount' | 'winRate';

function buildAiComment(data: ProfitByType[]): string {
  const sorted = [...data].sort((a, b) => b.avgGrossMargin - a.avgGrossMargin);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  const longDuration = [...data].sort((a, b) => b.avgDuration - a.avgDuration)[0];
  return `${top.type}は粗利率${top.avgGrossMargin}%と最も収益性が高い。${bottom.type}は粗利率${bottom.avgGrossMargin}%と最も低く、${longDuration.type}は平均工期${longDuration.avgDuration}日と長期化傾向にある。工期管理と見積精度の向上が利益率改善のカギ。`;
}

function MarginBar({ value }: { value: number }) {
  const color = value >= 55 ? 'bg-blue-600' : value >= 45 ? 'bg-gray-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min((value / 70) * 100, 100)}%` }} />
      </div>
      <span className={`text-sm font-semibold tabular-nums ${value >= 55 ? 'text-blue-600' : value >= 45 ? 'text-gray-900' : 'text-red-600'}`}>
        {value}%
      </span>
    </div>
  );
}

export function ProfitAnalysis({ data: initialData }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('avgGrossMargin');
  const sorted = [...initialData].sort((a, b) => b[sortKey] - a[sortKey]);
  const aiComment = buildAiComment(initialData);

  const totalRevenue = initialData.reduce((s, d) => s + d.totalRevenue, 0);
  const totalDeals = initialData.reduce((s, d) => s + d.dealCount, 0);
  const avgMarginAll = Math.round(
    initialData.reduce((s, d) => s + d.avgGrossMargin * d.dealCount, 0) / totalDeals
  );

  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'avgGrossMargin', label: '粗利率順' },
    { key: 'totalRevenue', label: '売上順' },
    { key: 'dealCount', label: '件数順' },
    { key: 'winRate', label: '受注率順' },
  ];

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">案件タイプ別採算分析</p>
            <p className="text-xs text-gray-500 mt-0.5">どのタイプの案件が儲かるかを可視化</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">AI分析</span>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-200 border-b border-gray-200">
        {[
          { label: '総売上', value: yen(totalRevenue) },
          { label: '総案件数', value: `${totalDeals}件` },
          { label: '平均粗利率', value: `${avgMarginAll}%` },
        ].map((s) => (
          <div key={s.label} className="px-4 py-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="px-5 py-3 border-b border-gray-200 bg-blue-50">
        <p className="text-xs font-semibold text-gray-500 mb-1">AIコメント</p>
        <p className="text-xs font-semibold text-gray-900">{aiComment}</p>
      </div>

      <div className="px-5 py-3 border-b border-gray-200 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-gray-500">並び替え:</span>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={`text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
              sortKey === opt.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['案件タイプ', '件数', '総売上', '粗利率', '平均工期', '受注率'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((row, idx) => (
              <tr key={row.type} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {idx === 0 && sortKey === 'avgGrossMargin' && (
                      <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        最高収益
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">{row.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-500 tabular-nums">{row.dealCount}件</td>
                <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                  {yen(row.totalRevenue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <MarginBar value={row.avgGrossMargin} />
                </td>
                <td className="px-4 py-3 font-semibold text-gray-500 tabular-nums whitespace-nowrap">
                  {row.avgDuration}日
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`text-sm font-semibold tabular-nums ${row.winRate >= 70 ? 'text-blue-600' : row.winRate >= 50 ? 'text-gray-900' : 'text-red-600'}`}>
                    {row.winRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProfitAnalysisDemo() {
  return <ProfitAnalysis data={[]} />;
}
