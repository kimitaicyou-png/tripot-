'use client';

import { useState, useEffect } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import Image from 'next/image';
import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { SectionLabel } from '@/components/ui/SectionLabel';
import { formatYen } from '@/lib/format';
import { PaymentReconciliationDemo } from '@/components/finance/PaymentReconciliation';
import MonthlyReportGenerator from '@/components/monthly/MonthlyReportGenerator';
import { PaymentScheduleDemo } from '@/components/finance/PaymentSchedule';
import { InvoiceTracker, MOCK_INVOICES, type InvoiceStatus } from '@/components/finance/InvoiceTracker';
import { loadProductionCards, type ProductionCard } from '@/lib/productionCards';
import { MEMBERS as ALL_MEMBERS_M } from '@/lib/currentMember';
import { VENDORS as ALL_VENDORS_M } from '@/lib/data/vendors';
import { ProfitAnalysisDemo } from '@/components/finance/ProfitAnalysis';
import { loadAllDeals, calcDealKpi } from '@/lib/dealsStore';

const MONTHS = ['2026年1月', '2026年2月', '2026年3月', '2026年4月', '2026年5月', '2026年6月'];

function useLiveFinancials() {
  const [deals, setDeals] = useState<ReturnType<typeof loadAllDeals>>([]);
  const [prodCards, setProdCards] = useState<ProductionCard[]>([]);
  useEffect(() => { setDeals(loadAllDeals()); setProdCards(loadProductionCards()); }, []);

  const kpi = calcDealKpi(deals);
  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const orderedDeals = deals.filter((d) => orderedStages.includes(d.stage));

  const shotRevenue = orderedDeals.filter((d) => d.revenueType === 'shot').reduce((s, d) => s + d.amount, 0);
  const runningRevenue = orderedDeals.filter((d) => d.revenueType === 'running' && d.monthlyAmount).reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);
  const totalRevenue = shotRevenue + runningRevenue;
  const prodCost = prodCards.reduce((s, c) => s + c.tasks.reduce((a, t) => a + (t.estimatedCost ?? 0), 0), 0);
  const cogs = prodCost > 0 ? prodCost : Math.round(totalRevenue * 0.54);
  const grossProfit = totalRevenue - cogs;
  const sga = 0;
  const operatingProfit = grossProfit - sga;
  const ordinaryProfit = operatingProfit;
  const savedTarget = (() => {
    if (typeof window === 'undefined') return { revenueTarget: 12000000, grossProfitTarget: 5520000 };
    try {
      const raw = localStorage.getItem('tripot_settings_target');
      if (raw) return JSON.parse(raw) as { revenueTarget: number; grossProfitTarget: number };
    } catch {}
    return { revenueTarget: 12000000, grossProfitTarget: 5520000 };
  })();
  const budgetRevenue = savedTarget.revenueTarget;
  const budgetGross = savedTarget.grossProfitTarget;
  const budgetOp = Math.round(budgetGross * 0.45);

  const r = (v: number) => Math.round(v / 10000);

  const PL_ROWS = [
    { label: '売上総利益（粗利）', budget: r(budgetGross), actual: r(grossProfit), ytdBudget: r(budgetGross), ytdActual: r(grossProfit), momDir: 'flat' as const, reverse: false, kind: 'flow' as const },
    { label: '営業利益',           budget: r(budgetOp),    actual: r(operatingProfit), ytdBudget: r(budgetOp), ytdActual: r(operatingProfit), momDir: 'flat' as const, reverse: false, kind: 'flow' as const },
    { label: '売上',               budget: r(budgetRevenue), actual: r(totalRevenue), ytdBudget: r(budgetRevenue), ytdActual: r(totalRevenue), momDir: 'flat' as const, reverse: false, kind: 'flow' as const },
    { label: '売上原価',           budget: r(budgetRevenue * 0.54), actual: r(cogs), ytdBudget: r(budgetRevenue * 0.54), ytdActual: r(cogs), momDir: 'flat' as const, reverse: true, kind: 'flow' as const },
    { label: '販管費',             budget: r(sga), actual: r(sga), ytdBudget: r(sga), ytdActual: r(sga), momDir: 'flat' as const, reverse: true, kind: 'fixed' as const },
    { label: '経常利益',           budget: 0, actual: r(ordinaryProfit), ytdBudget: 0, ytdActual: r(ordinaryProfit), momDir: 'flat' as const, reverse: false, kind: 'flow' as const },
  ];

  const SHOT_RUNNING = [
    { label: 'ショット売上',   budget: r(budgetRevenue * 0.95), actual: r(shotRevenue) },
    { label: 'ランニング売上', budget: r(budgetRevenue * 0.05), actual: r(runningRevenue) },
  ];

  const MEMBER_STATS_LIVE = kpi.memberStats.map((m) => ({
    name: m.name,
    target: r(budgetRevenue / Math.max(kpi.memberStats.length, 1)),
    actual: r(m.revenue),
    grossProfit: r(m.grossProfit),
  }));

  return { PL_ROWS, SHOT_RUNNING, MEMBER_STATS: MEMBER_STATS_LIVE, kpi, deals, prodCards, totalRevenue, grossProfit, budgetRevenue, budgetGross, budgetOp, sga };
}


