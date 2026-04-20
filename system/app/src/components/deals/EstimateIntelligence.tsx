'use client';

import { useState } from 'react';

type EstimateRecord = {
  id: string;
  dealName: string;
  clientName: string;
  industry: string;
  totalAmount: number;
  items: { name: string; amount: number; manMonths?: number }[];
  costBudget: number;
  grossMarginRate: number;
  result: 'won' | 'lost' | 'pending';
  createdAt: string;
};

const MOCK_ESTIMATES: EstimateRecord[] = [
  {
    id: 'e01',
    dealName: 'SaaSプラットフォーム開発',
    clientName: 'トライポット株式会社',
    industry: '製造業',
    totalAmount: 6500000,
    items: [
      { name: '要件定義', amount: 800000, manMonths: 1 },
      { name: '基本設計', amount: 900000, manMonths: 1 },
      { name: '詳細設計・開発', amount: 4500000, manMonths: 6 },
      { name: 'テスト', amount: 300000, manMonths: 0.5 },
    ],
    costBudget: 3510000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-03-15',
  },
  {
    id: 'e02',
    dealName: '生産管理DX',
    clientName: '株式会社名港工業',
    industry: '製造業',
    totalAmount: 9200000,
    items: [
      { name: '要件定義', amount: 1600000, manMonths: 2 },
      { name: '基本設計', amount: 1800000, manMonths: 2 },
      { name: '詳細設計・開発', amount: 5400000, manMonths: 7.2 },
      { name: 'テスト', amount: 400000, manMonths: 0.7 },
    ],
    costBudget: 4968000,
    grossMarginRate: 46,
    result: 'lost',
    createdAt: '2026-02-28',
  },
  {
    id: 'e03',
    dealName: '電子カルテAPI連携',
    clientName: '株式会社中京メディカル',
    industry: '医療',
    totalAmount: 7800000,
    items: [
      { name: '要件定義', amount: 900000, manMonths: 1 },
      { name: '基本設計', amount: 1000000, manMonths: 1 },
      { name: '詳細設計・開発', amount: 5100000, manMonths: 6 },
      { name: 'テスト・バリデーション', amount: 800000, manMonths: 1 },
    ],
    costBudget: 4212000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-03-01',
  },
  {
    id: 'e04',
    dealName: '病院向け患者管理アプリ',
    clientName: '医療法人碧会',
    industry: '医療',
    totalAmount: 5200000,
    items: [
      { name: '要件定義', amount: 900000, manMonths: 1 },
      { name: '詳細設計・開発', amount: 3500000, manMonths: 4.1 },
      { name: 'テスト', amount: 800000, manMonths: 1 },
    ],
    costBudget: 2808000,
    grossMarginRate: 46,
    result: 'pending',
    createdAt: '2026-03-25',
  },
  {
    id: 'e05',
    dealName: '学習管理システム',
    clientName: '名古屋市教育委員会',
    industry: '教育・官公庁',
    totalAmount: 8900000,
    items: [
      { name: '要件定義', amount: 1700000, manMonths: 2 },
      { name: '基本設計', amount: 1900000, manMonths: 2 },
      { name: '詳細設計・開発', amount: 4800000, manMonths: 6 },
      { name: 'テスト・受入支援', amount: 500000, manMonths: 0.7 },
    ],
    costBudget: 4806000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-03-10',
  },
  {
    id: 'e06',
    dealName: 'eラーニングプラットフォーム',
    clientName: '株式会社名古屋教育出版',
    industry: '教育・官公庁',
    totalAmount: 4100000,
    items: [
      { name: '要件定義', amount: 850000, manMonths: 1 },
      { name: '詳細設計・開発', amount: 2900000, manMonths: 3.9 },
      { name: 'テスト', amount: 350000, manMonths: 0.5 },
    ],
    costBudget: 2214000,
    grossMarginRate: 46,
    result: 'lost',
    createdAt: '2026-02-10',
  },
  {
    id: 'e07',
    dealName: '内部管理ツール開発',
    clientName: '愛知県信用金庫',
    industry: '金融',
    totalAmount: 2100000,
    items: [
      { name: '要件定義', amount: 400000, manMonths: 0.4 },
      { name: '詳細設計・開発', amount: 1400000, manMonths: 1.6 },
      { name: 'テスト・セキュリティ検証', amount: 300000, manMonths: 0.35 },
    ],
    costBudget: 1134000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-02-20',
  },
  {
    id: 'e08',
    dealName: 'リスク管理ダッシュボード',
    clientName: '東海ファイナンス株式会社',
    industry: '金融',
    totalAmount: 5800000,
    items: [
      { name: '要件定義', amount: 1000000, manMonths: 1 },
      { name: '基本設計', amount: 1100000, manMonths: 1 },
      { name: '詳細設計・開発', amount: 3200000, manMonths: 3.6 },
      { name: 'テスト・セキュリティ検証', amount: 500000, manMonths: 0.59 },
    ],
    costBudget: 3132000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-01-15',
  },
  {
    id: 'e09',
    dealName: 'QC管理システム追加開発',
    clientName: '愛知トヨタ協力工場',
    industry: '製造業',
    totalAmount: 1800000,
    items: [
      { name: '詳細設計・開発', amount: 1500000, manMonths: 2 },
      { name: 'テスト', amount: 300000, manMonths: 0.5 },
    ],
    costBudget: 972000,
    grossMarginRate: 46,
    result: 'won',
    createdAt: '2026-03-05',
  },
  {
    id: 'e10',
    dealName: 'IoT農業センサー管理',
    clientName: '有限会社スマート農業',
    industry: 'その他',
    totalAmount: 3300000,
    items: [
      { name: '要件定義', amount: 600000, manMonths: 0.75 },
      { name: '詳細設計・開発', amount: 2400000, manMonths: 3.2 },
      { name: 'テスト', amount: 300000, manMonths: 0.5 },
    ],
    costBudget: 1782000,
    grossMarginRate: 46,
    result: 'lost',
    createdAt: '2026-01-30',
  },
];

