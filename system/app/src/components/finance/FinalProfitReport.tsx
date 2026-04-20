'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

type FinalProfit = {
  dealId: string;
  dealName: string;
  clientName: string;
  estimatedRevenue: number;
  actualRevenue: number;
  estimatedCost: number;
  actualCost: number;
  estimatedGrossProfit: number;
  actualGrossProfit: number;
  estimatedGrossMargin: number;
  actualGrossMargin: number;
  variance: number;
  completedAt: string;
  lessons?: string;
};

type Props = {
  report: FinalProfit;
  onSave?: (lessons: string) => void;
};

const MOCK_HISTORY: FinalProfit[] = [
  {
    dealId: 'deal-001',
    dealName: 'SaaSプラットフォーム開発',
    clientName: 'トライポット株式会社',
    estimatedRevenue: 6500000,
    actualRevenue: 6500000,
    estimatedCost: 3510000,
    actualCost: 3900000,
    estimatedGrossProfit: 2990000,
    actualGrossProfit: 2600000,
    estimatedGrossMargin: 46,
    actualGrossMargin: 40,
    variance: -390000,
    completedAt: '2026-03-31',
    lessons: '開発工数が要件追加により20%増加。仕様確定フェーズの精度向上が必要。',
  },
  {
    dealId: 'deal-002',
    dealName: 'リスク管理ダッシュボード',
    clientName: '東海ファイナンス株式会社',
    estimatedRevenue: 5800000,
    actualRevenue: 5800000,
    estimatedCost: 3132000,
    actualCost: 2900000,
    estimatedGrossProfit: 2668000,
    actualGrossProfit: 2900000,
    estimatedGrossMargin: 46,
    actualGrossMargin: 50,
    variance: 232000,
    completedAt: '2026-02-28',
    lessons: '要件が明確でスコープ変更なし。フレームワーク再利用で工数削減できた。',
  },
  {
    dealId: 'deal-003',
    dealName: '内部管理ツール開発',
    clientName: '愛知県信用金庫',
    estimatedRevenue: 2100000,
    actualRevenue: 2100000,
    estimatedCost: 1134000,
    actualCost: 1260000,
    estimatedGrossProfit: 966000,
    actualGrossProfit: 840000,
    estimatedGrossMargin: 46,
    actualGrossMargin: 40,
    variance: -126000,
    completedAt: '2026-01-31',
    lessons: 'セキュリティ要件が後出しで追加。金融系は初回ヒアリングを徹底する。',
  },
];

function yen(v: number): string {
  if (Math.abs(v) >= 10000) return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
  return `¥${v.toLocaleString('ja-JP')}`;
}

function VarianceBar({ variance, estimated }: { variance: number; estimated: number }) {
  const pct = Math.abs(variance / estimated) * 100;
  const clampedPct = Math.min(pct, 100);
  const positive = variance >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full ${positive ? 'bg-blue-600' : 'bg-red-600'}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
      <span className={`text-sm font-semibold tabular-nums ${positive ? 'text-blue-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{yen(variance)}
      </span>
    </div>
  );
}

export function FinalProfitReport({ report, onSave }: Props) {
  const [lessons, setLessons] = useState(report.lessons ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave?.(lessons);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const rows = [
    {
      label: '売上',
      estimated: report.estimatedRevenue,
      actual: report.actualRevenue,
      variance: report.actualRevenue - report.estimatedRevenue,
    },
    {
      label: 'コスト',
      estimated: report.estimatedCost,
      actual: report.actualCost,
      variance: report.actualCost - report.estimatedCost,
      invertColor: true,
    },
    {
      label: '粗利',
      estimated: report.estimatedGrossProfit,
      actual: report.actualGrossProfit,
      variance: report.variance,
      bold: true,
    },
  ];

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{report.dealName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{report.clientName} ・ 完了 {report.completedAt}</p>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              report.variance >= 0
                ? 'bg-blue-50 text-blue-600 border border-blue-200'
                : 'bg-red-50 text-red-600 border border-red-200'
            }`}
          >
            {report.variance >= 0 ? '粗利改善' : '粗利悪化'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['項目', '見積', '実績', '粗利率（見積）', '粗利率（実績）', '差異'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-right first:text-left whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const varPositive = row.invertColor ? row.variance <= 0 : row.variance >= 0;
              return (
                <tr key={row.label} className={`hover:bg-gray-50 ${row.bold ? 'bg-gray-50' : ''}`}>
                  <td className={`px-4 py-3 text-left whitespace-nowrap ${row.bold ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-500 whitespace-nowrap">
                    {yen(row.estimated)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900 whitespace-nowrap">
                    {yen(row.actual)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500 whitespace-nowrap">
                    {row.label === '粗利' ? `${report.estimatedGrossMargin}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold whitespace-nowrap">
                    {row.label === '粗利' ? (
                      <span className={report.actualGrossMargin >= report.estimatedGrossMargin ? 'text-blue-600' : 'text-red-600'}>
                        {report.actualGrossMargin}%
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {row.variance !== 0 && (
                      <span className={`text-sm font-semibold tabular-nums ${varPositive ? 'text-blue-600' : 'text-red-600'}`}>
                        {row.variance > 0 ? '+' : ''}{yen(row.variance)}
                      </span>
                    )}
                    {row.variance === 0 && <span className="text-gray-500">±0</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-4 border-t border-gray-200">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
          学んだこと（次の見積精度向上のために）
        </label>
        <textarea
          value={lessons}
          onChange={(e) => setLessons(e.target.value)}
          rows={3}
          className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
          placeholder="例: 開発工数が想定より増加した原因、次回改善点など"
        />
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700"
          >
            保存
          </button>
          {saved && <span className="text-xs text-green-700 font-semibold">保存しました</span>}
        </div>
      </div>
    </section>
  );
}

export function FinalProfitHistory() {
  const [records, setRecords] = usePersistedState<FinalProfit[]>('finance_final_profit', MOCK_HISTORY);
  const [selected, setSelected] = useState<string>(MOCK_HISTORY[0].dealId);

  const current = records.find((r) => r.dealId === selected) ?? records[0];

  function handleSave(dealId: string, lessons: string) {
    setRecords(records.map((r) => (r.dealId === dealId ? { ...r, lessons } : r)));
  }

  return (
    <div className="space-y-4">
      <section className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-sm font-semibold text-gray-900">案件完了 粗利確定履歴</p>
          <p className="text-xs text-gray-500 mt-0.5">完了案件の見積 vs 実績比較</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['案件名', '完了日', '実績粗利', '実績粗利率', '差異', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr
                  key={r.dealId}
                  className={`hover:bg-gray-50 cursor-pointer ${selected === r.dealId ? 'bg-blue-50' : ''}`}
                  onClick={() => setSelected(r.dealId)}
                >
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900 whitespace-nowrap">{r.dealName}</p>
                    <p className="text-xs text-gray-500">{r.clientName}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.completedAt}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums whitespace-nowrap">
                    {yen(r.actualGrossProfit)}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums whitespace-nowrap">
                    <span className={r.actualGrossMargin >= r.estimatedGrossMargin ? 'text-blue-600' : 'text-red-600'}>
                      {r.actualGrossMargin}%
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <VarianceBar variance={r.variance} estimated={r.estimatedGrossProfit} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-blue-600 font-semibold">詳細</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <FinalProfitReport
        report={current}
        onSave={(lessons) => handleSave(current.dealId, lessons)}
      />
    </div>
  );
}