const YEARLY_DATA = [
  { month: '4月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '5月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '6月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '7月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '8月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '9月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '10月', budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '11月', budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '12月', budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '1月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '2月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
  { month: '3月',  budgetRevenue: 0, budgetGross: 0, budgetOp: 0, revenue: 0, grossProfit: 0, operatingProfit: 0, shot: 0, running: 0 },
];

const YEARLY_BUDGET = {
  revenue: 0,
  grossProfit: 0,
  operatingProfit: 0,
};

type Segment = {
  id: string;
  name: string;
  type: 'shot' | 'running';
  costRate: number;
  monthlyBudgets: number[];
};

const INITIAL_SEGMENTS: Segment[] = [
  { id: 'dev', name: 'システム開発', type: 'shot', costRate: 0.55, monthlyBudgets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'maintenance', name: '保守・運用', type: 'running', costRate: 0.30, monthlyBudgets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'consulting', name: 'コンサルティング', type: 'running', costRate: 0.20, monthlyBudgets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'ai', name: 'AI導入支援', type: 'shot', costRate: 0.50, monthlyBudgets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { id: 'other', name: 'その他', type: 'running', costRate: 0.40, monthlyBudgets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
];

const FISCAL_MONTHS = ['4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月', '1月', '2月', '3月'];
const CURRENT_MONTH_INDEX = 0;



function useFiscalStart(): number {
  const [fiscalStart, setFiscalStart] = useState(4);
  useEffect(() => {
    const stored = localStorage.getItem('coaris_fiscal_start_month');
    if (stored) setFiscalStart(Number(stored));
  }, []);
  return fiscalStart;
}

function achieveRate(budget: number, actual: number): number {
  if (budget === 0) return actual === 0 ? 0 : 0;
  const rate = Math.round((actual / budget) * 100);
  return Math.max(-999, Math.min(999, rate));
}

function MomArrow({ dir }: { dir: 'up' | 'down' | 'flat' }) {
  if (dir === 'up')
    return <span className="text-blue-600 font-semibold text-xs">↑</span>;
  if (dir === 'down')
    return <span className="text-red-600 font-semibold text-xs">↓</span>;
  return <span className="text-gray-500 font-semibold text-xs">→</span>;
}

function SafetyBadge({ rate }: { rate: number }) {
  if (rate >= 85)
    return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border border-blue-600 text-blue-600">安全</span>;
  if (rate >= 65)
    return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border border-gray-500 text-gray-500">注意</span>;
  return <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold border border-red-600 text-red-600">危険</span>;
}

function CfBadge({ level }: { level: 'safe' | 'caution' | 'danger' }) {
  const map = {
    safe:    { label: '安全', cls: 'border border-blue-600 text-blue-600' },
    caution: { label: '注意', cls: 'border border-gray-500 text-gray-500' },
    danger:  { label: '危険', cls: 'border border-red-600 text-red-600' },
  };
  const { label, cls } = map[level];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${cls}`}>{label}</span>;
}

const PL_TOOLTIPS: Record<string, string> = {
  '売上': '売上高（トップライン）',
  '売上原価': '商品やサービスの直接的な制作コスト',
  '販管費': '販売費及び一般管理費（人件費・家賃・広告費など）',
  '営業利益': '本業の利益（粗利 − 販管費）',
  '経常利益': '本業 + 営業外損益を含めた利益',
};

type PlRow = { label: string; budget: number; actual: number; ytdBudget: number; ytdActual: number; momDir: 'up' | 'down' | 'flat'; reverse: boolean; kind: 'flow' | 'fixed' };
function PlTable({ rows }: { rows: PlRow[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-start justify-between mb-3 gap-3">
        <p className="text-xs text-gray-500 leading-relaxed">
          固定費（販管費など）は<span className="font-semibold text-gray-700">年度累計</span>で判断してください。単月の波は売上の納品タイミングで発生します。
        </p>
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th rowSpan={2} className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest w-[160px] align-bottom border-b border-gray-200">科目</th>
            <th colSpan={4} className="text-center py-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-widest border-l border-gray-100">当月</th>
            <th colSpan={3} className="text-center py-1.5 text-[11px] font-semibold text-blue-700 uppercase tracking-widest border-l border-gray-200 bg-blue-50/50">年度累計</th>
            <th rowSpan={2} className="text-center py-2 pl-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest align-bottom border-b border-gray-200">前月比</th>
          </tr>
          <tr className="border-b border-gray-200">
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 border-l border-gray-100">予算</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">実績</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">差異</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">達成率</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700 border-l border-gray-200 bg-blue-50/50">予算</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50/50">実績</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-blue-700 bg-blue-50/50">達成率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rate = achieveRate(row.budget, row.actual);
            const ytdRate = achieveRate(row.ytdBudget, row.ytdActual);
            const diff = row.actual - row.budget;
            const goodDiff = row.reverse ? diff <= 0 : diff >= 0;
            const isFixed = row.kind === 'fixed';
            const rowBg = isFixed ? 'bg-blue-50/20' : (rate < 80 && !row.reverse ? 'bg-red-50' : '');
            const rateColor = rate >= 95 ? 'text-gray-900' : rate >= 80 ? 'text-blue-600' : 'text-red-600';
            const ytdRateColor = ytdRate >= 95 ? 'text-gray-900' : ytdRate >= 80 ? 'text-blue-600' : 'text-red-600';
            const diffColor = goodDiff ? 'text-blue-600' : 'text-red-600';
            const tooltip = PL_TOOLTIPS[row.label];

            return (
              <tr key={row.label} className={`border-b border-gray-100 hover:bg-gray-50/70 ${rowBg}`}>
                <td className={`py-3 pr-3 text-sm font-semibold ${!isFixed && rate < 80 && !row.reverse ? 'text-red-900' : 'text-gray-900'}`}>
                  {tooltip ? (
                    <span className="border-b border-dotted border-gray-300 cursor-help" title={tooltip}>{row.label}</span>
                  ) : (
                    row.label
                  )}
                  {isFixed && (
                    <span className="ml-1.5 text-[9px] font-semibold text-blue-700 bg-blue-100 rounded-full px-1.5 py-0.5">固定費</span>
                  )}
                </td>
                <td className="py-3 px-3 text-right text-base text-gray-500 tabular-nums border-l border-gray-100">{formatYen(row.budget * 10000)}</td>
                <td className={`py-3 px-3 text-right text-lg font-semibold tabular-nums ${isFixed ? 'text-gray-600' : 'text-gray-900'}`}>{formatYen(row.actual * 10000)}</td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`text-base font-semibold tabular-nums ${isFixed ? 'text-gray-500' : diffColor}`}>
                      {diff >= 0 ? '+' : ''}{formatYen(diff * 10000)}
                    </span>
                    <Link href="/monthly/detail" className="text-[11px] font-semibold text-blue-600 hover:underline whitespace-nowrap">詳細 →</Link>
                  </div>
                  {row.reverse && diff < 0 && !isFixed && (
                    <div className="text-xs font-semibold text-blue-600 mt-0.5">↓節約できた</div>
                  )}
                </td>
                <td className={`py-3 px-3 text-right text-lg font-semibold tabular-nums ${isFixed ? 'text-gray-500' : rateColor}`}>{isFixed ? '—' : `${rate}%`}</td>
                <td className="py-3 px-3 text-right text-base text-gray-500 tabular-nums border-l border-gray-200 bg-blue-50/30">{formatYen(row.ytdBudget * 10000)}</td>
                <td className="py-3 px-3 text-right text-lg font-semibold text-gray-900 tabular-nums bg-blue-50/30">{formatYen(row.ytdActual * 10000)}</td>
                <td className={`py-3 px-3 text-right text-lg font-semibold tabular-nums bg-blue-50/30 ${ytdRateColor}`}>{ytdRate}%</td>
                <td className="py-3 pl-3 text-center"><MomArrow dir={row.momDir} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ShotRunningTableLive({ data }: { data: { label: string; budget: number; actual: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">区分</th>
            <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">予算</th>
            <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">実績</th>
            <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">差異</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const diff = row.actual - row.budget;
            return (
              <tr key={row.label} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-3 font-semibold text-gray-900">{row.label}</td>
                <td className="py-2.5 px-2 text-right text-gray-500">{formatYen(row.budget * 10000)}</td>
                <td className="py-2.5 px-2 text-right font-semibold text-gray-900">{formatYen(row.actual * 10000)}</td>
                <td className={`py-2.5 pl-2 text-right font-semibold ${diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {diff >= 0 ? '+' : ''}{formatYen(diff * 10000)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberTableLive({ data }: { data: { name: string; target: number; actual: number; grossProfit: number }[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">メンバー</th>
            <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">目標</th>
            <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">実績</th>
            <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">達成率</th>
            <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">粗利</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => {
            const rate = achieveRate(m.target, m.actual);
            const rateColor = rate >= 95 ? 'text-gray-900' : rate >= 80 ? 'text-blue-600' : 'text-red-600';
            return (
              <tr key={m.name} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 pr-3 font-semibold text-gray-900">{m.name}</td>
                <td className="py-2.5 px-2 text-right text-gray-500">{formatYen(m.target * 10000)}</td>
                <td className="py-2.5 px-2 text-right font-semibold text-gray-900">{formatYen(m.actual * 10000)}</td>
                <td className={`py-2.5 px-2 text-right font-semibold ${rateColor}`}>{rate}%</td>
                <td className="py-2.5 pl-2 text-right text-gray-500">{formatYen(m.grossProfit * 10000)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BizPlanSection() {
  const currentMonthBudgets = INITIAL_SEGMENTS.map((seg) => ({
    name: seg.name,
    budget: seg.monthlyBudgets[CURRENT_MONTH_INDEX] ?? 0,
  }));
  const totalBudget = currentMonthBudgets.reduce((s, seg) => s + seg.budget, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">事業計画（当月）</p>
        <Link
          href="/budget"
          className="text-xs font-semibold text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
        >
          詳細を編集 →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {currentMonthBudgets.map((seg) => (
          <div key={seg.name} className="border border-gray-200 rounded-xl p-3">
            <p className="text-[11px] font-semibold text-gray-500 truncate">{seg.name}</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums mt-0.5">
              ¥{seg.budget.toLocaleString()}万
            </p>
            <p className="text-xs text-gray-500 mt-0.5">予算</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-sm font-semibold text-gray-700">
          合計予算: <span className="text-gray-900">¥{totalBudget.toLocaleString()}万</span>
        </span>
        <Link
          href="/budget"
          className="text-xs font-semibold bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700 transition-colors"
        >
          詳細を編集 →
        </Link>
      </div>
    </div>
  );
}


function MonthlyTrendChart() {
  const live = useLiveFinancials();
  const r = (v: number) => Math.round(v / 10000);
  const currentRevenue = r(live.totalRevenue);
  const currentGross = r(live.grossProfit);
  const TREND_DATA = [{ month: '当月', revenue: currentRevenue, gross: currentGross }];
  return (
    <div className="-mx-2">
      <div className="flex items-baseline gap-3 mb-2 px-2">
        <div>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{currentRevenue}<span className="text-xs text-gray-500 ml-1">万</span></p>
          <p className="text-xs text-gray-500">今月売上</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-base font-semibold text-blue-600 tabular-nums">¥{currentGross}<span className="text-xs text-gray-500 ml-1">万</span></p>
          <p className="text-xs text-gray-500">今月粗利</p>
        </div>
      </div>
      <div style={{ height: 160 }}>
        <ResponsiveContainer minWidth={0} width="100%" height="100%">
          <BarChart data={TREND_DATA} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} width={44} />
            <Tooltip
              formatter={(value, name) => [`¥${value}万`, name === 'revenue' ? '売上' : '粗利']}
              contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Bar dataKey="revenue" fill="#dbeafe" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gross" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}


function CustomerRanking() {
  const [deals] = useState(() => loadAllDeals());
  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const ordered = deals.filter((d) => orderedStages.includes(d.stage));
  const clientMap = new Map<string, number>();
  for (const d of ordered) clientMap.set(d.clientName, (clientMap.get(d.clientName) ?? 0) + Math.round(d.amount / 10000));
  const CUSTOMER_RANKING_LIVE = [...clientMap.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
  const max = CUSTOMER_RANKING_LIVE[0]?.amount ?? 1;
  const total = CUSTOMER_RANKING_LIVE.reduce((s, c) => s + c.amount, 0);
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <p className="text-xl font-semibold text-gray-900 tabular-nums">¥{total.toLocaleString()}<span className="text-xs text-gray-500 ml-1">万</span></p>
        <p className="text-xs text-gray-500">TOP5 合計</p>
      </div>
      <div className="space-y-2.5">
        {CUSTOMER_RANKING_LIVE.map((c, i) => {
          const pct = (c.amount / max) * 100;
          const share = Math.round((c.amount / total) * 100);
          return (
            <div key={c.name}>
              <div className="flex items-baseline justify-between mb-1">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-xs font-semibold text-gray-500 tabular-nums shrink-0">{i + 1}</span>
                  <span className="text-xs font-semibold text-gray-700 truncate">{c.name}</span>
                </div>
                <div className="flex items-baseline gap-2 shrink-0">
                  <span className="text-xs text-gray-500 tabular-nums">{share}%</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">¥{c.amount}<span className="text-xs text-gray-500">万</span></span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-600 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlTab() {
  const live = useLiveFinancials();
  const [showProfitAnalysis, setShowProfitAnalysis] = useState(false);
  const opRate = live.PL_ROWS[1] ? achieveRate(live.PL_ROWS[1].budget, live.PL_ROWS[1].actual) : 0;
  const grossRate = live.PL_ROWS[0] ? achieveRate(live.PL_ROWS[0].budget, live.PL_ROWS[0].actual) : 0;

  const funnelSteps = [
    { label: 'アポ',   count: live.deals.filter((d) => d.stage === 'lead').length,                                    last: 0, target: 30 },
    { label: '商談',   count: live.deals.filter((d) => d.stage === 'meeting').length,                                  last: 0, target: 24 },
    { label: '提案',   count: live.deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length,         last: 0, target: 16 },
    { label: '見積',   count: live.deals.filter((d) => d.stage === 'negotiation').length,                               last: 0, target: 12 },
    { label: '受注',   count: live.deals.filter((d) => ['ordered','in_production','delivered','acceptance','invoiced','accounting','paid'].includes(d.stage)).length, last: 0, target: 8 },
  ];

  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.count));
  const funnelOverall = funnelSteps[0].count > 0 ? Math.round((funnelSteps[funnelSteps.length - 1].count / funnelSteps[0].count) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <SectionLabel>予実管理</SectionLabel>
        <PlTable rows={live.PL_ROWS} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <Card>
            <SectionLabel>売上内訳（ショット / ランニング）</SectionLabel>
            <ShotRunningTableLive data={live.SHOT_RUNNING} />
          </Card>

          <Card>
            <SectionLabel>個人別予実</SectionLabel>
            <MemberTableLive data={live.MEMBER_STATS} />
          </Card>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowProfitAnalysis(!showProfitAnalysis)}
              className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-sm font-semibold text-gray-900">案件タイプ別採算分析</span>
              <span className="text-xs text-gray-500">{showProfitAnalysis ? "▲" : "▼"}</span>
            </button>
            {showProfitAnalysis && (
              <div className="border-t border-gray-200">
                <ProfitAnalysisDemo />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">

          <Card>
            <div className="flex items-start justify-between mb-4">
              <SectionLabel>行動ファネル</SectionLabel>
              <div className="text-right">
                <p className="text-2xl font-semibold text-gray-900 tabular-nums leading-none">{funnelOverall}<span className="text-sm text-gray-500 ml-0.5">%</span></p>
                <p className="text-xs text-gray-500 mt-1">アポ → 受注</p>
              </div>
            </div>
            <div className="space-y-3">
              {funnelSteps.map((s, i) => {
                const pct = (s.count / funnelMax) * 100;
                const conv = i > 0 && funnelSteps[i - 1].count > 0 ? Math.round((s.count / funnelSteps[i - 1].count) * 100) : null;
                const targetPct = s.target > 0 ? Math.round((s.count / s.target) * 100) : 0;
                const momDiff = s.count - s.last;
                const opacity = 1 - (i / funnelSteps.length) * 0.4;
                const targetReached = targetPct >= 100;
                return (
                  <div key={s.label}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-gray-700">{s.label}</span>
                        {conv !== null && (
                          <span className={`text-xs font-semibold tabular-nums ${conv >= 60 ? 'text-emerald-600' : conv >= 40 ? 'text-gray-500' : 'text-amber-600'}`}>
                            ↓ {conv}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-xs font-semibold tabular-nums ${momDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {momDiff >= 0 ? '+' : ''}{momDiff}
                        </span>
                        <span className="text-base font-semibold text-gray-900 tabular-nums">{s.count}</span>
                        <span className="text-xs text-gray-500 tabular-nums">/ {s.target}</span>
                      </div>
                    </div>
                    <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: '#2563eb', opacity }}
                      />
                      <div className="absolute top-0 bottom-0 w-px bg-gray-400" style={{ left: `${(s.target / funnelMax) * 100}%` }} title="目標" />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">前月 {s.last}</span>
                      <span className={`text-xs font-semibold ${targetReached ? 'text-emerald-600' : 'text-gray-500'}`}>
                        目標達成 {targetPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <SectionLabel>月次推移（6ヶ月）</SectionLabel>
            <MonthlyTrendChart />
          </Card>

          <Card>
            <SectionLabel>顧客別売上 TOP5</SectionLabel>
            <CustomerRanking />
          </Card>

        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">翌月見通し</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">パイプライン（確度加重）</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatYen(live.kpi.pipelineWeighted)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">確定受注残</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatYen(live.kpi.totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-gray-500">ランニング自動計上</span>
            <span className="font-semibold text-gray-900 tabular-nums">{formatYen(live.deals.filter((d) => d.revenueType === 'running' && d.monthlyAmount).reduce((s, d) => s + (d.monthlyAmount ?? 0), 0))}/月</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2 mt-1">
            <span className="font-semibold text-gray-900">翌月到達見込み</span>
            <span className="font-semibold text-gray-900 tabular-nums text-lg">{formatYen(live.kpi.totalRevenue + live.kpi.pipelineWeighted)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CashShortActionBoard() {
  const [deals] = useState(() => loadAllDeals());
  const ordStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting'];
  const recLive = deals.filter((d) => ordStages.includes(d.stage) && d.amount > 0).slice(0, 3);
  const shortAmount = Math.max(0, Math.round((12000000 * 0.15 - recLive.reduce((s, d) => s + d.amount, 0)) / 10000));
  const shortWeek = 'W2';
  const candidates = recLive.map((d) => ({
    project: d.dealName,
    client: d.clientName,
    amount: Math.round(d.amount / 10000),
    dueDate: d.paymentDue?.slice(5) ?? '未定',
    assignee: d.assignee,
  }));
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-base font-semibold text-red-700">⚠ 資金ショート対策</p>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-semibold text-red-700">{shortWeek}（2週間後）</span>に
            <span className="font-semibold text-red-700">¥{shortAmount}万</span>足りない見込みです。下記の対策を検討してください。
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">① 入金を早める（催促候補）</p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <div key={c.project} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.project}</p>
                  <p className="text-xs text-gray-500">{c.client} ・ 担当: {c.assignee} ・ 期日 {c.dueDate}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-base font-semibold text-gray-900 tabular-nums">¥{c.amount}万</span>
                  <button className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 active:scale-[0.98] transition-all">
                    催促を依頼
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">② 支払いを遅らせる候補</p>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm text-gray-700">
            外注先A社への支払い <span className="font-semibold tabular-nums">¥80万</span>（4/15予定）→ 4/30に交渉可能
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">③ 借入シミュレーション</p>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-sm text-gray-700">
              当座貸越枠 <span className="font-semibold tabular-nums">¥500万</span> 利用可能 ・ 金利 年2.5%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              ¥{shortAmount}万を1ヶ月借入 → 利息 約¥{Math.round(shortAmount * 0.025 / 12 * 10000).toLocaleString()}円
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function CfTab() {
  const [deals] = useState(() => loadAllDeals());
  const invoiceStages = ['invoiced', 'accounting', 'paid', 'delivered', 'acceptance'];
  const defaultInvoices: InvoiceStatus[] = deals
    .filter((d) => invoiceStages.includes(d.stage) && d.amount > 0)
    .map((d) => {
      const dueDate = d.paymentDue ?? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const isOverdue = d.stage !== 'paid' && dueDate < new Date().toISOString().slice(0, 10);
      const daysOverdue = isOverdue ? Math.floor((Date.now() - new Date(dueDate).getTime()) / 86400000) : 0;
      return {
        id: `inv-${d.id}`,
        dealName: d.dealName,
        clientName: d.clientName,
        invoiceNo: `INV-${d.id.replace('deal-', '')}`,
        amount: d.amount,
        issuedDate: d.invoiceDate ?? new Date().toISOString().slice(0, 10),
        sentDate: d.stage === 'paid' || d.stage === 'accounting' ? d.invoiceDate : undefined,
        sentMethod: d.stage === 'paid' || d.stage === 'accounting' ? 'email' as const : undefined,
        dueDate,
        paidDate: d.stage === 'paid' ? d.paidDate : undefined,
        status: d.stage === 'paid' ? 'paid' as const : isOverdue ? 'overdue' as const : (d.stage === 'invoiced' || d.stage === 'accounting') ? 'sent' as const : 'draft' as const,
        daysOverdue: daysOverdue > 0 ? daysOverdue : undefined,
      };
    });
  const fallbackInvoices = defaultInvoices.length > 0 ? defaultInvoices : MOCK_INVOICES;
  const [invoices, setInvoices] = usePersistedState<InvoiceStatus[]>('monthly_invoices', fallbackInvoices);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showInvoiceTracker, setShowInvoiceTracker] = useState(false);

  const invoicedDeals = deals.filter((d) => d.stage === 'invoiced' || d.stage === 'accounting');
  const paidDeals = deals.filter((d) => d.stage === 'paid');
  const overdueDeals = invoicedDeals.filter((d) => d.paymentDue && d.paymentDue < '2026-04-05');
  const inflowExpected = invoicedDeals.reduce((s, d) => s + Math.round(d.amount * d.probability / 100), 0);
  const inflowReceived = paidDeals.reduce((s, d) => s + d.amount, 0);
  const overdueAmount = overdueDeals.reduce((s, d) => s + d.amount, 0);
  const r = (v: number) => Math.round(v / 10000);

  const CF_SUMMARY_LIVE = [
    { label: '入金予定（確度加重）', value: r(inflowExpected),  status: null },
    { label: '入金済',               value: r(inflowReceived),  status: null },
    { label: '未納',                 value: r(overdueAmount),   status: overdueAmount > 0 ? 'danger' as const : null },
    { label: '資金残高',             value: r(inflowReceived - overdueAmount), status: null },
  ];

  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting'];
  const RECEIVABLES_LIVE = deals
    .filter((d) => orderedStages.includes(d.stage) && d.amount > 0)
    .map((d) => ({ project: d.dealName, client: d.clientName, amount: r(d.amount), probability: d.probability, weighted: r(Math.round(d.amount * d.probability / 100)), dueDate: d.paymentDue?.slice(5) ?? '未定' }))
    .slice(0, 8);

  const OVERDUE_LIVE = overdueDeals.map((d) => {
    const days = Math.ceil((new Date('2026-04-05').getTime() - new Date(d.paymentDue!).getTime()) / 86400000);
    return { project: d.dealName, client: d.clientName, amount: r(d.amount), delayDays: days, assignee: d.assignee };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <Card>
          <SectionLabel>CFサマリー</SectionLabel>
          <table className="w-full text-sm">
            <tbody>
              {CF_SUMMARY_LIVE.map((row) => (
                <tr key={row.label} className="border-b border-gray-100">
                  <td className="py-2.5 pr-3 font-semibold text-gray-600">{row.label}</td>
                  <td className={`py-2.5 text-right font-semibold ${row.status === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatYen(row.value * 10000)}
                  </td>
                  <td className="py-2.5 pl-3 text-right w-16">
                    {row.status === 'danger' && <CfBadge level="danger" />}
                  </td>
                </tr>
              ))}
              <tr className="border-b border-gray-100">
                <td className="py-2.5 pr-3 font-semibold text-gray-600">4週ショート判定</td>
                <td className="py-2.5 text-right font-semibold text-gray-500">—</td>
                <td className="py-2.5 pl-3 text-right w-16"><CfBadge level="danger" /></td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-gray-600">損益分岐点余裕</td>
                <td className="py-2.5 text-right font-semibold text-gray-500">—</td>
                <td className="py-2.5 pl-3 text-right w-16"><CfBadge level="caution" /></td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionLabel>4週ローリング資金繰り</SectionLabel>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">週</th>
                <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">入金予定</th>
                <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">支払予定</th>
                <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">差引</th>
                <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">残高</th>
              </tr>
            </thead>
            <tbody>
              {[
                { week: 'W1', inflow: r(inflowExpected * 0.3), outflow: r(inflowExpected * 0.25), diff: r(inflowExpected * 0.05), balance: r(inflowReceived + inflowExpected * 0.05) },
                { week: 'W2', inflow: r(inflowExpected * 0.2), outflow: r(inflowExpected * 0.35), diff: r(inflowExpected * -0.15), balance: r(inflowReceived - inflowExpected * 0.1) },
                { week: 'W3', inflow: r(inflowExpected * 0.3), outflow: r(inflowExpected * 0.2), diff: r(inflowExpected * 0.1), balance: r(inflowReceived) },
                { week: 'W4', inflow: r(inflowExpected * 0.2), outflow: r(inflowExpected * 0.2), diff: 0, balance: r(inflowReceived) },
              ].map((row) => {
                const isNegativeBalance = row.balance < 0;
                return (
                  <tr
                    key={row.week}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${isNegativeBalance ? 'bg-red-50' : ''}`}
                  >
                    <td className={`py-2.5 pr-3 font-semibold ${isNegativeBalance ? 'text-red-900' : 'text-gray-900'}`}>{row.week}</td>
                    <td className="py-2.5 px-2 text-right text-gray-500">{formatYen(row.inflow * 10000)}</td>
                    <td className="py-2.5 px-2 text-right text-gray-500">{formatYen(row.outflow * 10000)}</td>
                    <td className={`py-2.5 px-2 text-right font-semibold ${row.diff >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {row.diff >= 0 ? '+' : ''}{formatYen(row.diff * 10000)}
                    </td>
                    <td className={`py-2.5 pl-2 text-right font-semibold ${isNegativeBalance ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatYen(row.balance * 10000)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <SectionLabel>入金予定一覧</SectionLabel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">案件名</th>
                  <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">金額</th>
                  <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">確度</th>
                  <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">加重額</th>
                  <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">予定日</th>
                </tr>
              </thead>
              <tbody>
                {RECEIVABLES_LIVE.map((r) => (
                  <tr key={r.project} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2.5 pr-2">
                      <p className="font-semibold text-gray-900 text-xs leading-tight">{r.project}</p>
                      <p className="text-[11px] text-gray-500">{r.client}</p>
                    </td>
                    <td className="py-2.5 px-2 text-right text-gray-500">{formatYen(r.amount * 10000)}</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-gray-900">{r.probability}%</td>
                    <td className="py-2.5 px-2 text-right font-semibold text-blue-600">{formatYen(r.weighted * 10000)}</td>
                    <td className="py-2.5 pl-2 text-right text-gray-500">{r.dueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <SectionLabel>未納一覧</SectionLabel>
          {OVERDUE_LIVE.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">案件名</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">金額</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">遅延</th>
                    <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-widest">担当</th>
                  </tr>
                </thead>
                <tbody>
                  {OVERDUE_LIVE.map((o) => (
                    <tr key={o.project} className="border-b border-gray-100 bg-red-50 hover:bg-red-100">
                      <td className="py-2.5 pr-2">
                        <p className="font-semibold text-red-900 text-xs leading-tight">{o.project}</p>
                        <p className="text-[11px] text-red-600">{o.client}</p>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-red-600">{formatYen(o.amount * 10000)}</td>
                      <td className="py-2.5 px-2 text-right font-semibold text-red-600">{o.delayDays}日</td>
                      <td className="py-2.5 pl-2 text-right text-gray-600">{o.assignee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-4 text-center">未納はありません</p>
          )}
        </Card>
      </div>
      </div>

      <CashShortActionBoard />

      <div className="space-y-3">
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowReconciliation((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>入金消込</span>
            <span className="text-gray-500 text-xs">{showReconciliation ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>
          {showReconciliation && (
            <div className="border-t border-gray-200 p-4">
              <PaymentReconciliationDemo />
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSchedule((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>支払予定</span>
            <span className="text-gray-500 text-xs">{showSchedule ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>
          {showSchedule && (
            <div className="border-t border-gray-200 p-4">
              <PaymentScheduleDemo />
            </div>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowInvoiceTracker((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <span>請求書状態</span>
            <span className="text-gray-500 text-xs">{showInvoiceTracker ? '▲ 閉じる' : '▼ 開く'}</span>
          </button>
          {showInvoiceTracker && (
            <div className="border-t border-gray-200 p-4">
              <InvoiceTracker invoices={invoices} onChange={setInvoices} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function YearlyTab() {
  const fiscalStart = useFiscalStart();
  const live = useLiveFinancials();
  const rr = (v: number) => Math.round(v / 10000);

  const orderedYearlyData = (() => {
    const data = YEARLY_DATA.map((d) => {
      if (d.month === '4月') {
        return { ...d, revenue: rr(live.totalRevenue), grossProfit: rr(live.grossProfit), operatingProfit: rr(live.grossProfit - 0), shot: rr(live.totalRevenue * 0.95), running: rr(live.totalRevenue * 0.05) };
      }
      return d;
    });
    const startIdx = data.findIndex((d) => parseInt(d.month) === fiscalStart);
    if (startIdx <= 0) return data;
    return [...data.slice(startIdx), ...data.slice(0, startIdx)];
  })();

  const totalRevenue = orderedYearlyData.reduce((s, d) => s + d.revenue, 0);
  const totalGrossProfit = orderedYearlyData.reduce((s, d) => s + d.grossProfit, 0);
  const totalOperatingProfit = orderedYearlyData.reduce((s, d) => s + d.operatingProfit, 0);

  const revenueRate = achieveRate(YEARLY_BUDGET.revenue, totalRevenue);
  const grossRate = achieveRate(YEARLY_BUDGET.grossProfit, totalGrossProfit);
  const opRate = achieveRate(YEARLY_BUDGET.operatingProfit, totalOperatingProfit);

  const QUARTERS = [
    { label: 'Q1（5〜7月）', months: [0, 1, 2] },
    { label: 'Q2（8〜10月）', months: [3, 4, 5] },
    { label: 'Q3（11〜1月）', months: [6, 7, 8] },
    { label: 'Q4（2〜4月）', months: [9, 10, 11] },
  ];

  const colorFor = (r: number) => r >= 95 ? 'text-gray-900' : r >= 80 ? 'text-blue-600' : 'text-red-600';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {([
          { label: '売上',     budget: YEARLY_BUDGET.revenue,         actual: totalRevenue,         rate: revenueRate },
          { label: '粗利',     budget: YEARLY_BUDGET.grossProfit,     actual: totalGrossProfit,     rate: grossRate    },
          { label: '営業利益', budget: YEARLY_BUDGET.operatingProfit, actual: totalOperatingProfit, rate: opRate       },
        ]).map((row) => (
          <Card key={row.label}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{row.label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-semibold text-gray-900 tabular-nums">¥{row.actual.toLocaleString()}<span className="text-sm text-gray-500 ml-1">万</span></p>
              <p className={`text-sm font-semibold tabular-nums ${colorFor(row.rate)}`}>{row.rate}%</p>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">予算 ¥{row.budget.toLocaleString()}万</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
              <div className={`h-full rounded-full ${row.rate >= 95 ? 'bg-gray-900' : row.rate >= 80 ? 'bg-blue-600' : 'bg-red-500'}`} style={{ width: `${Math.min(row.rate, 100)}%` }} />
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>12ヶ月 推移</SectionLabel>
          <span className="text-[11px] text-gray-500">期首 {fiscalStart}月 ・ 単位: 万円</span>
        </div>
        <div className="space-y-2">
          {orderedYearlyData.map((row) => {
            const rRate = achieveRate(row.budgetRevenue, row.revenue);
            const gRate = achieveRate(row.budgetGross, row.grossProfit);
            const oRate = achieveRate(row.budgetOp, row.operatingProfit);
            const maxRev = Math.max(...orderedYearlyData.map((d) => Math.max(d.budgetRevenue, d.revenue)));
            const revPct = (row.revenue / maxRev) * 100;
            return (
              <div key={row.month} className="grid grid-cols-12 items-center gap-2 py-1.5 border-b border-gray-100">
                <div className="col-span-1 text-xs font-semibold text-gray-700 tabular-nums">{row.month}</div>
                <div className="col-span-5 relative h-5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-blue-600/80 transition-all duration-700 ease-out" style={{ width: `${revPct}%` }} />
                </div>
                <div className="col-span-2 text-right text-xs font-semibold text-gray-900 tabular-nums">¥{row.revenue}</div>
                <div className={`col-span-1 text-right text-xs font-semibold tabular-nums ${colorFor(rRate)}`}>{rRate}%</div>
                <div className="col-span-1 text-right text-xs text-gray-500 tabular-nums">{row.grossProfit}</div>
                <div className={`col-span-1 text-right text-xs font-semibold tabular-nums ${colorFor(gRate)}`}>{gRate}%</div>
                <div className={`col-span-1 text-right text-xs font-semibold tabular-nums ${colorFor(oRate)}`}>{oRate}%</div>
              </div>
            );
          })}
        </div>
        <div className="grid grid-cols-12 gap-2 mt-3 pt-3 border-t border-gray-200 text-xs font-semibold text-gray-500">
          <div className="col-span-1">月</div>
          <div className="col-span-5 pl-2">売上</div>
          <div className="col-span-2 text-right">実績</div>
          <div className="col-span-1 text-right">達成</div>
          <div className="col-span-1 text-right">粗利</div>
          <div className="col-span-1 text-right">達成</div>
          <div className="col-span-1 text-right">営利</div>
        </div>
      </Card>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">

        <Card>
          <SectionLabel>四半期サマリー</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {QUARTERS.map((q) => {
              const qRevenue = q.months.reduce((s, i) => s + YEARLY_DATA[i].revenue, 0);
              const qGross = q.months.reduce((s, i) => s + YEARLY_DATA[i].grossProfit, 0);
              const qOp = q.months.reduce((s, i) => s + YEARLY_DATA[i].operatingProfit, 0);
              const qGrossRate = Math.round((qGross / qRevenue) * 100);
              return (
                <div key={q.label} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-gray-500 mb-2">{q.label}</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">売上</span>
                      <span className="text-xs font-semibold text-gray-900">{qRevenue}万</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">粗利</span>
                      <span className="text-xs font-semibold text-gray-900">{qGross}万</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">営業利益</span>
                      <span className="text-xs font-semibold text-blue-600">{qOp}万</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-1 mt-1">
                      <span className="text-xs text-gray-500">粗利率</span>
                      <span className={`text-xs font-semibold ${qGrossRate >= 45 ? 'text-blue-600' : qGrossRate >= 40 ? 'text-gray-900' : 'text-red-600'}`}>
                        {qGrossRate}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <SectionLabel>粗利推移（12ヶ月折れ線）</SectionLabel>
          <div style={{ height: 240 }}>
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <LineChart data={orderedYearlyData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}万`}
                  width={44}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { grossProfit: '粗利', operatingProfit: '営業利益' };
                    return [`${value}万円`, labels[name as string] ?? name];
                  }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend
                  formatter={(value) => value === 'grossProfit' ? '粗利' : '営業利益'}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  type="monotone"
                  dataKey="grossProfit"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#111827' }}
                />
                <Line
                  type="monotone"
                  dataKey="operatingProfit"
                  stroke="#2563eb"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionLabel>ショット / ランニング 年間積み上げ</SectionLabel>
          <div style={{ height: 240 }}>
            <ResponsiveContainer minWidth={0} width="100%" height="100%">
              <BarChart data={orderedYearlyData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}万`}
                  width={44}
                />
                <Tooltip
                  formatter={(value, name) => {
                    const labels: Record<string, string> = { shot: 'ショット', running: 'ランニング' };
                    return [`${value}万円`, labels[name as string] ?? name];
                  }}
                  contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Legend
                  formatter={(value) => value === 'shot' ? 'ショット' : 'ランニング'}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Bar dataKey="shot" stackId="a" fill="#111827" radius={[0, 0, 0, 0]} />
                <Bar dataKey="running" stackId="a" fill="#2563eb" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
    </div>
  );
}

export default function MonthlyPage() {
  const [activeTab, setActiveTab] = useState<'pl' | 'cf' | 'yearly' | 'production'>('pl');
  const [selectedMonth, setSelectedMonth] = useState('2026年4月');
  const [showReportModal, setShowReportModal] = useState(false);

  const headerLive = useLiveFinancials();
  const rh = (v: number) => Math.round(v / 10000);
  const headerGrossActual = rh(headerLive.grossProfit);
  const headerOpActual = rh(headerLive.grossProfit - 0);
  const grossRate = achieveRate(rh(5520000), headerGrossActual);
  const opRate = achieveRate(rh(2020000), headerOpActual);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-8">
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 flex-1">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1">粗利</p>
              <p className={`text-2xl font-semibold tabular-nums ${grossRate < 80 ? 'text-red-600' : 'text-gray-900'}`}>
                ¥{headerGrossActual}万
              </p>
              <p className={`text-xs font-semibold mt-0.5 ${grossRate < 80 ? 'text-red-600' : 'text-blue-600'}`}>
                目標比{grossRate}%
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${grossRate < 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(grossRate, 100)}%` }}
                />
              </div>
              <p className={`text-xs font-semibold mt-1.5 ${grossRate < 80 ? 'text-red-600' : 'text-blue-600'}`}>
                {grossRate < 80 ? '要注意' : grossRate >= 95 ? '達成' : '注意'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1">営業利益</p>
              <p className={`text-2xl font-semibold tabular-nums ${opRate < 80 ? 'text-red-600' : 'text-gray-900'}`}>
                ¥{headerOpActual}万
              </p>
              <p className={`text-xs font-semibold mt-0.5 ${opRate < 80 ? 'text-red-600' : 'text-blue-600'}`}>
                目標比{opRate}%
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${opRate < 80 ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: `${Math.min(opRate, 100)}%` }}
                />
              </div>
              <p className={`text-xs font-semibold mt-1.5 ${opRate < 80 ? 'text-red-600' : 'text-blue-600'}`}>
                {opRate < 80 ? '危険' : opRate >= 95 ? '達成' : '注意'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1">CF</p>
              <div className="mt-1">
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-400 text-gray-600">
                  注意
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">4週ショート判定: 危険</p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2 min-w-[160px]">
            <Link
              href="/budget"
              className="bg-gray-900 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap text-center"
            >
              事業計画 →
            </Link>
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap text-center"
            >
              月次報告会を生成 ✦
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/tripot.svg"
            alt="トライポット"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">トライポット株式会社</p>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">月次ダッシュボード</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab !== 'yearly' && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-sm font-semibold text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500">期首: 4月（設定で変更可）</span>
            </div>
          )}

          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setActiveTab('pl')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors ${
                activeTab === 'pl'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              PL
            </button>
            <button
              onClick={() => setActiveTab('cf')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                activeTab === 'cf'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              CF
            </button>
            <button
              onClick={() => setActiveTab('yearly')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                activeTab === 'yearly'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              年次
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={`px-4 py-1.5 text-sm font-semibold transition-colors border-l border-gray-200 ${
                activeTab === 'production'
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              🔧 制作
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'pl' && <PlTab />}
      {activeTab === 'cf' && <CfTab />}
      {activeTab === 'yearly' && <YearlyTab />}
      {activeTab === 'production' && <MonthlyProductionTab />}

      {showReportModal && (
        <MonthlyReportGenerator
          monthLabel={selectedMonth}
          onClose={() => setShowReportModal(false)}
          liveData={{
            revenue: Math.round(headerLive.totalRevenue / 10000),
            revenueBudget: Math.round(headerLive.budgetRevenue / 10000),
            gross: Math.round(headerLive.grossProfit / 10000),
            grossBudget: Math.round(headerLive.budgetGross / 10000),
            op: Math.round((headerLive.grossProfit - headerLive.sga) / 10000),
            opBudget: Math.round(headerLive.budgetOp / 10000),
            dealCount: headerLive.kpi.dealCount,
            orderedCount: headerLive.kpi.orderedCount,
            pipelineWeighted: Math.round(headerLive.kpi.pipelineWeighted / 10000),
            grossMarginRate: headerLive.kpi.grossMarginRate,
            memberStats: headerLive.kpi.memberStats,
          }}
        />
      )}
    </div>
  );
}

function MonthlyProductionTab() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  useEffect(() => { setCards(loadProductionCards()); }, []);

  const active = cards.filter((c) => c.status !== 'cancelled');
  const completed = cards.filter((c) => c.status === 'done');
  const allTasks = active.flatMap((c) => c.tasks);
  const totalRevenue = active.reduce((s, c) => s + c.amount + (c.amendments ?? []).reduce((a, x) => a + x.amount, 0), 0);
  const totalBudget = active.reduce((s, c) => s + c.referenceArtifacts.budget, 0);
  const totalCost = allTasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const totalGross = totalRevenue - totalBudget;
  const grossRate = totalRevenue > 0 ? Math.round((totalGross / totalRevenue) * 100) : 0;
  const budgetUsedPct = totalBudget > 0 ? Math.round((totalCost / totalBudget) * 100) : 0;
  const doneTasks = allTasks.filter((t) => t.status === 'done');
  const completionRate = allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : 0;

  type MemberPerf = { id: string; name: string; completed: number; onTime: number; withDue: number; avgDiff: number; grossContrib: number; score: number };
  const memberPerfs: MemberPerf[] = ALL_MEMBERS_M.map((m) => {
    const tasks = allTasks.filter((t) => t.assigneeId === m.id);
    const done = tasks.filter((t) => t.status === 'done');
    const withDue = done.filter((t) => t.dueDate && t.completedAt);
    const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
    const avgDiff = withDue.length > 0 ? Math.round(withDue.reduce((s, t) => s + (new Date(t.dueDate!).getTime() - new Date(t.completedAt!).getTime()) / 86400000, 0) / withDue.length) : 0;
    const grossContrib = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
    const onTimeRate = withDue.length > 0 ? onTime.length / withDue.length : 0.5;
    const score = done.length * 10 + onTimeRate * 30 + Math.max(avgDiff, 0) * 5;
    return { id: m.id, name: m.name, completed: done.length, onTime: onTime.length, withDue: withDue.length, avgDiff, grossContrib, score };
  }).filter((p) => p.completed > 0).sort((a, b) => b.score - a.score);

  const mvp = memberPerfs[0] ?? null;

  type VendorPerf = { name: string; completed: number; total: number; onTimeRate: number | null; rejected: number; cost: number };
  const vendorPerfs: VendorPerf[] = (() => {
    const extTasks = allTasks.filter((t) => t.assigneeType === 'external' && t.externalPartnerName);
    const names = [...new Set(extTasks.map((t) => t.externalPartnerName!))];
    return names.map((name) => {
      const tasks = extTasks.filter((t) => t.externalPartnerName === name);
      const done = tasks.filter((t) => t.status === 'done');
      const withDue = done.filter((t) => t.dueDate && t.completedAt);
      const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
      return {
        name,
        completed: done.length,
        total: tasks.length,
        onTimeRate: withDue.length > 0 ? Math.round((onTime.length / withDue.length) * 100) : null,
        rejected: tasks.filter((t) => t.reviewStatus === 'rejected').length,
        cost: tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0),
      };
    });
  })();

  return (
    <div className="space-y-4">
      {mvp && (
        <Card>
          <div className="text-center py-4">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-2">🏆 今月の制作MVP</p>
            <p className="text-2xl font-semibold text-gray-900 mb-1">{mvp.name}</p>
            <p className="text-sm text-gray-800">
              完了 <span className="font-semibold text-blue-600">{mvp.completed}件</span>
              {mvp.withDue > 0 && <> · 納期遵守 <span className="font-semibold text-emerald-700">{Math.round((mvp.onTime / mvp.withDue) * 100)}%</span></>}
              {mvp.avgDiff > 0 && <> · 平均 <span className="font-semibold text-emerald-700">{mvp.avgDiff}日早い</span></>}
            </p>
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel>制作 月次サマリー</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: '案件数', value: `${active.length}件`, sub: `完了 ${completed.length}件`, color: 'text-gray-900' },
            { label: '受注額合計', value: formatYen(totalRevenue), sub: `粗利 ${formatYen(totalGross)}（${grossRate}%）`, color: 'text-gray-900' },
            { label: '予算消化', value: `${budgetUsedPct}%`, sub: `${formatYen(totalCost)} / ${formatYen(totalBudget)}`, color: budgetUsedPct > 100 ? 'text-red-600' : 'text-gray-900' },
            { label: 'タスク完了率', value: `${completionRate}%`, sub: `${doneTasks.length} / ${allTasks.length}件`, color: 'text-gray-900' },
            { label: '内製 / 外注', value: `${allTasks.filter((t) => (t.assigneeType ?? 'internal') === 'internal').length} / ${allTasks.filter((t) => t.assigneeType === 'external').length}`, sub: 'タスク数', color: 'text-gray-900' },
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
        <SectionLabel>🏅 メンバー別ランキング</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['順位', 'メンバー', '完了', '納期遵守', '平均日数差', '担当原価', '評価'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {memberPerfs.map((p, i) => {
                const onTimeRate = p.withDue > 0 ? Math.round((p.onTime / p.withDue) * 100) : null;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
                const eval_ = onTimeRate !== null && onTimeRate >= 80 && p.avgDiff >= 0 ? '🟢 優秀' : onTimeRate !== null && onTimeRate >= 50 ? '🟡 普通' : p.completed > 0 ? '🔴 要改善' : '—';
                return (
                  <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${i === 0 ? 'bg-amber-50/40' : ''}`}>
                    <td className="px-2 py-2.5 text-center font-semibold text-gray-900">{medal}</td>
                    <td className="px-2 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{p.name}</td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{p.completed}件</td>
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
                      <span className={`text-xs font-semibold tabular-nums ${p.avgDiff > 0 ? 'text-emerald-700' : p.avgDiff < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                        {p.avgDiff > 0 ? `${p.avgDiff}日早い` : p.avgDiff < 0 ? `${Math.abs(p.avgDiff)}日遅い` : 'ぴったり'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatYen(p.grossContrib)}</td>
                    <td className="px-2 py-2.5 text-right text-xs font-semibold whitespace-nowrap">{eval_}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <SectionLabel>🤝 外注先月次サマリー</SectionLabel>
        {vendorPerfs.length === 0 ? (
          <p className="text-sm text-gray-700">外注タスクはありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['外注先', 'マスタ★', '完了', '納期遵守', '差し戻し', '原価', '評価'].map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorPerfs.map((v) => {
                  const vendor = ALL_VENDORS_M.find((x) => x.name === v.name);
                  const eval_ = v.completed === 0 ? '—' : v.onTimeRate !== null && v.onTimeRate >= 80 && v.rejected === 0 ? '🟢 優秀' : v.onTimeRate !== null && v.onTimeRate >= 50 ? '🟡 普通' : '🔴 要注意';
                  return (
                    <tr key={v.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-2 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{v.name}</td>
                      <td className="px-2 py-2.5 text-right text-xs text-amber-700 font-semibold">{vendor ? `${'★'.repeat(Math.round(vendor.rating))} ${vendor.rating}` : '—'}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums">{v.completed}/{v.total}</td>
                      <td className="px-2 py-2.5 text-right whitespace-nowrap">
                        {v.onTimeRate !== null ? (
                          <span className={`text-xs font-semibold ${v.onTimeRate >= 80 ? 'text-emerald-700' : v.onTimeRate >= 50 ? 'text-amber-700' : 'text-red-700'}`}>{v.onTimeRate}%</span>
                        ) : '—'}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{v.rejected > 0 ? <span className="text-xs font-semibold text-red-700">❌{v.rejected}</span> : <span className="text-xs text-gray-700">0</span>}</td>
                      <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatYen(v.cost)}</td>
                      <td className="px-2 py-2.5 text-right text-xs font-semibold">{eval_}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <SectionLabel>📊 案件別 制作実績</SectionLabel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['案件', 'フェーズ', '進捗', '受注額', '予算消化', '粗利率', '納期', 'ステータス'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-semibold text-gray-700 text-right first:text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((c) => {
                const rev = c.amount + (c.amendments ?? []).reduce((s, a) => s + a.amount, 0);
                const cost = c.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
                const bPct = c.referenceArtifacts.budget > 0 ? Math.round((cost / c.referenceArtifacts.budget) * 100) : 0;
                const gRate = rev > 0 ? Math.round(((rev - c.referenceArtifacts.budget) / rev) * 100) : 0;
                const lastMs = [...c.milestones].reverse().find((m) => m.dueDate);
                const dl = lastMs ? Math.ceil((new Date(lastMs.dueDate).getTime() - new Date('2026-04-05').getTime()) / 86400000) : null;
                const PHASE_L: Record<string, string> = { kickoff: 'キックオフ', requirements: '要件', design: '設計', development: '開発', test: 'テスト', release: 'リリース', operation: '運用' };
                const statusLabel = c.status === 'done' ? '✅完了' : c.status === 'paused' ? '⏸保留' : '🟢進行中';
                return (
                  <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${c.status === 'done' ? 'opacity-70' : ''}`}>
                    <td className="px-2 py-2.5 whitespace-nowrap">
                      <p className="font-semibold text-gray-900">{c.dealName}</p>
                      <p className="text-[11px] text-gray-700">{c.clientName}</p>
                    </td>
                    <td className="px-2 py-2.5 text-right"><span className="text-xs font-semibold border border-gray-200 rounded-lg px-2 py-0.5 text-gray-800">{PHASE_L[c.phase] ?? c.phase}</span></td>
                    <td className="px-2 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-600" style={{ width: `${c.progress}%` }} /></div>
                        <span className="text-xs font-semibold text-gray-900 tabular-nums">{c.progress}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap">{formatYen(rev)}</td>
                    <td className="px-2 py-2.5 text-right"><span className={`text-xs font-semibold tabular-nums ${bPct > 100 ? 'text-red-600' : bPct > 80 ? 'text-amber-600' : 'text-gray-900'}`}>{bPct}%</span></td>
                    <td className="px-2 py-2.5 text-right"><span className={`text-xs font-semibold tabular-nums ${gRate >= 40 ? 'text-blue-600' : gRate >= 20 ? 'text-gray-900' : 'text-red-600'}`}>{gRate}%</span></td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">
                      {dl !== null ? <span className={`text-xs font-semibold tabular-nums ${dl <= 7 ? 'text-red-600' : dl <= 30 ? 'text-amber-600' : 'text-gray-800'}`}>{lastMs!.dueDate.slice(5)} ({dl > 0 ? `残${dl}日` : `${Math.abs(dl)}日超過`})</span> : <span className="text-xs text-gray-700">—</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right text-xs font-semibold whitespace-nowrap">{statusLabel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