const CURRENT_MONTH = '2026-04';

function yen(v: number): string {
  return `¥${(v / 10000).toLocaleString('ja-JP')}万`;
}

type IndustryStat = {
  industry: string;
  total: number;
  won: number;
  winRate: number;
  avgMargin: number;
};

function buildIndustryStats(records: EstimateRecord[]): IndustryStat[] {
  const map = new Map<string, { total: number; won: number; margins: number[] }>();
  records.filter((r) => r.result !== 'pending').forEach((r) => {
    const existing = map.get(r.industry) ?? { total: 0, won: 0, margins: [] };
    existing.total++;
    if (r.result === 'won') {
      existing.won++;
      existing.margins.push(r.grossMarginRate);
    }
    map.set(r.industry, existing);
  });
  return Array.from(map.entries())
    .map(([industry, s]) => ({
      industry,
      total: s.total,
      won: s.won,
      winRate: s.total > 0 ? Math.round((s.won / s.total) * 100) : 0,
      avgMargin: s.margins.length > 0 ? Math.round(s.margins.reduce((a, b) => a + b, 0) / s.margins.length) : 0,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

function buildMonthlyMargins(records: EstimateRecord[]): { month: string; avg: number }[] {
  const map = new Map<string, number[]>();
  records.filter((r) => r.result === 'won').forEach((r) => {
    const month = r.createdAt.slice(0, 7);
    const arr = map.get(month) ?? [];
    arr.push(r.grossMarginRate);
    map.set(month, arr);
  });
  return Array.from(map.entries())
    .map(([month, margins]) => ({
      month,
      avg: Math.round(margins.reduce((a, b) => a + b, 0) / margins.length),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

function getBestIndustryRecommendation(stats: IndustryStat[]): string {
  const best = stats[0];
  if (!best) return '';
  return `${best.industry}業界・同規模案件では粗利${best.avgMargin}%以上が受注率${best.winRate}%と最も高くなっています。`;
}

type TabKey = 'summary' | 'industry' | 'margin';

const RESULT_BADGE: Record<string, string> = {
  won: 'bg-blue-50 text-blue-600',
  lost: 'bg-gray-100 text-gray-500',
  pending: 'bg-gray-50 text-gray-500',
};
const RESULT_LABEL: Record<string, string> = {
  won: '受注',
  lost: '失注',
  pending: '保留中',
};

export function EstimateIntelligence() {
  const [tab, setTab] = useState<TabKey>('summary');

  const thisMonth = MOCK_ESTIMATES.filter((r) => r.createdAt.startsWith(CURRENT_MONTH));
  const resolved = MOCK_ESTIMATES.filter((r) => r.result !== 'pending');
  const wonAll = MOCK_ESTIMATES.filter((r) => r.result === 'won');
  const winRateAll = resolved.length > 0 ? Math.round((wonAll.length / resolved.length) * 100) : 0;
  const avgMarginAll =
    wonAll.length > 0
      ? Math.round(wonAll.reduce((s, r) => s + r.grossMarginRate, 0) / wonAll.length)
      : 0;

  const industryStats = buildIndustryStats(MOCK_ESTIMATES);
  const monthlyMargins = buildMonthlyMargins(MOCK_ESTIMATES);
  const recommendation = getBestIndustryRecommendation(industryStats);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'summary', label: 'サマリー' },
    { key: 'industry', label: '業種別' },
    { key: 'margin', label: '粗利推移' },
  ];

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">見積もりインテリジェンス</p>
            <p className="text-xs text-gray-500 mt-0.5">過去見積もりの傾向分析・AI推奨</p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
            AI分析
          </span>
        </div>
      </div>

      <div className="flex border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors ${
              tab === t.key
                ? 'text-gray-900 border-b-2 border-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-5">
        {tab === 'summary' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '今月の見積もり', value: `${thisMonth.length}件` },
                { label: '累計見積もり', value: `${MOCK_ESTIMATES.length}件` },
                { label: '受注率（全体）', value: `${winRateAll}%` },
                { label: '平均粗利率（受注）', value: `${avgMarginAll}%` },
              ].map((k) => (
                <div key={k.label} className="border border-gray-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-gray-500 mb-1">{k.label}</p>
                  <p className="text-xl font-semibold text-gray-900 tabular-nums">{k.value}</p>
                </div>
              ))}
            </div>

            <div className="border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">AI推奨</p>
              <p className="text-sm font-semibold text-gray-900">{recommendation}</p>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">直近の見積もり</p>
              <div className="space-y-2">
                {MOCK_ESTIMATES.slice(0, 5).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{r.dealName}</p>
                      <p className="text-xs text-gray-500">{r.clientName} ・ {r.industry}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <span className="text-sm font-semibold text-gray-900 tabular-nums">{yen(r.totalAmount)}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${RESULT_BADGE[r.result]}`}>
                        {RESULT_LABEL[r.result]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'industry' && (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['業種', '件数', '受注', '受注率', '平均粗利率'].map((h) => (
                    <th
                      key={h}
                      className="py-2 pb-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right first:text-left"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {industryStats.map((s) => (
                  <tr key={s.industry} className="hover:bg-gray-50">
                    <td className="py-2.5 text-sm font-semibold text-gray-900">{s.industry}</td>
                    <td className="py-2.5 text-sm font-semibold text-gray-500 text-right tabular-nums">{s.total}</td>
                    <td className="py-2.5 text-sm font-semibold text-gray-900 text-right tabular-nums">{s.won}</td>
                    <td className="py-2.5 text-sm font-semibold text-blue-600 text-right tabular-nums">{s.winRate}%</td>
                    <td className="py-2.5 text-sm font-semibold text-gray-900 text-right tabular-nums">{s.avgMargin}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-3">※ 保留中の案件は集計から除外</p>
          </div>
        )}

        {tab === 'margin' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">月別 平均粗利率（受注済み）</p>
              <div className="space-y-2">
                {monthlyMargins.map((m) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min((m.avg / 60) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 tabular-nums w-10 text-right">{m.avg}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg px-4 py-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">AI推奨</p>
              <p className="text-sm font-semibold text-gray-900">
                受注案件の平均粗利率は{avgMarginAll}%。製造業・金融業種では粗利45%以上を維持することで受注率が安定します。
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
