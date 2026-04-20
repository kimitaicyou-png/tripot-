'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { loadProductionCards, fetchProductionCards, type ProductionCard, type ProductionAction } from '@/lib/productionCards';
import { MEMBERS as ALL_MEMBERS_RAW } from '@/lib/currentMember';
import { VENDORS } from '@/lib/data/vendors';
import { loadAllDeals, calcDealKpi, fetchDeals } from '@/lib/dealsStore';
import { formatYen } from '@/lib/format';
import { syncBudgetPlan } from '@/lib/budget';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/deals/constants';
import type { Stage } from '@/lib/deals/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { PersonalPLTable, MOCK_MEMBER_PL } from '@/components/weekly/PersonalPLTable';

// ─── 型定義 ──────────────────────────────────────────────────

type Risk = 'none' | 'low' | 'medium' | 'high';

// ─── 仮データ ────────────────────────────────────────────────



const PHASE_LABELS_W: Record<string, string> = {
  kickoff: 'キックオフ', requirements: '要件', design: '設計', development: '開発', test: 'テスト', release: 'リリース', operation: '運用',
};

function useLiveWeeklyData() {
  const [deals, setDealsW] = useState(() => loadAllDeals());
  useEffect(() => { fetchDeals().then((fresh) => setDealsW(fresh)); }, []);
  const [cards, setCardsW] = useState(() => loadProductionCards());
  useEffect(() => { fetchProductionCards().then(setCardsW); }, []);
  const kpi = calcDealKpi(deals);

  const activeCards = cards.filter((c) => c.status === 'active');
  const allTasks = activeCards.flatMap((c) => c.tasks);

  const TODO_DATA = allTasks.filter((t) => t.status !== 'done').slice(0, 8).map((t, i) => {
    const card = activeCards.find((c) => c.tasks.some((x) => x.id === t.id));
    const member = ALL_MEMBERS_RAW.find((m) => m.id === t.assigneeId);
    return { id: t.id || `todo_${i}`, content: `${card?.dealName ?? ''} ${t.title}`, assignee: member?.name?.split(' ')[0] ?? '未割当', done: false, carryOver: 0 };
  });

  const MEMBER_TODO_STATS = ALL_MEMBERS_RAW.map((m) => {
    const tasks = allTasks.filter((t) => t.assigneeId === m.id);
    return { name: m.name, done: tasks.filter((t) => t.status === 'done').length, undone: tasks.filter((t) => t.status !== 'done').length, carryOver: 0 };
  });

  const invoiced = deals.filter((d) => d.stage === 'invoiced' || d.stage === 'accounting');
  const paid = deals.filter((d) => d.stage === 'paid');
  const inflowExpected = invoiced.reduce((s, d) => s + d.amount, 0);
  const inflowReceived = paid.reduce((s, d) => s + d.amount, 0);
  const mr = (v: number) => Math.round(v / 10000) * 10000;

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const fmtRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const f = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    return `${f(start)}〜${f(end)}`;
  };
  const weekBuckets = [0, 1, 2, 3].map((i) => {
    const s = new Date(weekStart);
    s.setDate(weekStart.getDate() + i * 7);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    return { label: `W${i + 1} ${fmtRange(s)}`, start: s, end: e };
  });
  const invoicedDeals = deals.filter((d) => (d.stage === 'invoiced' || d.stage === 'accounting') && d.invoiceDate);
  let runningBalance = inflowReceived;
  const CF_ROLLING = weekBuckets.map((wk) => {
    const inflowOfWeek = invoicedDeals
      .filter((d) => d.invoiceDate && new Date(d.invoiceDate) >= wk.start && new Date(d.invoiceDate) <= wk.end)
      .reduce((s, d) => s + d.amount, 0);
    runningBalance += inflowOfWeek;
    return { week: wk.label, inflow: mr(inflowOfWeek), payment: 0, balance: mr(runningBalance) };
  });

  const claimDeals = deals.filter((d) => d.stage === 'claim');
  const CLAIMS = claimDeals.map((d) => ({ dealName: d.dealName, content: d.memo || 'クレーム対応中', severity: 'major' as 'minor' | 'major' | 'critical', days: 1, assignee: d.assignee.split(' ')[0], status: 'open' as 'open' | 'in_progress' | 'resolved' }));

  const sc = (stage: string) => deals.filter((d) => d.stage === stage).length;
  const orderedCount = deals.filter((d) => ['ordered','in_production','delivered','acceptance','invoiced','accounting','paid'].includes(d.stage)).length;
  const WEEKLY_TREND = [{ week: '今週', appo: sc('lead'), meeting: sc('meeting'), proposal: sc('proposal') + sc('estimate_sent'), order: orderedCount }];

  return { TODO_DATA, MEMBER_TODO_STATS, CF_ROLLING, CLAIMS, WEEKLY_TREND, kpi };
}

// ─── ユーティリティ ──────────────────────────────────────────

function man(v: number) {
  return `¥${Math.round(v / 10000).toLocaleString('ja-JP')}万`;
}

// ─── 共通コンポーネント ──────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl shadow-sm p-5 ${className}`}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous;
  if (diff === 0) return <span className="text-[11px] text-gray-500">±0</span>;
  if (diff > 0)
    return (
      <span className="text-[11px] font-semibold text-blue-600">+{diff}</span>
    );
  return <span className="text-[11px] font-semibold text-red-600">{diff}</span>;
}

