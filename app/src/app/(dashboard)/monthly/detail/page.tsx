'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatYen } from '@/lib/format';
import { loadAllDeals, calcDealKpi, fetchDeals } from '@/lib/dealsStore';
import { loadProductionCards, fetchProductionCards, type ProductionCard } from '@/lib/productionCards';


function Accordion({
  title,
  children,
  defaultOpen = false,
  alert = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  alert?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-lg overflow-hidden mb-3 ${alert ? 'border-red-200' : 'border-gray-200'}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left ${alert ? 'bg-red-50' : 'bg-gray-50'}`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          {alert && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 py-4 bg-white">{children}</div>}
    </div>
  );
}

function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | React.ReactNode)[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        {headers.length > 0 && (
          <thead>
            <tr className="border-b border-gray-200">
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`py-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider ${i === 0 ? 'text-left pr-3' : i === headers.length - 1 ? 'text-right pl-3' : 'text-right px-2'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-100 last:border-0">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-2.5 text-sm ${ci === 0 ? 'text-left pr-3 text-gray-600' : ci === row.length - 1 ? 'text-right pl-3 font-semibold text-gray-900' : 'text-right px-2 text-gray-700'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-500 mb-2 mt-4 first:mt-0">{children}</p>;
}

const OVERDUES: Record<string, { client: string; amount: string; delay: string; assignee: string }[]> = {
  dotsync: [
    { client: 'E株式会社',   amount: '250万円', delay: '45日', assignee: '渡辺 健' },
    { client: 'F有限会社',   amount: '120万円', delay: '22日', assignee: '山本 彩' },
    { client: 'G商店',       amount: '50万円',  delay: '8日',  assignee: '渡辺 健' },
    { client: 'H合同会社',   amount: '780万円', delay: '3日',  assignee: '山本 彩' },
  ],
  deraforce: [
    { client: '株式会社K商事', amount: '45万円', delay: '12日', assignee: '田中 太郎' },
  ],
  kuuhaku: [],
};

const ROLLING_WEEKS: Record<string, { week: string; income: string; expense: string; net: string; ok: boolean }[]> = {
  dotsync: [
    { week: '4/7〜4/13',  income: '310万円', expense: '280万円', net: '+30万円',   ok: true },
    { week: '4/14〜4/20', income: '200万円', expense: '310万円', net: '-110万円', ok: false },
    { week: '4/21〜4/27', income: '150万円', expense: '290万円', net: '-140万円', ok: false },
    { week: '4/28〜5/4',  income: '190万円', expense: '280万円', net: '-90万円',  ok: false },
  ],
  deraforce: [
    { week: '4/7〜4/13',  income: '150万円', expense: '140万円', net: '+10万円',  ok: true },
    { week: '4/14〜4/20', income: '100万円', expense: '150万円', net: '-50万円',  ok: false },
    { week: '4/21〜4/27', income: '90万円',  expense: '130万円', net: '-40万円',  ok: false },
    { week: '4/28〜5/4',  income: '80万円',  expense: '120万円', net: '-40万円',  ok: false },
  ],
  kuuhaku: [
    { week: '4/7〜4/13',  income: '70万円', expense: '50万円', net: '+20万円',  ok: true },
    { week: '4/14〜4/20', income: '60万円', expense: '55万円', net: '+5万円',   ok: true },
    { week: '4/21〜4/27', income: '50万円', expense: '45万円', net: '+5万円',   ok: true },
    { week: '4/28〜5/4',  income: '80万円', expense: '60万円', net: '+20万円',  ok: true },
  ],
};

export default function MonthlyDetailPage() {
  const [tab, setTab] = useState<'pl' | 'cf'>('pl');
  const [month, setMonth] = useState<string>('2026-04');
  const [deals, setDeals] = useState<ReturnType<typeof loadAllDeals>>([]);
  useEffect(() => { setDeals(loadAllDeals()); fetchDeals().then((fresh) => setDeals(fresh)); }, []);

  const kpi = calcDealKpi(deals);
  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const orderedDeals = deals.filter((d) => orderedStages.includes(d.stage));
  const shotRevenue = orderedDeals.filter((d) => d.revenueType === 'shot').reduce((s, d) => s + d.amount, 0);
  const runningRevenue = orderedDeals.filter((d) => d.revenueType === 'running' && d.monthlyAmount).reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);
  const totalRevenue = shotRevenue + runningRevenue;
  const [prodCards, setProdCards] = useState<ProductionCard[]>([]);
  useEffect(() => { setProdCards(loadProductionCards()); fetchProductionCards().then(setProdCards); }, []);
  const prodCost = prodCards.reduce((s, c) => s + c.tasks.reduce((a, t) => a + (t.estimatedCost ?? 0), 0), 0);
  const cogs = prodCost;
  const grossProfit = prodCost > 0 ? totalRevenue - cogs : 0;

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
  const revenueTarget = budgetPlan
    ? budgetPlan.segments.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) * 10000
    : 0;
  const budgetCogs = budgetPlan
    ? budgetPlan.cogs.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) * 10000
    : 0;
  const grossTarget = revenueTarget - budgetCogs;
  const cogsTarget = budgetCogs;
  const sgaActual = budgetPlan
    ? (budgetPlan.labor.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0) +
       budgetPlan.admin.reduce((s, r) => s + (r.values[currentMonthIdx] ?? 0), 0)) * 10000
    : 0;

  const pl = {
    revenue: { target: revenueTarget, actual: totalRevenue },
    grossProfit: { target: grossTarget, actual: grossProfit },
    sgaExpenses: { target: 0, actual: sgaActual },
  };

  const invoicedDeals = deals.filter((d) => d.stage === 'invoiced' || d.stage === 'accounting');
  const paidDeals = deals.filter((d) => d.stage === 'paid');
  const expectedPayment = invoicedDeals.reduce((s, d) => s + Math.round(d.amount * d.probability / 100), 0);
  const receivedPayment = paidDeals.reduce((s, d) => s + d.amount, 0);
  const cf = { expectedPayment, received: receivedPayment };

  const funnel = {
    appointments: deals.filter((d) => d.stage === 'lead').length,
    meetings: deals.filter((d) => d.stage === 'meeting').length,
    proposals: deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length,
    orders: orderedDeals.length,
    conversionRates: {
      meeting: deals.filter((d) => d.stage === 'lead').length > 0
        ? Math.round((deals.filter((d) => d.stage === 'meeting').length / deals.filter((d) => d.stage === 'lead').length) * 100) : 0,
      proposal: deals.filter((d) => d.stage === 'meeting').length > 0
        ? Math.round((deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length / deals.filter((d) => d.stage === 'meeting').length) * 100) : 0,
      order: deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length > 0
        ? Math.round((orderedDeals.length / deals.filter((d) => ['proposal', 'estimate_sent'].includes(d.stage)).length) * 100) : 0,
    },
  };

  const overdueDealsList = invoicedDeals
    .filter((d) => d.paymentDue && d.paymentDue < new Date().toISOString().slice(0, 10))
    .map((d) => ({
      client: d.clientName,
      amount: `${Math.round(d.amount / 10000)}万円`,
      delay: `${Math.floor((Date.now() - new Date(d.paymentDue!).getTime()) / 86400000)}日`,
      assignee: d.assignee,
    }));
  const overdues = overdueDealsList;

  const inflowExpected = expectedPayment;
  const r = (v: number) => Math.round(v / 10000);
  const weekDist = [0.3, 0.2, 0.3, 0.2];
  const now = new Date();
  const rollingWeeks = weekDist.map((pct, i) => {
    const wStart = new Date(now); wStart.setDate(wStart.getDate() + i * 7);
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
    const income = r(inflowExpected * pct);
    const expense = r(cogs * pct * 1.1);
    const net = income - expense;
    return { week: `${fmt(wStart)}〜${fmt(wEnd)}`, income: `${income}万円`, expense: `${expense}万円`, net: `${net >= 0 ? '+' : ''}${net}万円`, ok: net >= 0 };
  });

  const breakEvenPoint = pl.sgaExpenses.actual > 0 && grossProfit > 0
    ? Math.round((pl.sgaExpenses.actual / (grossProfit / totalRevenue)) / 10000)
    : 0;
  const breakEvenRatio = grossProfit > 0
    ? Math.round((pl.sgaExpenses.actual / grossProfit) * 100)
    : 0;
  const safetyMargin = 100 - breakEvenRatio;
  const marginalProfit = grossProfit;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto pb-24">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/monthly"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            モニターに戻る
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <div>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">月次ドリルダウン</p>
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">詳細分析</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white">トライポット</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            aria-label="月選択"
          >
            <option value="2026-04">2026年4月</option>
            <option value="2026-03">2026年3月</option>
            <option value="2026-02">2026年2月</option>
          </select>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        <button
          onClick={() => setTab('pl')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'pl' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          PL詳細
        </button>
        <button
          onClick={() => setTab('cf')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === 'cf' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
        >
          CF詳細
        </button>
      </div>

      {tab === 'pl' && (
        <div>
          <Accordion title="売上（区分別）" defaultOpen>
            <DataTable
              headers={['区分', '目標', '実績']}
              rows={[
                ['補助金・助成金', '200万円', '180万円'],
                ['アライアンス収入', '300万円', '260万円'],
                ['直販（受注）', formatYen(pl.revenue.target - 5000000), formatYen(pl.revenue.actual - 4400000)],
                ['その他', '200万円', '160万円'],
                ['合計', formatYen(pl.revenue.target), formatYen(pl.revenue.actual)],
              ]}
            />
          </Accordion>

          <Accordion title="売上（ショット / ランニング別）">
            <DataTable
              headers={['区分', '目標', '実績']}
              rows={[
                ['ランニング（継続）', '636万円', '636万円'],
                ['ショット（受注）', formatYen(pl.revenue.target - 6360000), formatYen(pl.revenue.actual - 6360000)],
                ['合計', formatYen(pl.revenue.target), formatYen(pl.revenue.actual)],
              ]}
            />
          </Accordion>

          <Accordion title="原価（区分別）">
            <DataTable
              headers={['区分', '目標', '実績', '差異']}
              rows={[
                ['外注費',   '600万円',         '850万円',         <span key="e1" className="text-red-600">+250万円</span>],
                ['材料費',   '200万円',         '190万円',         <span key="e2" className="text-blue-600">-10万円</span>],
                ['仕入原価', '150万円',         '160万円',         <span key="e3" className="text-red-600">+10万円</span>],
                ['合計',     formatYen(cogsTarget), formatYen(cogs),     ''],
              ]}
            />
          </Accordion>

          <Accordion title="販管費（労務費・管理費）">
            <SubLabel>労務費（5科目）</SubLabel>
            <DataTable
              headers={[]}
              rows={[
                ['給与・賞与',   '950万円'],
                ['法定福利費',   '145万円'],
                ['役員報酬',     '280万円'],
                ['採用費',       '60万円'],
                ['教育研修費',   '25万円'],
              ]}
            />
            <SubLabel>管理費（主要5科目）</SubLabel>
            <DataTable
              headers={[]}
              rows={[
                ['地代家賃',   '180万円'],
                ['広告宣伝費', '120万円'],
                ['通信費',     '35万円'],
                ['消耗品費',   '28万円'],
                ['交際費',     '57万円'],
              ]}
            />
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-600">販管費合計</span>
              <span className="text-sm font-semibold text-gray-900">{formatYen(pl.sgaExpenses.actual)}</span>
            </div>
          </Accordion>

          <Accordion title="経営効率指標">
            <DataTable
              headers={[]}
              rows={[
                ['固定費（販管費）',     formatYen(pl.sgaExpenses.actual)],
                ['変動費（原価）',       formatYen(cogs)],
                ['限界利益（粗利）',     formatYen(marginalProfit)],
                ['損益分岐点（推計）',   `${breakEvenPoint.toLocaleString()}万円`],
                ['損益分岐点比率',       `${breakEvenRatio}%`],
                ['安全余裕率',           `${safetyMargin}%`],
              ]}
            />
          </Accordion>

          <Accordion title="行動ファネル詳細">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {[
                { label: 'アポ',  val: funnel.appointments },
                { label: '商談',  val: funnel.meetings },
                { label: '提案',  val: funnel.proposals },
                { label: '受注',  val: funnel.orders },
              ].map(({ label, val }) => (
                <div key={label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">{label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{val}</p>
                </div>
              ))}
            </div>
            <DataTable
              headers={[]}
              rows={[
                ['アポ → 商談 転換率', `${funnel.conversionRates.meeting}%`],
                ['商談 → 提案 転換率', `${funnel.conversionRates.proposal}%`],
                ['提案 → 受注 転換率', `${funnel.conversionRates.order}%`],
              ]}
            />
          </Accordion>
        </div>
      )}

      {tab === 'cf' && (
        <div>
          <Accordion title="入金予定（案件別・確度別）" defaultOpen>
            <DataTable
              headers={['取引先', '金額', '確度']}
              rows={[
                ...invoicedDeals.slice(0, 6).map((d, i) => [
                  d.clientName,
                  `${r(d.amount)}万円`,
                  <span key={`p${i}`} className={d.probability >= 80 ? 'text-blue-600 font-semibold' : 'text-gray-500'}>{d.probability}%</span>,
                ] as (string | React.ReactNode)[]),
                ['確度加重合計', formatYen(cf.expectedPayment), ''],
              ]}
            />
          </Accordion>

          <Accordion
            title={`未納（滞留）— ${overdues.length}件${overdues.length > 0 ? ' ⚠' : ''}`}
            alert={overdues.length > 0}
          >
            {overdues.length === 0 ? (
              <p className="text-sm text-gray-500 font-semibold">未納なし</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">取引先</th>
                      <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">金額</th>
                      <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">遅延日数</th>
                      <th className="text-left py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">担当</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdues.map(({ client, amount, delay, assignee }) => {
                      const days = parseInt(delay);
                      const isCritical = days >= 30;
                      return (
                        <tr key={client} className={`border-b border-gray-100 last:border-0 ${isCritical ? 'bg-red-50' : ''}`}>
                          <td className="py-2.5 pr-3 font-semibold text-gray-900 text-xs">{client}</td>
                          <td className="py-2.5 px-2 text-right font-semibold text-red-700 text-xs">{amount}</td>
                          <td className={`py-2.5 px-2 text-right text-xs font-semibold ${isCritical ? 'text-red-700' : 'text-gray-500'}`}>{delay}</td>
                          <td className="py-2.5 pl-2 text-xs text-gray-600">{assignee}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Accordion>

          <Accordion title="4週ローリング（週別）">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">期間</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">入金予定</th>
                    <th className="text-right py-2 px-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">支払予定</th>
                    <th className="text-right py-2 pl-2 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">収支</th>
                  </tr>
                </thead>
                <tbody>
                  {rollingWeeks.map(({ week, income, expense, net, ok }) => (
                    <tr key={week} className={`border-b border-gray-100 last:border-0 ${!ok ? 'bg-red-50' : ''}`}>
                      <td className="py-2.5 pr-3 text-xs font-semibold text-gray-900">{week}</td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-700">{income}</td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-700">{expense}</td>
                      <td className={`py-2.5 pl-2 text-right text-xs font-semibold ${ok ? 'text-blue-600' : 'text-red-700'}`}>{net}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>

          <Accordion title="損益分岐点・安全余裕率">
            <DataTable
              headers={[]}
              rows={[
                ['固定費',         formatYen(pl.sgaExpenses.actual)],
                ['変動費（原価）',  formatYen(cogs)],
                ['限界利益',        formatYen(marginalProfit)],
                ['損益分岐点（推計）', `${breakEvenPoint.toLocaleString()}万円`],
                ['損益分岐点比率', `${breakEvenRatio}%`],
                ['安全余裕率',     `${safetyMargin > 0 ? safetyMargin : 0}%`],
              ]}
            />
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500">安全余裕率判定</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${
                  safetyMargin >= 20 ? 'border border-blue-600 text-blue-600' :
                  safetyMargin >= 5  ? 'border border-gray-500 text-gray-500' :
                  'border border-gray-900 text-gray-900'
                }`}>
                  {safetyMargin >= 20 ? '安全' : safetyMargin >= 5 ? '注意' : '危険'}
                </span>
              </div>
            </div>
          </Accordion>
        </div>
      )}
    </div>
  );
}