// ─── 数値タブ ────────────────────────────────────────────────

function NumbersTab() {
  const [numView, setNumView] = useState<'sales' | 'production'>('sales');

  return (
    <div className="space-y-4">
      <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
        <button
          onClick={() => setNumView('sales')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] ${numView === 'sales' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-50'}`}
        >🏃 営業</button>
        <button
          onClick={() => setNumView('production')}
          className={`flex-1 px-4 py-2.5 text-sm font-semibold transition-colors active:scale-[0.98] ${numView === 'production' ? 'bg-blue-600 text-white' : 'text-gray-800 hover:bg-gray-50'}`}
        >🔧 制作</button>
      </div>

      {numView === 'sales' && <SalesNumbersView />}
      {numView === 'production' && <ProductionNumbersView />}
    </div>
  );
}

function WeeklyDealListSection({ deals }: { deals: ReturnType<typeof loadAllDeals> }) {
  const [open, setOpen] = useState(false);
  if (deals.length === 0) return null;
  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between active:scale-[0.98] transition-all"
      >
        <SectionLabel>案件一覧（{deals.length}件）</SectionLabel>
        <span className="text-xs text-gray-500 -mt-2">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['案件名', 'クライアント', '担当者', 'ステージ', '金額'].map((h) => (
                  <th key={h} className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest last:text-right whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 pr-3 font-semibold text-gray-900 text-sm">{d.dealName}</td>
                  <td className="py-2.5 pr-3 text-gray-700 text-sm">{d.clientName}</td>
                  <td className="py-2.5 pr-3 text-gray-700 text-sm whitespace-nowrap">{d.assignee}</td>
                  <td className="py-2.5 pr-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STAGE_BADGE[d.stage as Stage] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STAGE_LABEL[d.stage as Stage] ?? d.stage}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatYen(d.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={4} className="py-2.5 pr-3 font-semibold text-gray-900 text-sm">合計</td>
                <td className="py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatYen(deals.reduce((s, d) => s + d.amount, 0))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}

function SalesNumbersView() {
  const liveW = useLiveWeeklyData();
  const [deals, setDealsS] = useState(() => loadAllDeals());
  useEffect(() => { fetchDeals().then((fresh) => setDealsS(fresh)); syncBudgetPlan(); }, []);
  const [cards, setCards] = useState(() => { try { return loadProductionCards(); } catch { return []; } });
  useEffect(() => { fetchProductionCards().then(setCards); }, []);

  const dealCostById = new Map<string, number>();
  for (const c of cards) {
    const cost = c.tasks.reduce((a, t) => a + (t.estimatedCost ?? 0), 0);
    if (cost > 0) dealCostById.set(c.dealId, cost);
  }
  const kpi = calcDealKpi(deals, { dealCostById });

  const currentMonthIdx = (() => {
    const start = (() => {
      if (typeof window === 'undefined') return 4;
      try {
        const raw = localStorage.getItem('fiscal_start_month');
        const n = raw ? Number(raw) : 4;
        return Number.isInteger(n) && n >= 1 && n <= 12 ? n : 4;
      } catch { return 4; }
    })();
    return (new Date().getMonth() + 1 - start + 12) % 12;
  })();
  const budgetPlan = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('budget_plan');
      return raw ? JSON.parse(raw) as {
        segments: Array<{ values: number[] }>;
        cogs: Array<{ values: number[] }>;
        labor: Array<{ values: number[] }>;
        admin: Array<{ values: number[] }>;
      } : null;
    } catch { return null; }
  })();
  const budgetRevenue = budgetPlan ? budgetPlan.segments.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) * 10000 : 0;
  const budgetCogs = budgetPlan ? budgetPlan.cogs.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) * 10000 : 0;
  const budgetSga = budgetPlan ? (budgetPlan.labor.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) + budgetPlan.admin.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0)) * 10000 : 0;
  const budgetGross = budgetRevenue - budgetCogs;
  const budgetOp = budgetGross - budgetSga;

  const actualOp = kpi.totalGrossProfit - budgetSga;
  const remainRevenue = Math.max(0, budgetRevenue - kpi.totalRevenue);
  const remainGross = Math.max(0, budgetGross - kpi.totalGrossProfit);
  const remainOp = Math.max(0, budgetOp - actualOp);
  const achievePct = (actual: number, target: number) => target > 0 ? Math.max(0, Math.min(100, Math.round((actual / target) * 100))) : 0;
  const KPI_SUMMARY = [
    { label: '残粗利',    actual: remainGross,   target: budgetGross,   rate: achievePct(kpi.totalGrossProfit, budgetGross) },
    { label: '残営業利益', actual: remainOp,      target: budgetOp,      rate: achievePct(actualOp, budgetOp) },
    { label: '残売上',    actual: remainRevenue, target: budgetRevenue, rate: achievePct(kpi.totalRevenue, budgetRevenue) },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>経営サマリー（4月残）</SectionLabel>
        <div className="grid grid-cols-3 gap-3">
          {KPI_SUMMARY.map((k) => (
            <div key={k.label} className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">{k.label}</p>
              <p className="text-xl font-semibold text-gray-900">{man(k.actual)}</p>
              <p className="text-xs text-gray-500 mt-1">月末までに積む必要がある額</p>
              <p className="text-xs text-gray-500 mb-2">目標 {man(k.target)}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full ${k.rate >= 70 ? 'bg-blue-500' : k.rate >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(k.rate, 100)}%` }}
                />
              </div>
              <p className={`text-[11px] font-semibold ${k.rate >= 70 ? 'text-blue-600' : k.rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                達成{k.rate}%
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 font-semibold">
          着地見込み <span className="text-gray-900">{man(kpi.totalRevenue + kpi.pipelineWeighted)}</span>（パイプライン加重含む）
        </p>
      </Card>

      {/* 個人別実績 */}
      <Card>
        <SectionLabel>個人別実績（今週）</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['メンバー', 'アポ', '商談', '見積', '受注', '売上', '粗利'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-500 text-right first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpi.memberStats.map((m) => (
                <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{m.name}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{m.appointments}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{m.meetings}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{m.estimates}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{m.orders}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">
                    {m.revenue > 0 ? man(m.revenue) : '—'}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold text-blue-600 whitespace-nowrap">
                    {m.grossProfit > 0 ? man(m.grossProfit) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td className="px-2 py-2.5 font-semibold text-gray-900">合計</td>
                <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{kpi.memberStats.reduce((s, m) => s + m.appointments, 0)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{kpi.memberStats.reduce((s, m) => s + m.meetings, 0)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{kpi.memberStats.reduce((s, m) => s + m.estimates, 0)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{kpi.memberStats.reduce((s, m) => s + m.orders, 0)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{man(kpi.totalRevenue)}</td>
                <td className="px-2 py-2.5 text-right font-semibold text-blue-600 whitespace-nowrap">{man(kpi.totalGrossProfit)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* メンバーToDo状況 */}
      <Card>
        <SectionLabel>メンバーToDo状況</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['メンバー', '完了', '未完了', '持ち越し'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-500 text-right first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveW.MEMBER_TODO_STATS.map((m) => (
                <tr key={m.name} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{m.name}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-blue-600">{m.done}</td>
                  <td className="px-2 py-2.5 text-right font-semibold text-gray-900">{m.undone}</td>
                  <td className="px-2 py-2.5 text-right">
                    {m.carryOver > 0
                      ? <span className="font-semibold text-red-600">{m.carryOver}</span>
                      : <span className="text-gray-500">0</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 資金繰り */}
      <Card>
        <SectionLabel>資金繰り</SectionLabel>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {(() => {
            const invoicedSum = deals.filter((d) => d.stage === 'invoiced' || d.stage === 'accounting').reduce((s, d) => s + d.amount, 0);
            const paidSum = deals.filter((d) => d.stage === 'paid').reduce((s, d) => s + d.amount, 0);
            return [
              { label: '入金予定（確度加重）', value: man(kpi.pipelineWeighted), color: 'text-gray-900' },
              { label: '入金済',             value: man(paidSum), color: 'text-blue-600' },
              { label: '請求中（未入金）',    value: man(invoicedSum), color: 'text-gray-900' },
              { label: '資金残高',           value: man(paidSum + invoicedSum), color: 'text-gray-900' },
            ];
          })().map((item) => (
            <div key={item.label} className="rounded-xl bg-gray-50 p-3">
              <p className="text-[11px] font-semibold text-gray-500 mb-1">{item.label}</p>
              <p className={`text-lg font-semibold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
        {liveW.CF_ROLLING.some((r) => r.balance < 0) && (
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-amber-500 text-amber-600">
              ⚠ 4週ショート注意
            </span>
            <span className="text-xs text-gray-500">一時的にキャッシュが減少する見込み</span>
          </div>
        )}
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">4週ローリング</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['週', '入金', '支払', '差引', '残高'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-500 text-right first:text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {liveW.CF_ROLLING.map((row) => {
                const diff = row.inflow - row.payment;
                const isNegative = diff < 0;
                return (
                  <tr key={row.week} className={`border-b border-gray-50 ${isNegative ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-2 py-2.5 font-semibold text-gray-700 whitespace-nowrap text-xs">{row.week}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{man(row.inflow)}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{man(row.payment)}</td>
                    <td className={`px-2 py-2.5 text-right font-semibold whitespace-nowrap ${isNegative ? 'text-red-600' : 'text-blue-600'}`}>
                      {diff >= 0 ? '+' : ''}{man(diff)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{man(row.balance)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <WeeklyDealListSection deals={deals} />

    </div>
  );
}

function ProductionNumbersView() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  useEffect(() => {
    setCards(loadProductionCards());
    fetchProductionCards().then(setCards);
  }, []);

  const active = cards.filter((c) => c.status === 'active' || c.status === 'paused');
  const totalRevenue = active.reduce((s, c) => s + c.amount + (c.amendments ?? []).reduce((a, x) => a + x.amount, 0), 0);
  const totalBudget = active.reduce((s, c) => s + c.referenceArtifacts.budget, 0);
  const totalCost = active.reduce((s, c) => s + c.tasks.reduce((a, t) => a + (t.estimatedCost ?? 0), 0), 0);
  const totalGross = totalRevenue - totalBudget;
  const grossRate = totalRevenue > 0 ? Math.round((totalGross / totalRevenue) * 100) : 0;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0;

  const allTasks = active.flatMap((c) => c.tasks);
  const internalTasks = allTasks.filter((t) => (t.assigneeType ?? 'internal') === 'internal');
  const externalTasks = allTasks.filter((t) => t.assigneeType === 'external');
  const committed = (tasks: typeof allTasks) => tasks.filter((t) => t.assigneeId || t.externalPartnerName);
  const done = (tasks: typeof allTasks) => tasks.filter((t) => t.status === 'done');
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>制作 KPI サマリー</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '受注額合計', value: man(totalRevenue), sub: `${active.length}案件`, color: 'text-gray-900' },
            { label: '目標粗利', value: man(totalGross), sub: `粗利率 ${grossRate}%`, color: grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-900' : 'text-red-600' },
            { label: '予算消化', value: `${budgetUsedPct}%`, sub: `${man(totalCost)} / ${man(totalBudget)}`, color: budgetUsedPct > 100 ? 'text-red-600' : budgetUsedPct > 80 ? 'text-amber-600' : 'text-gray-900' },
            { label: '全タスク完了率', value: `${pct(done(allTasks).length, allTasks.length)}%`, sub: `${done(allTasks).length} / ${allTasks.length}件`, color: 'text-gray-900' },
          ].map((k) => (
            <div key={k.label} className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">{k.label}</p>
              <p className={`text-xl font-semibold ${k.color} tabular-nums`}>{k.value}</p>
              <p className="text-xs text-gray-700 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel>コミット状況（約束できたか）</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">👤 内製タスク</p>
            <div className="space-y-2">
              <ProgressRow label="アサイン済み" current={committed(internalTasks).length} total={internalTasks.length} color="blue" />
              <ProgressRow label="完了" current={done(internalTasks).length} total={internalTasks.length} color="emerald" />
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">🤝 外注タスク</p>
            <div className="space-y-2">
              <ProgressRow label="発注済み" current={committed(externalTasks).length} total={externalTasks.length} color="blue" />
              <ProgressRow label="完了" current={done(externalTasks).length} total={externalTasks.length} color="emerald" />
              {(() => {
                const reviewed = externalTasks.filter((t) => t.reviewStatus === 'approved').length;
                const needsReview = externalTasks.filter((t) => t.reviewerId).length;
                return <ProgressRow label="レビュー承認" current={reviewed} total={needsReview} color="amber" />;
              })()}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel>👤 メンバー別パフォーマンス</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['メンバー', '完了', '納期遵守', '平均日数差', '進行中', '稼働', '評価'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALL_MEMBERS_RAW.map((m) => {
                const memberTasks = allTasks.filter((t) => t.assigneeId === m.id);
                const doneTasks = memberTasks.filter((t) => t.status === 'done');
                const withDueDate = doneTasks.filter((t) => t.dueDate && t.completedAt);
                const onTime = withDueDate.filter((t) => t.completedAt! <= t.dueDate!);
                const onTimeRate = withDueDate.length > 0 ? Math.round((onTime.length / withDueDate.length) * 100) : null;
                const avgDaysDiff = withDueDate.length > 0
                  ? Math.round(withDueDate.reduce((s, t) => {
                      const due = new Date(t.dueDate!).getTime();
                      const comp = new Date(t.completedAt!).getTime();
                      return s + (due - comp) / 86400000;
                    }, 0) / withDueDate.length)
                  : null;
                const inProgress = memberTasks.filter((t) => t.status === 'doing' || t.status === 'review').length;
                const activeTotalCount = memberTasks.filter((t) => t.status !== 'done').length;
                const eval_ =
                  doneTasks.length === 0 ? { label: '—', cls: 'text-gray-700' } :
                  onTimeRate !== null && onTimeRate >= 80 && (avgDaysDiff === null || avgDaysDiff >= 0) ? { label: '🟢 優秀', cls: 'text-emerald-700' } :
                  onTimeRate !== null && onTimeRate >= 50 ? { label: '🟡 普通', cls: 'text-amber-700' } :
                  { label: '🔴 遅延', cls: 'text-red-700' };

                if (memberTasks.length === 0) return null;
                return (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-2 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{m.name}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{doneTasks.length}件</td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {onTimeRate !== null ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${onTimeRate >= 80 ? 'bg-emerald-500' : onTimeRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${onTimeRate}%` }} />
                          </div>
                          <span className={`text-xs font-semibold tabular-nums ${onTimeRate >= 80 ? 'text-emerald-700' : onTimeRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{onTimeRate}%</span>
                        </div>
                      ) : <span className="text-xs text-gray-700">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {avgDaysDiff !== null ? (
                        <span className={`text-xs font-semibold tabular-nums ${avgDaysDiff > 0 ? 'text-emerald-700' : avgDaysDiff < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                          {avgDaysDiff > 0 ? `${avgDaysDiff}日早い` : avgDaysDiff < 0 ? `${Math.abs(avgDaysDiff)}日遅い` : 'ぴったり'}
                        </span>
                      ) : <span className="text-xs text-gray-700">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-blue-700 tabular-nums">{inProgress}件</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      <span className={`text-xs font-semibold ${activeTotalCount >= 8 ? 'text-red-700' : activeTotalCount >= 4 ? 'text-amber-700' : 'text-gray-900'}`}>{activeTotalCount}件</span>
                    </td>
                    <td className={`px-2 py-2.5 text-right text-xs font-semibold whitespace-nowrap ${eval_.cls}`}>{eval_.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionLabel>🤝 外注先パフォーマンス</SectionLabel>
        {(() => {
          const extTasks = allTasks.filter((t) => t.assigneeType === 'external' && t.externalPartnerName);
          const vendorNames = [...new Set(extTasks.map((t) => t.externalPartnerName!))];
          if (vendorNames.length === 0) return <p className="text-sm text-gray-700">外注タスクはありません</p>;
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['外注先', 'マスタ評価', '完了', '納期遵守', '平均日数差', 'レビュー', '原価合計', '評価'].map((h) => (
                      <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendorNames.map((name) => {
                    const tasks = extTasks.filter((t) => t.externalPartnerName === name);
                    const vendor = VENDORS.find((v) => v.name === name);
                    const doneTasks = tasks.filter((t) => t.status === 'done');
                    const withDue = doneTasks.filter((t) => t.dueDate && t.completedAt);
                    const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
                    const onTimeRate = withDue.length > 0 ? Math.round((onTime.length / withDue.length) * 100) : null;
                    const avgDiff = withDue.length > 0
                      ? Math.round(withDue.reduce((s, t) => s + (new Date(t.dueDate!).getTime() - new Date(t.completedAt!).getTime()) / 86400000, 0) / withDue.length)
                      : null;
                    const reviewed = tasks.filter((t) => t.reviewStatus === 'approved').length;
                    const rejected = tasks.filter((t) => t.reviewStatus === 'rejected').length;
                    const totalCost = tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
                    const eval_ =
                      doneTasks.length === 0 ? { label: '—', cls: 'text-gray-700' } :
                      onTimeRate !== null && onTimeRate >= 80 && rejected === 0 ? { label: '🟢 優秀', cls: 'text-emerald-700' } :
                      onTimeRate !== null && onTimeRate >= 50 ? { label: '🟡 普通', cls: 'text-amber-700' } :
                      { label: '🔴 要注意', cls: 'text-red-700' };

                    return (
                      <tr key={name} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          <p className="font-semibold text-gray-900">{name}</p>
                          {vendor && <p className="text-[11px] text-gray-700">{vendor.specialty}</p>}
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {vendor ? <span className="text-xs font-semibold text-amber-700">{'★'.repeat(Math.round(vendor.rating))} {vendor.rating}</span> : <span className="text-xs text-gray-700">未登録</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{doneTasks.length} / {tasks.length}</td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {onTimeRate !== null ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${onTimeRate >= 80 ? 'bg-emerald-500' : onTimeRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${onTimeRate}%` }} />
                              </div>
                              <span className={`text-xs font-semibold tabular-nums ${onTimeRate >= 80 ? 'text-emerald-700' : onTimeRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{onTimeRate}%</span>
                            </div>
                          ) : <span className="text-xs text-gray-700">—</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {avgDiff !== null ? (
                            <span className={`text-xs font-semibold tabular-nums ${avgDiff > 0 ? 'text-emerald-700' : avgDiff < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                              {avgDiff > 0 ? `${avgDiff}日早い` : avgDiff < 0 ? `${Math.abs(avgDiff)}日遅い` : 'ぴったり'}
                            </span>
                          ) : <span className="text-xs text-gray-700">—</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap text-xs tabular-nums">
                          {reviewed > 0 && <span className="text-emerald-700 font-semibold">✅{reviewed}</span>}
                          {rejected > 0 && <span className="text-red-700 font-semibold ml-1">❌{rejected}</span>}
                          {reviewed === 0 && rejected === 0 && <span className="text-gray-700">—</span>}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{man(totalCost)}</td>
                        <td className={`px-2 py-2.5 text-right text-xs font-semibold whitespace-nowrap ${eval_.cls}`}>{eval_.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </Card>

      <ProductionStatusSection />
    </div>
  );
}

function ProgressRow({ label, current, total, color }: { label: string; current: number; total: number; color: 'blue' | 'emerald' | 'amber' }) {
  const pctVal = total > 0 ? Math.round((current / total) * 100) : 0;
  const barColor = color === 'emerald' ? 'bg-emerald-500' : color === 'amber' ? 'bg-amber-500' : 'bg-blue-600';
  const textColor = color === 'emerald' ? 'text-emerald-700' : color === 'amber' ? 'text-amber-700' : 'text-blue-700';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-800">{label}</span>
        <span className={`font-semibold tabular-nums ${textColor}`}>{current} / {total}（{pctVal}%）</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pctVal}%` }} />
      </div>
    </div>
  );
}

function ProductionStatusSection() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  useEffect(() => {
    setCards(loadProductionCards());
    fetchProductionCards().then(setCards);
  }, []);

  const active = cards.filter((c) => c.status === 'active' || c.status === 'paused');
  if (active.length === 0) return null;

  return (
    <Card>
      <SectionLabel>🔧 制作案件ステータス</SectionLabel>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['案件', 'フェーズ', '進捗', 'PM', '予算消化', '納期', 'リスク'].map((h) => (
                <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((c) => {
              const pm = ALL_MEMBERS_RAW.find((m) => m.id === c.pmId);
              const cost = c.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
              const budgetPct = c.referenceArtifacts.budget > 0 ? Math.round((cost / c.referenceArtifacts.budget) * 100) : 0;
              return (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-2 py-2.5 whitespace-nowrap">
                    <Link href="/production" className="font-semibold text-gray-900 hover:text-blue-600">{c.dealName}</Link>
                    <p className="text-[11px] text-gray-700">{c.clientName}</p>
                    {c.status === 'paused' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">⏸ 保留</span>}
                  </td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-gray-200 text-gray-800">{PHASE_LABELS_W[c.phase] ?? c.phase}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full rounded-full ${c.progress >= 90 ? 'bg-blue-600' : c.progress >= 50 ? 'bg-blue-500' : 'bg-gray-500'}`} style={{ width: `${c.progress}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-800">{c.progress}%</span>
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right text-xs font-semibold text-gray-800 whitespace-nowrap">{pm?.name ?? c.pmName}</td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    <span className={`text-xs font-semibold ${budgetPct > 100 ? 'text-red-600' : budgetPct > 80 ? 'text-amber-600' : 'text-gray-800'}`}>{budgetPct}%</span>
                  </td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    {(() => {
                      const lastMs = [...c.milestones].reverse().find((m) => m.dueDate);
                      if (!lastMs) return <span className="text-xs text-gray-700">—</span>;
                      const dl = Math.ceil((new Date(lastMs.dueDate).getTime() - new Date('2026-04-05').getTime()) / 86400000);
                      return <span className={`text-xs font-semibold ${dl <= 7 ? 'text-red-600' : dl <= 30 ? 'text-amber-600' : 'text-gray-800'}`}>{lastMs.dueDate.slice(5)} ({dl > 0 ? `残${dl}日` : `${Math.abs(dl)}日超過`})</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2.5 text-right whitespace-nowrap">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${c.risk === 'high' ? 'bg-red-500' : c.risk === 'medium' ? 'bg-amber-400' : c.risk === 'low' ? 'bg-blue-400' : 'bg-gray-200'}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── 行動タブ ────────────────────────────────────────────────

function ActionsTab() {
  const liveW = useLiveWeeklyData();
  const [todos, setTodos] = useState(liveW.TODO_DATA);
  const [blocking, setBlocking] = useState('先方担当者が出張中で連絡取れず');
  const [support, setSupportNeeded] = useState('西田社長から豊田精工の役員へ一言添えていただきたい');
  const [saved, setSaved] = useState(false);

  function toggleTodo(id: string) {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      {/* 今週のToDo */}
      <Card>
        <SectionLabel>今週の最重要アクション</SectionLabel>
        <ul className="space-y-2">
          {todos.map((t) => (
            <li
              key={t.id}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                t.carryOver > 0
                  ? 'border-red-200 bg-red-50'
                  : t.done
                  ? 'border-gray-100 bg-gray-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleTodo(t.id)}
                aria-label={t.done ? '未完了に戻す' : '完了にする'}
                className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors active:scale-[0.98] ${
                  t.done ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                }`}
              >
                {t.done && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${t.done ? 'line-through text-gray-500' : t.carryOver > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                  {t.content}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500">{t.assignee}</span>
                  {t.carryOver > 0 && (
                    <span className="text-[11px] font-semibold text-red-600">{t.carryOver}週持ち越し</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors active:scale-[0.98]"
        >
          + アクションを追加
        </button>
      </Card>

      {/* ボトルネック・支援 */}
      <Card>
        <SectionLabel>ボトルネック・支援依頼</SectionLabel>
        <div className="space-y-3">
          <div>
            <label htmlFor="blocking" className="block text-sm font-semibold text-gray-900 mb-1">
              止めている要因
            </label>
            <input
              id="blocking"
              type="text"
              value={blocking}
              onChange={(e) => setBlocking(e.target.value)}
              placeholder="例: 先方からの返事待ち"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none placeholder:text-gray-500"
            />
          </div>
          <div>
            <label htmlFor="support" className="block text-sm font-semibold text-gray-900 mb-1">
              必要な支援（誰に何を）
            </label>
            <input
              id="support"
              type="text"
              value={support}
              onChange={(e) => setSupportNeeded(e.target.value)}
              placeholder="例: 社長から先方役員へ一言添えていただきたい"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none placeholder:text-gray-500"
            />
          </div>
          {saved && (
            <div className="px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold text-center" aria-live="polite">
              保存しました
            </div>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all duration-200"
          >
            保存
          </button>
        </div>
      </Card>

      {/* クレーム状況 */}
      <Card>
        <SectionLabel>クレーム状況</SectionLabel>
        <ul className="space-y-2">
          {liveW.CLAIMS.map((c) => (
            <li key={c.dealName} className="flex items-start gap-3 p-3 rounded-xl border border-red-200 bg-red-50">
              <span
                className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold flex-shrink-0 ${
                  c.severity === 'critical'
                    ? 'bg-red-600 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {c.severity === 'critical' ? '重大' : '中'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{c.dealName}</p>
                <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500">担当: {c.assignee}</span>
                  <span className="text-[11px] text-red-600 font-semibold">{c.days}日経過</span>
                  <span className={`text-[11px] font-semibold ${c.status === 'open' ? 'text-red-600' : 'text-amber-600'}`}>
                    {c.status === 'open' ? '未対応' : '対応中'}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {/* 🔧 制作行動（リアルデータ自動集計） */}
      <ProductionActivitySection />
    </div>
  );
}

// ─── 制作行動セクション ─────────────────────────────────────────

const ACTION_TYPE_ICONS: Record<string, string> = { voice: '🎙', meet: '🎥', phone: '📞', email: '✉️', incident: '🚨' };
const TODAY_W = new Date('2026-04-05');
const WEEK_START = new Date('2026-03-30');

function ProductionActivitySection() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  useEffect(() => {
    setCards(loadProductionCards());
    fetchProductionCards().then(setCards);
  }, []);

  const thisWeekActions = useMemo(() => {
    const result: { card: ProductionCard; action: ProductionAction }[] = [];
    for (const c of cards) {
      for (const a of c.actions ?? []) {
        if (a.date >= '2026-03-30' && a.date <= '2026-04-06') result.push({ card: c, action: a });
      }
    }
    return result.sort((a, b) => b.action.date.localeCompare(a.action.date));
  }, [cards]);

  const memberActivity = useMemo(() => {
    const map = new Map<string, { completed: number; inProgress: number; actions: number; incidents: number }>();
    for (const m of ALL_MEMBERS_RAW) map.set(m.name, { completed: 0, inProgress: 0, actions: 0, incidents: 0 });
    for (const c of cards) {
      if (c.status === 'cancelled') continue;
      for (const t of c.tasks) {
        const member = ALL_MEMBERS_RAW.find((m) => m.id === t.assigneeId);
        if (!member) continue;
        const s = map.get(member.name)!;
        if (t.status === 'done') s.completed += 1;
        else if (t.status === 'doing' || t.status === 'review') s.inProgress += 1;
      }
    }
    for (const { action } of thisWeekActions) {
      const s = map.get(action.assignee);
      if (s) {
        s.actions += 1;
        if (action.type === 'incident') s.incidents += 1;
      }
    }
    return map;
  }, [cards, thisWeekActions]);

  const nextActions = useMemo(() => {
    return cards
      .filter((c) => c.status === 'active' && c.nextAction?.date)
      .map((c) => ({ card: c, action: c.nextAction! }))
      .filter((x) => x.action.date >= '2026-04-05' && x.action.date <= '2026-04-13')
      .sort((a, b) => a.action.date.localeCompare(b.action.date));
  }, [cards]);

  const alerts: string[] = [];
  for (const c of cards) {
    if (c.status !== 'active') continue;
    const cost = c.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
    const pct = c.referenceArtifacts.budget > 0 ? Math.round((cost / c.referenceArtifacts.budget) * 100) : 0;
    if (pct > 100) alerts.push(`🔥 予算超過: ${c.dealName} ${pct}%`);
    if (c.risk === 'high') alerts.push(`🔴 リスク高: ${c.dealName}`);
    const overdue = c.tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < '2026-04-05');
    if (overdue.length > 0) alerts.push(`⏰ 期限切れ${overdue.length}件: ${c.dealName}`);
  }

  return (
    <>
      <Card>
        <SectionLabel>🔧 制作行動（自動集計）</SectionLabel>
        {ALL_MEMBERS_RAW.length === 0 ? (
          <p className="text-sm text-gray-700">メンバーデータがありません</p>
        ) : (
          <div className="space-y-3">
            {ALL_MEMBERS_RAW.map((m) => {
              const s = memberActivity.get(m.name);
              if (!s) return null;
              if (s.completed === 0 && s.inProgress === 0 && s.actions === 0) return null;
              return (
                <div key={m.id} className="border border-gray-200 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-900 mb-1.5">{m.name}</p>
                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    {s.completed > 0 && <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-semibold">✅ 完了 {s.completed}件</span>}
                    {s.inProgress > 0 && <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-semibold">🔄 進行中 {s.inProgress}件</span>}
                    {s.actions > 0 && <span className="bg-gray-100 text-gray-800 border border-gray-200 rounded-full px-2 py-0.5 font-semibold">📒 アクション {s.actions}件</span>}
                    {s.incidents > 0 && <span className="bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5 font-semibold">🚨 障害 {s.incidents}件</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {thisWeekActions.length > 0 && (
        <Card>
          <SectionLabel>📒 今週のアクション履歴</SectionLabel>
          <ul className="space-y-1.5">
            {thisWeekActions.slice(0, 15).map(({ card: c, action: a }) => (
              <li key={a.id} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 w-14 text-gray-700 tabular-nums">{a.date.slice(5)}</span>
                <span className="shrink-0">{ACTION_TYPE_ICONS[a.type] ?? '📝'}</span>
                <span className="text-gray-900 flex-1">{a.content}</span>
                <span className="text-gray-700 shrink-0 truncate max-w-[5rem]">{c.dealName}</span>
                <span className="text-gray-700 shrink-0">{a.assignee}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {nextActions.length > 0 && (
        <Card>
          <SectionLabel>📅 来週のアクション予定</SectionLabel>
          <ul className="space-y-1.5">
            {nextActions.map(({ card: c, action: a }) => (
              <li key={c.id} className="flex items-start gap-2 text-xs">
                <span className="shrink-0 w-14 text-gray-700 tabular-nums">{a.date.slice(5)}{a.time ? ` ${a.time}` : ''}</span>
                <span className="text-gray-900 flex-1">{a.content}</span>
                <span className="text-gray-700 shrink-0 truncate max-w-[5rem]">{c.dealName}</span>
                <span className="text-gray-700 shrink-0">{a.assignee}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {alerts.length > 0 && (
        <Card>
          <SectionLabel>🚨 制作アラート</SectionLabel>
          <ul className="space-y-1">
            {alerts.map((a, i) => (
              <li key={i} className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{a}</li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

// ─── 分析タブ ────────────────────────────────────────────────

function AnalysisTab() {
  const liveW = useLiveWeeklyData();
  const trend = liveW.WEEKLY_TREND[0] ?? { appo: 0, meeting: 0, proposal: 0, order: 0 };
  const FUNNEL = [
    { label: 'アポ',   count: trend.appo },
    { label: '商談',   count: trend.meeting },
    { label: '提案',   count: trend.proposal },
    { label: '受注',   count: trend.order },
  ];

  return (
    <div className="space-y-4">
      {/* 行動ファネル */}
      <Card>
        <SectionLabel>行動ファネル + ボトルネック</SectionLabel>
        <div className="flex items-end gap-2 mb-3 overflow-x-auto pb-1">
          {FUNNEL.map((stage, i) => {
            const prev = FUNNEL[i - 1];
            const rate = prev ? Math.round((stage.count / prev.count) * 100) : null;
            const isLow = rate !== null && rate < 60;
            return (
              <div key={stage.label} className="flex items-center gap-2 flex-shrink-0">
                {i > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-gray-500 text-lg">→</span>
                    <span className={`text-[11px] font-semibold ${isLow ? 'text-amber-600' : 'text-blue-600'}`}>
                      {rate}%{isLow ? '⚠' : ''}
                    </span>
                  </div>
                )}
                <div className="rounded-xl bg-gray-50 px-4 py-3 text-center">
                  <p className="text-[11px] font-semibold text-gray-500 mb-0.5">{stage.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stage.count}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800">
          ボトルネック: 商談→提案の転換率が57%で低い。提案の質を上げるか、商談時の要件ヒアリングを強化。
        </div>
      </Card>

      {/* 行動量4週推移 */}
      <Card>
        <SectionLabel>行動量4週推移</SectionLabel>
        <div className="h-52">
          <ResponsiveContainer minWidth={0} width="100%" height="100%">
            <LineChart data={liveW.WEEKLY_TREND} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                labelStyle={{ fontWeight: 600 }}
              />
              <Line type="monotone" dataKey="appo"     name="アポ"   stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="meeting"  name="商談"   stroke="#6b7280" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="proposal" name="提案"   stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="order"    name="受注"   stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[
            { label: 'アポ',   color: 'bg-blue-600' },
            { label: '商談',   color: 'bg-gray-500'  },
            { label: '提案',   color: 'bg-amber-400' },
            { label: '受注',   color: 'bg-green-600' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
              <span className="text-[11px] font-semibold text-gray-500">{item.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* 個人別ショット/ランニング粗利 */}
      <Card>
        <SectionLabel>個人別ショット/ランニング粗利</SectionLabel>
        <PersonalPLTable members={liveW.kpi.memberStats.map((m) => ({ name: m.name, shotRevenue: m.revenue, runningRevenue: 0, cost: m.revenue - m.grossProfit }))} />
      </Card>

      {/* 見積精度サマリー */}
      <Card>
        <SectionLabel>見積精度サマリー</SectionLabel>
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-[11px] font-semibold text-amber-700 mb-0.5">平均乖離率</p>
            <p className="text-2xl font-semibold text-amber-700">+115%</p>
          </div>
          <p className="text-sm font-semibold text-gray-600 flex-1">
            15%の過小見積もり傾向あり。提案前に工数バッファ10〜20%を加算することを推奨。
          </p>
        </div>
      </Card>

      {/* AIギャップコメント */}
      <Card>
        <SectionLabel>AIギャップコメント</SectionLabel>
        <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-700 leading-relaxed">
            今月の行動量は前月比120%と好調。ただし商談→提案の転換率が57%と低く、提案の質に課題がある。碧会の案件は12日間未連絡で放置リスクあり。外注単価交渉が3週持ち越しになっており、粗利改善の機会を逃しているため今週中の実施を推奨。
          </p>
        </div>
      </Card>
    </div>
  );
}

// ─── メインページ ────────────────────────────────────────────

type Tab = 'numbers' | 'actions' | 'analysis';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'numbers',  label: '数値', icon: '📊' },
  { id: 'actions',  label: '行動', icon: '💪' },
  { id: 'analysis', label: '分析', icon: '🔍' },
];

export default function WeeklyPage() {
  const [activeTab, setActiveTab] = useState<Tab>('numbers');

  return (
    <div className="max-w-5xl mx-auto px-4 pt-4 pb-24 min-h-screen bg-gray-50">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900">週次ダッシュボード <span className="text-xs font-semibold text-blue-600 ml-2 px-2 py-0.5 bg-blue-50 rounded-full">全社</span></h1>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">2026年4月第1週（4/1〜4/6）— 個人の動きは <a href="/home" className="text-blue-600 underline">ダッシュボード</a> へ</p>
      </div>

      {/* ピル型タブ */}
      <div className="bg-gray-100 rounded-xl p-1 flex gap-1 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 active:scale-[0.98] ${
              activeTab === tab.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'numbers'  && <NumbersTab />}
      {activeTab === 'actions'  && <ActionsTab />}
      {activeTab === 'analysis' && <AnalysisTab />}
    </div>
  );
}
