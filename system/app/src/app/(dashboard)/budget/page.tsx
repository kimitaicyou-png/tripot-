'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { parseMfCsv, aggregateByCategory } from '@/lib/mfCsvParser';
import { simulate13WeekCf, calcEffectiveTax } from '@/lib/cashflow';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const MONTHS = ['4月','5月','6月','7月','8月','9月','10月','11月','12月','1月','2月','3月'];
const CURRENT_MONTH_INDEX = 0;

const LAST_YEAR_MONTHLY = {
  revenue: [0,0,0,0,0,0,0,0,0,0,0,0],
  cogs:    [0,0,0,0,0,0,0,0,0,0,0,0],
  sga:     [0,0,0,0,0,0,0,0,0,0,0,0],
  labels:  ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
};

const LAST_YEAR_SEGMENTS: { name: string; amount: number }[] = [];

const LY_REVENUE = LAST_YEAR_MONTHLY.revenue.reduce((a, b) => a + b, 0);
const LY_COGS    = LAST_YEAR_MONTHLY.cogs.reduce((a, b) => a + b, 0);
const LY_SGA     = LAST_YEAR_MONTHLY.sga.reduce((a, b) => a + b, 0);
const LY_GROSS   = LY_REVENUE - LY_COGS;
const LY_OP      = LY_GROSS - LY_SGA;

const STEPS = ['取込＆確認', 'ヒアリング', 'AI提案＋CF予測'] as const;
type Step = 0 | 1 | 2;

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtYen(n: number) {
  return `¥${Math.round(n).toLocaleString()}万`;
}

type MonthlyRow = {
  id: string;
  name: string;
  values: number[];
};

function makeRow(name: string, values: number[]): MonthlyRow {
  return { id: crypto.randomUUID(), name, values };
}

function rowTotal(row: MonthlyRow): number {
  return row.values.reduce((a, b) => a + b, 0);
}

function colSum(rows: MonthlyRow[], col: number): number {
  return rows.reduce((a, r) => a + (r.values[col] ?? 0), 0);
}

function rowTotals(rows: MonthlyRow[]): number[] {
  return MONTHS.map((_, i) => colSum(rows, i));
}

function totalSum(rows: MonthlyRow[]): number {
  return rows.reduce((a, r) => a + rowTotal(r), 0);
}

const ZEROS12 = [0,0,0,0,0,0,0,0,0,0,0,0];

const INITIAL_SEGMENTS: MonthlyRow[] = [
  makeRow('制作・デザイン',   [...ZEROS12]),
  makeRow('システム開発',     [...ZEROS12]),
  makeRow('保守・運用',       [...ZEROS12]),
  makeRow('コンサルティング', [...ZEROS12]),
  makeRow('その他',           [...ZEROS12]),
];

const INITIAL_COGS: MonthlyRow[] = [
  makeRow('仕入高',     [...ZEROS12]),
  makeRow('業務委託費', [...ZEROS12]),
];

const INITIAL_LABOR: MonthlyRow[] = [
  makeRow('役員報酬',   [...ZEROS12]),
  makeRow('給料手当',   [...ZEROS12]),
  makeRow('賞与',       [...ZEROS12]),
  makeRow('法定福利費', [...ZEROS12]),
  makeRow('福利厚生費', [...ZEROS12]),
];

const INITIAL_ADMIN: MonthlyRow[] = [
  makeRow('地代家賃',   [...ZEROS12]),
  makeRow('通信費',     [...ZEROS12]),
  makeRow('交際費',     [...ZEROS12]),
  makeRow('旅費交通費', [...ZEROS12]),
  makeRow('広告宣伝費', [...ZEROS12]),
  makeRow('消耗品費',   [...ZEROS12]),
  makeRow('支払手数料', [...ZEROS12]),
  makeRow('減価償却費', [...ZEROS12]),
  makeRow('保険料',     [...ZEROS12]),
  makeRow('租税公課',   [...ZEROS12]),
  makeRow('その他管理費',[...ZEROS12]),
];

const INITIAL_OTHER_INCOME: MonthlyRow[] = [
  makeRow('受取利息', [...ZEROS12]),
  makeRow('雑収入',   [...ZEROS12]),
];

const INITIAL_OTHER_EXPENSE: MonthlyRow[] = [
  makeRow('支払利息', [...ZEROS12]),
  makeRow('雑損失',   [...ZEROS12]),
];

const INITIAL_HEADCOUNT: MonthlyRow[] = [
  makeRow('正社員', [...ZEROS12]),
  makeRow('その他', [...ZEROS12]),
  makeRow('派遣',   [...ZEROS12]),
];

type HearingData = {
  currentHeadcount: number;
  planningHire: boolean;
  hireCount: number;
  hireTimeline: '今期中' | '来期' | '未定';
  targetGrowthPct: number;
  currentCash: number;
  arDays: number;
  apDays: number;
  loanMonthlyRepayment: number;
};

const DEFAULT_HEARING: HearingData = {
  currentHeadcount: 4,
  planningHire: false,
  hireCount: 1,
  hireTimeline: '今期中',
  targetGrowthPct: 15,
  currentCash: 0,
  arDays: 45,
  apDays: 30,
  loanMonthlyRepayment: 0,
};

const INVESTMENT_AREA_OPTIONS = ['人材採用', '設備投資', 'マーケティング', 'システム開発', 'なし'];

function NumberInput({
  value,
  onChange,
  highlight,
}: {
  value: number;
  onChange: (v: number) => void;
  highlight: boolean;
}) {
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      placeholder="0"
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        onChange(isNaN(n) ? 0 : n);
      }}
      className={`w-16 text-right text-sm text-gray-900 placeholder:text-gray-500 border-0 focus:ring-1 focus:ring-blue-500 focus:bg-blue-50 rounded px-1 py-0.5 tabular-nums bg-transparent outline-none ${highlight ? 'bg-blue-50/60' : ''}`}
    />
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-100">
      <span className="text-base">{icon}</span>
      <span className="text-sm font-semibold text-gray-700">{title}</span>
    </div>
  );
}

function SubtotalRow({ label, values, highlight, double }: { label: string; values: number[]; highlight?: boolean; double?: boolean }) {
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <tr className={`border-t-2 ${double ? 'border-t-4' : ''} border-gray-300 ${highlight ? 'bg-blue-50' : 'bg-gray-50'}`}>
      <td className={`sticky left-0 z-10 text-sm font-semibold px-3 py-1.5 whitespace-nowrap ${highlight ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
        {label}
      </td>
      {values.map((v, i) => (
        <td key={i} className={`text-right text-sm font-semibold tabular-nums px-2 py-1.5 ${i === CURRENT_MONTH_INDEX ? 'bg-blue-50' : highlight ? 'bg-blue-50' : 'bg-gray-50'} ${highlight ? 'text-blue-800' : 'text-gray-700'}`}>
          {fmt(v)}
        </td>
      ))}
      <td className={`text-right text-sm font-semibold tabular-nums px-3 py-1.5 ${highlight ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
        {fmt(total)}
      </td>
    </tr>
  );
}

function PctRow({ label, numerators, denominators }: { label: string; numerators: number[]; denominators: number[] }) {
  const totalNum = numerators.reduce((a, b) => a + b, 0);
  const totalDen = denominators.reduce((a, b) => a + b, 0);
  return (
    <tr className="bg-gray-50 border-t border-gray-100">
      <td className="sticky left-0 z-10 text-sm text-gray-500 px-3 py-1 whitespace-nowrap bg-gray-50">{label}</td>
      {numerators.map((n, i) => {
        const d = denominators[i] ?? 0;
        const pct = d === 0 ? 0 : Math.round((n / d) * 100);
        return (
          <td key={i} className={`text-right text-xs text-gray-500 tabular-nums px-2 py-1 ${i === CURRENT_MONTH_INDEX ? 'bg-blue-50' : ''}`}>
            {pct}%
          </td>
        );
      })}
      <td className="text-right text-xs text-gray-500 tabular-nums px-3 py-1">
        {totalDen === 0 ? '—' : `${Math.round((totalNum / totalDen) * 100)}%`}
      </td>
    </tr>
  );
}

function EditableSection({
  rows,
  onChange,
  onAddRow,
  onDeleteRow,
  addLabel,
}: {
  rows: MonthlyRow[];
  onChange: (id: string, col: number, value: number) => void;
  onAddRow?: () => void;
  onDeleteRow?: (id: string) => void;
  addLabel?: string;
}) {
  return (
    <>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-t border-gray-100 hover:bg-gray-50/50 group">
            <td className="sticky left-0 z-10 bg-white group-hover:bg-gray-50/50 px-0 py-0">
              <div className="flex items-center gap-1 px-2 py-1.5">
                {onDeleteRow && (
                  <button
                    onClick={() => onDeleteRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 text-xs w-4 h-4 flex items-center justify-center flex-shrink-0 transition-opacity"
                    title="削除"
                  >
                    ×
                  </button>
                )}
                <span className="text-sm text-gray-700 whitespace-nowrap">{row.name}</span>
              </div>
            </td>
            {row.values.map((v, i) => (
              <td key={i} className={`px-1 py-1 ${i === CURRENT_MONTH_INDEX ? 'bg-blue-50' : ''}`}>
                <NumberInput
                  value={v}
                  onChange={(val) => onChange(row.id, i, val)}
                  highlight={i === CURRENT_MONTH_INDEX}
                />
              </td>
            ))}
            <td className="text-right text-sm font-semibold tabular-nums px-3 py-1.5 bg-gray-50 text-gray-700">
              {fmt(rowTotal(row))}
            </td>
          </tr>
        ))}
      </tbody>
      {onAddRow && (
        <tfoot>
          <tr>
            <td colSpan={MONTHS.length + 2} className="px-3 py-2">
              <button
                onClick={onAddRow}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <span className="text-base leading-none">+</span>
                {addLabel ?? '科目を追加'}
              </button>
            </td>
          </tr>
        </tfoot>
      )}
    </>
  );
}

function TableHeader() {
  return (
    <thead>
      <tr className="border-b border-gray-200">
        <th className="sticky left-0 z-20 bg-gray-50 text-left text-xs font-semibold text-gray-500 px-3 py-2 whitespace-nowrap min-w-[140px]">
          科目
        </th>
        {MONTHS.map((m, i) => (
          <th
            key={i}
            className={`text-right text-xs font-semibold text-gray-500 px-2 py-2 whitespace-nowrap min-w-[68px] ${i === CURRENT_MONTH_INDEX ? 'bg-blue-50 text-blue-600' : 'bg-gray-50'}`}
          >
            {m}
          </th>
        ))}
        <th className="text-right text-xs font-semibold text-gray-500 px-3 py-2 whitespace-nowrap bg-gray-100 min-w-[72px]">
          合計
        </th>
      </tr>
    </thead>
  );
}

function PLSummary({
  revenue,
  gross,
  opIncome,
  ordinaryIncome,
}: {
  revenue: number;
  gross: number;
  opIncome: number;
  ordinaryIncome: number;
}) {
  const grossRate = revenue === 0 ? 0 : Math.round((gross / revenue) * 100);
  return (
    <div className="sticky top-0 -mx-4 px-4 z-40 bg-gray-50/95 backdrop-blur-md pt-2 pb-3">
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex flex-wrap gap-x-8 gap-y-2 items-center">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-2">年間PL</span>
      {[
        { label: '売上', value: revenue, color: 'text-gray-900' },
        { label: `粗利 (${grossRate}%)`, value: gross, color: 'text-gray-900' },
        { label: '営業利益', value: opIncome, color: opIncome >= 0 ? 'text-blue-700' : 'text-red-600' },
        { label: '経常利益', value: ordinaryIncome, color: ordinaryIncome >= 0 ? 'text-blue-700' : 'text-red-600' },
      ].map(({ label, value, color }) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <span className="text-xs text-gray-500">{label}</span>
          <span className={`text-base font-semibold tabular-nums ${color}`}>¥{fmt(value)}万</span>
        </div>
      ))}
    </div>
    </div>
  );
}

type SavedPlan = { segments: MonthlyRow[]; cogs: MonthlyRow[]; labor: MonthlyRow[]; admin: MonthlyRow[]; otherIncome: MonthlyRow[]; otherExpense: MonthlyRow[]; headcount: MonthlyRow[] };

async function fetchSavedPlan(): Promise<SavedPlan | null> {
  try {
    const r = await fetch('/api/budget');
    if (!r.ok) return null;
    const data = await r.json();
    return (data.plan as SavedPlan | null) ?? null;
  } catch { return null; }
}

async function savePlanToApi(plan: SavedPlan, fiscalYear: number): Promise<boolean> {
  try {
    const r = await fetch('/api/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, fiscalYear }),
    });
    return r.ok;
  } catch { return false; }
}

function BudgetPlanTab() {
  const [segments, setSegments] = useState<MonthlyRow[]>(INITIAL_SEGMENTS);
  const [cogs, setCogs] = useState<MonthlyRow[]>(INITIAL_COGS);
  const [labor, setLabor] = useState<MonthlyRow[]>(INITIAL_LABOR);
  const [admin, setAdmin] = useState<MonthlyRow[]>(INITIAL_ADMIN);
  const [otherIncome, setOtherIncome] = useState<MonthlyRow[]>(INITIAL_OTHER_INCOME);
  const [otherExpense, setOtherExpense] = useState<MonthlyRow[]>(INITIAL_OTHER_EXPENSE);
  const [headcount, setHeadcount] = useState<MonthlyRow[]>(INITIAL_HEADCOUNT);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const plan = await fetchSavedPlan();
      if (plan) {
        if (plan.segments) setSegments(plan.segments);
        if (plan.cogs) setCogs(plan.cogs);
        if (plan.labor) setLabor(plan.labor);
        if (plan.admin) setAdmin(plan.admin);
        if (plan.otherIncome) setOtherIncome(plan.otherIncome);
        if (plan.otherExpense) setOtherExpense(plan.otherExpense);
        if (plan.headcount) setHeadcount(plan.headcount);
        try { localStorage.setItem('budget_plan', JSON.stringify(plan)); } catch {}
      }
      setLoaded(true);
    })();
  }, []);

  function updateRow(
    setter: React.Dispatch<React.SetStateAction<MonthlyRow[]>>
  ) {
    return (id: string, col: number, value: number) => {
      setter((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, values: r.values.map((v, i) => (i === col ? value : v)) }
            : r
        )
      );
    };
  }

  function addRow(setter: React.Dispatch<React.SetStateAction<MonthlyRow[]>>, name: string) {
    setter((prev) => [...prev, makeRow(name, Array(12).fill(0))]);
  }

  function deleteRow(setter: React.Dispatch<React.SetStateAction<MonthlyRow[]>>) {
    return (id: string) => setter((prev) => prev.filter((r) => r.id !== id));
  }

  const revenueByMonth  = rowTotals(segments);
  const cogsByMonth     = rowTotals(cogs);
  const laborByMonth    = rowTotals(labor);
  const adminByMonth    = rowTotals(admin);
  const sgaByMonth      = MONTHS.map((_, i) => laborByMonth[i] + adminByMonth[i]);
  const grossByMonth    = MONTHS.map((_, i) => revenueByMonth[i] - cogsByMonth[i]);
  const opIncomeByMonth = MONTHS.map((_, i) => grossByMonth[i] - sgaByMonth[i]);
  const otherIncByMonth = rowTotals(otherIncome);
  const otherExpByMonth = rowTotals(otherExpense);
  const ordinaryByMonth = MONTHS.map((_, i) => opIncomeByMonth[i] + otherIncByMonth[i] - otherExpByMonth[i]);

  const totalRevenue  = totalSum(segments);
  const totalCogs     = totalSum(cogs);
  const totalLabor    = totalSum(labor);
  const totalAdmin    = totalSum(admin);
  const totalSga      = totalLabor + totalAdmin;
  const totalGross    = totalRevenue - totalCogs;
  const totalOpIncome = totalGross - totalSga;
  const totalOtherInc = totalSum(otherIncome);
  const totalOtherExp = totalSum(otherExpense);
  const totalOrdinary = totalOpIncome + totalOtherInc - totalOtherExp;

  const fixedCost   = totalLabor + totalAdmin;
  const varCost     = totalCogs;
  const marginal    = totalRevenue - varCost;
  const marginalRate = totalRevenue === 0 ? 0 : marginal / totalRevenue;
  const bep         = marginalRate === 0 ? 0 : Math.round(fixedCost / marginalRate);
  const safetyMargin = totalRevenue === 0 ? 0 : Math.round(((totalRevenue - bep) / totalRevenue) * 100);

  async function handleSave() {
    setSaveError(null);
    const data: SavedPlan = { segments, cogs, labor, admin, otherIncome, otherExpense, headcount };
    const fiscalYear = new Date().getFullYear();
    const ok = await savePlanToApi(data, fiscalYear);
    if (ok) {
      try { localStorage.setItem('budget_plan', JSON.stringify(data)); } catch {}
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      setSaveError('保存に失敗しました（権限がないか、ネットワークエラー）');
    }
  }

  return (
    <div className="space-y-6">
      <PLSummary
        revenue={totalRevenue}
        gross={totalGross}
        opIncome={totalOpIncome}
        ordinaryIncome={totalOrdinary}
      />

      <div className="flex items-center gap-3 justify-end">
        <span className="text-xs text-gray-500 mr-auto">💾 保存先: クラウドDB（全メンバー共有）</span>
        {saveError && <span className="text-xs text-red-600 font-semibold">{saveError}</span>}
        {!loaded && <span className="text-xs text-gray-500">読込中...</span>}
        <button
          onClick={handleSave}
          disabled={!loaded}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saved ? <span>✓ 保存済み</span> : <><span>💾</span> 保存</>}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="📊" title="売上高（セグメント別）" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <EditableSection
              rows={segments}
              onChange={updateRow(setSegments)}
              onAddRow={() => addRow(setSegments, '新セグメント')}
              onDeleteRow={deleteRow(setSegments)}
              addLabel="セグメントを追加"
            />
            <tfoot>
              <SubtotalRow label="売上高 合計" values={revenueByMonth} />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="📋" title="売上原価" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <EditableSection
              rows={cogs}
              onChange={updateRow(setCogs)}
              onAddRow={() => addRow(setCogs, '新科目')}
              onDeleteRow={deleteRow(setCogs)}
            />
            <tfoot>
              <SubtotalRow label="原価合計" values={cogsByMonth} />
              <SubtotalRow label="売上総利益（粗利）" values={grossByMonth} highlight />
              <PctRow label="粗利率" numerators={grossByMonth} denominators={revenueByMonth} />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="👥" title="労務費" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <EditableSection
              rows={labor}
              onChange={updateRow(setLabor)}
              onAddRow={() => addRow(setLabor, '新科目')}
              onDeleteRow={deleteRow(setLabor)}
            />
            <tfoot>
              <SubtotalRow label="労務費合計" values={laborByMonth} />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="🏢" title="管理費" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <EditableSection
              rows={admin}
              onChange={updateRow(setAdmin)}
              onAddRow={() => addRow(setAdmin, '新科目')}
              onDeleteRow={deleteRow(setAdmin)}
            />
            <tfoot>
              <SubtotalRow label="管理費合計" values={adminByMonth} />
              <SubtotalRow label="販管費合計" values={sgaByMonth} />
              <SubtotalRow label="営業利益" values={opIncomeByMonth} highlight double />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="📈" title="営業外収益・支出" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <tbody>
              <tr>
                <td
                  colSpan={MONTHS.length + 2}
                  className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white"
                >
                  収益
                </td>
              </tr>
            </tbody>
            <EditableSection
              rows={otherIncome}
              onChange={updateRow(setOtherIncome)}
            />
            <tbody>
              <tr>
                <td
                  colSpan={MONTHS.length + 2}
                  className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-white border-t border-gray-100"
                >
                  支出
                </td>
              </tr>
            </tbody>
            <EditableSection
              rows={otherExpense}
              onChange={updateRow(setOtherExpense)}
            />
            <tfoot>
              <SubtotalRow label="経常利益" values={ordinaryByMonth} highlight double />
            </tfoot>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="📊" title="経営効率指標（自動計算）" />
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: '固定費', value: fixedCost, unit: '万/年', color: 'text-gray-900' },
            { label: '変動費', value: varCost, unit: '万/年', color: 'text-gray-900' },
            { label: '限界利益', value: marginal, unit: '万/年', color: 'text-blue-700' },
            { label: '損益分岐点売上高', value: bep, unit: '万/年', color: totalRevenue > bep ? 'text-green-700' : 'text-red-600' },
            { label: '限界利益率', value: Math.round(marginalRate * 100), unit: '%', color: 'text-gray-900', isPct: true },
            { label: '安全余裕率', value: safetyMargin, unit: '%', color: safetyMargin >= 20 ? 'text-green-700' : safetyMargin >= 10 ? 'text-yellow-700' : 'text-red-600', isPct: true },
          ].map(({ label, value, unit, color, isPct }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className={`text-lg font-semibold tabular-nums ${color}`}>
                {isPct ? `${value}${unit}` : `¥${fmt(value)}${unit}`}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <SectionHeader icon="👥" title="要員計画（人数）" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <TableHeader />
            <EditableSection
              rows={headcount}
              onChange={updateRow(setHeadcount)}
            />
          </table>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        const isLast = i === STEPS.length - 1;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  done   ? 'bg-blue-600 text-white' :
                  active ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                           'bg-gray-200 text-gray-500'
                }`}
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${active ? 'text-blue-600' : done ? 'text-gray-500' : 'text-gray-500'}`}>
                {label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-10 h-0.5 mb-5 mx-1 transition-all ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type ImportedLastYear = {
  revenue: number[];
  cogs: number[];
  labor: number[];
  admin: number[];
  otherIncome: number[];
  otherExpense: number[];
} | null;

function Step1({ onNext, onImport }: { onNext: () => void; onImport: (data: NonNullable<ImportedLastYear>) => void }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [imported, setImported] = useState<NonNullable<ImportedLastYear> | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [manual, setManual] = useState({ revenue: 0, cogs: 0, labor: 0, admin: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseMfCsv(text);
    const agg = aggregateByCategory(parsed.rows);
    setImported(agg);
    setWarnings(parsed.warnings);
    onImport(agg);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  function applyManualFallback() {
    const monthly = (annual: number) => Array.from({ length: 12 }, () => Math.round(annual / 12));
    const data = {
      revenue: monthly(manual.revenue),
      cogs: monthly(manual.cogs),
      labor: monthly(manual.labor),
      admin: monthly(manual.admin),
      otherIncome: Array(12).fill(0),
      otherExpense: Array(12).fill(0),
    };
    setImported(data);
    onImport(data);
  }

  const hasData = !!imported && imported.revenue.reduce((s, v) => s + v, 0) > 0;
  const totalRev = imported ? imported.revenue.reduce((s, v) => s + v, 0) : 0;
  const totalCogs = imported ? imported.cogs.reduce((s, v) => s + v, 0) : 0;
  const totalSga = imported ? imported.labor.reduce((s, v) => s + v, 0) + imported.admin.reduce((s, v) => s + v, 0) : 0;
  const totalGross = totalRev - totalCogs;
  const totalOp = totalGross - totalSga;
  const grossRate = totalRev > 0 ? Math.round((totalGross / totalRev) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">昨年実績の取り込み</h2>
        <p className="text-sm text-gray-500 mt-1">MFクラウドCSVをアップロードするか、年間合計を手入力してください</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <div className="text-3xl mb-2">📎</div>
        {fileName ? (
          <p className="text-sm font-semibold text-blue-600">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700">MFクラウド CSVファイルをドロップ</p>
            <p className="text-xs text-gray-500 mt-1">月別試算表（勘定科目×12ヶ月）形式</p>
          </>
        )}
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">⚠ 警告 ({warnings.length}件)</p>
          {warnings.slice(0, 5).map((w, i) => <p key={i}>・{w}</p>)}
          {warnings.length > 5 && <p className="text-gray-500">...他 {warnings.length - 5} 件</p>}
        </div>
      )}

      {!hasData && (
        <div className="border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">または 年間合計を手入力</p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'revenue', label: '売上高' },
              { key: 'cogs', label: '売上原価' },
              { key: 'labor', label: '人件費（年間）' },
              { key: 'admin', label: '管理費（年間）' },
            ] as const).map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  type="number"
                  value={manual[f.key]}
                  onChange={(e) => setManual((prev) => ({ ...prev, [f.key]: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-right tabular-nums"
                  placeholder="0"
                />
              </div>
            ))}
          </div>
          <button
            onClick={applyManualFallback}
            disabled={manual.revenue === 0}
            className="w-full py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            手入力値で確定
          </button>
        </div>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '売上', value: totalRev, sub: null },
              { label: '粗利', value: totalGross, sub: `粗利率${grossRate}%` },
              { label: '営業利益', value: totalOp, sub: null },
            ].map(({ label, value, sub }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-xs text-gray-500 mb-1">{label}</div>
                <div className="text-base font-semibold text-gray-900 tabular-nums">¥{Math.round(value).toLocaleString()}</div>
                {sub && <div className="text-[11px] text-blue-600 mt-0.5 font-medium">{sub}</div>}
              </div>
            ))}
          </div>
          <button
            onClick={onNext}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            次へ: ヒアリング
          </button>
        </>
      )}
    </div>
  );
}

function LegacyStep2Unused({ onNext }: { onNext: () => void }) {
  const chartData = LAST_YEAR_MONTHLY.labels.map((label, i) => ({
    month: label,
    売上:  LAST_YEAR_MONTHLY.revenue[i],
    原価:  LAST_YEAR_MONTHLY.cogs[i],
    販管費: LAST_YEAR_MONTHLY.sga[i],
  }));

  const grossRate = LY_REVENUE > 0 ? Math.round((LY_GROSS / LY_REVENUE) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">昨年の実績（2025年）</h2>
        <p className="text-sm text-gray-500 mt-1">インポートされた試算表の確認</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '売上',     value: fmtYen(LY_REVENUE), sub: null },
          { label: '粗利',     value: fmtYen(LY_GROSS),   sub: `粗利率${grossRate}%` },
          { label: '営業利益', value: fmtYen(LY_OP),       sub: null },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-base font-semibold text-gray-900">{value}</div>
            {sub && <div className="text-[11px] text-blue-600 mt-0.5 font-medium">{sub}</div>}
          </div>
        ))}
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">月別推移</div>
        <ResponsiveContainer minWidth={0} width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value) => [`${value ?? ''}万円`, ''] as [string, string]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="売上"  fill="#3b82f6" radius={[3,3,0,0]} />
            <Bar dataKey="原価"  fill="#f87171" radius={[3,3,0,0]} />
            <Bar dataKey="販管費" fill="#fb923c" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">科目別内訳</div>
        {[
          { label: '売上高',   value: LY_REVENUE, pct: null,                              indent: 0 },
          { label: '売上原価', value: LY_COGS,    pct: LY_REVENUE > 0 ? Math.round(LY_COGS / LY_REVENUE * 100) : 0, indent: 0 },
          { label: '販管費',   value: LY_SGA,     pct: null,                              indent: 0 },
          { label: '└ 人件費', value: 0,          pct: null,                              indent: 1 },
          { label: '└ 家賃',   value: 0,          pct: null,                              indent: 1 },
          { label: '└ その他', value: 0,          pct: null,                              indent: 1 },
          { label: '営業利益', value: LY_OP,      pct: null,                              indent: 0 },
        ].map(({ label, value, pct, indent }) => {
          const isOp = label === '営業利益';
          return (
            <div key={label} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-100 ${isOp ? 'bg-blue-50' : ''}`}>
              <span className={`text-sm ${indent ? 'pl-4 text-gray-600' : 'text-gray-700 font-medium'}`}>{label}</span>
              <div className="flex items-center gap-3">
                {pct !== null && <span className="text-xs text-gray-600">({pct}%)</span>}
                <span className={`text-sm font-semibold tabular-nums ${isOp ? 'text-blue-700' : 'text-gray-900'}`}>{fmtYen(value)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        次へ: ヒアリング
      </button>
    </div>
  );
}

function StepHearing({
  data,
  onChange,
  onNext,
}: {
  data: HearingData;
  onChange: (d: HearingData) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">ヒアリング</h2>
        <p className="text-sm text-gray-500 mt-1">予算とCF予測に必要な最小項目のみ</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">現在のメンバー数（正社員＋業務委託）</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={data.currentHeadcount}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                onChange({ ...data, currentHeadcount: isNaN(n) || n < 1 ? 1 : n });
              }}
              className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
            />
            <span className="text-sm text-gray-500">名</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">増員予定</label>
          <div className="flex gap-2 mb-3">
            {(['あり', 'なし'] as const).map((opt) => {
              const active = opt === 'あり' ? data.planningHire : !data.planningHire;
              return (
                <button
                  key={opt}
                  onClick={() => onChange({ ...data, planningHire: opt === 'あり' })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] ${
                    active
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          {data.planningHire && (
            <div className="pl-4 border-l-2 border-blue-100 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={data.hireCount}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    onChange({ ...data, hireCount: isNaN(n) || n < 1 ? 1 : n });
                  }}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
                />
                <span className="text-sm text-gray-500">人増やす</span>
              </div>
              <select
                value={data.hireTimeline}
                onChange={(e) => onChange({ ...data, hireTimeline: e.target.value as HearingData['hireTimeline'] })}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="今期中">今期中</option>
                <option value="来期">来期</option>
                <option value="未定">未定</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">目標成長率</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={data.targetGrowthPct}
              min={-50}
              max={200}
              onChange={(e) => onChange({ ...data, targetGrowthPct: Number(e.target.value) || 0 })}
              className="w-24 px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">キャッシュフロー設定</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">現預金残高（円）</label>
              <input
                type="number"
                value={data.currentCash}
                onChange={(e) => onChange({ ...data, currentCash: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">借入月次返済（円）</label>
              <input
                type="number"
                value={data.loanMonthlyRepayment}
                onChange={(e) => onChange({ ...data, loanMonthlyRepayment: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">売掛金回収日数（日）</label>
              <input
                type="number"
                value={data.arDays}
                onChange={(e) => onChange({ ...data, arDays: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">買掛金支払日数（日）</label>
              <input
                type="number"
                value={data.apDays}
                onChange={(e) => onChange({ ...data, apDays: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm tabular-nums"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        次へ: AI提案＋CF予測
      </button>
    </div>
  );
}


type BudgetNumbers = {
  revenue: number;
  cogs: number;
  sga: number;
  segments: { name: string; budget: number }[];
};

function computeBudget(growthRate: number): BudgetNumbers {
  const g = 1 + growthRate / 100;
  const cogsRate = LY_REVENUE > 0 ? LY_COGS / LY_REVENUE : 0;
  const sgaGrowth = 1.06;
  return {
    revenue:  Math.round(LY_REVENUE * g),
    cogs:     Math.round(LY_REVENUE * g * cogsRate),
    sga:      Math.round(LY_SGA * sgaGrowth),
    segments: LAST_YEAR_SEGMENTS.map((s) => ({ name: s.name, budget: Math.round(s.amount * g) })),
  };
}

function computeFeasibility(annualGross: number, totalHeadcount: number): {
  level: '高' | '中' | '低';
  grossPerPersonMonthly: number;
} {
  const monthly = totalHeadcount === 0 ? 0 : Math.round(annualGross / totalHeadcount / 12);
  let level: '高' | '中' | '低';
  if (monthly > 120) {
    level = '低';
  } else if (monthly >= 50) {
    level = '中';
  } else {
    level = '高';
  }
  return { level, grossPerPersonMonthly: monthly };
}

function FeasibilityBadge({ level }: { level: '高' | '中' | '低' }) {
  const styles = {
    高: 'bg-green-100 text-green-700 border border-green-200',
    中: 'bg-amber-100 text-amber-700 border border-amber-200',
    低: 'bg-red-100 text-red-700 border border-red-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${styles[level]}`}>
      実現可能性: {level}
    </span>
  );
}

function EditableCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState('');

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = parseInt(raw, 10);
          if (!isNaN(n) && n > 0) onChange(n);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') setEditing(false);
        }}
        className="w-full text-right bg-white border-0 ring-2 ring-blue-500 rounded px-2 py-1 text-sm font-semibold text-blue-700 focus:outline-none tabular-nums"
      />
    );
  }

  return (
    <button
      onClick={() => { setRaw(String(value)); setEditing(true); }}
      className="w-full text-right px-2 py-1 text-sm font-semibold text-blue-700 bg-gray-50 rounded hover:bg-blue-50 transition-colors tabular-nums"
    >
      {fmtYen(value)}
    </button>
  );
}

function Step4({ hearingData, importedLastYear, onApply }: { hearingData: HearingData; importedLastYear: NonNullable<ImportedLastYear>; onApply: (plan: { segments: MonthlyRow[]; cogs: MonthlyRow[]; labor: MonthlyRow[]; admin: MonthlyRow[]; otherIncome: MonthlyRow[]; otherExpense: MonthlyRow[]; headcount: MonthlyRow[] }) => Promise<void> }) {
  const [growthRate, setGrowthRate] = useState(hearingData.targetGrowthPct);
  const [reflected, setReflected] = useState(false);
  const [applying, setApplying] = useState(false);

  const lyRevenue = importedLastYear.revenue.reduce((s, v) => s + v, 0);
  const lyCogs = importedLastYear.cogs.reduce((s, v) => s + v, 0);
  const lyLabor = importedLastYear.labor.reduce((s, v) => s + v, 0);
  const lyAdmin = importedLastYear.admin.reduce((s, v) => s + v, 0);
  const lySga = lyLabor + lyAdmin;
  const lyGross = lyRevenue - lyCogs;
  const lyOp = lyGross - lySga;
  const lyGrossRate = lyRevenue > 0 ? Math.round((lyGross / lyRevenue) * 100) : 0;
  const cogsRate = lyRevenue > 0 ? lyCogs / lyRevenue : 0;

  const g = 1 + growthRate / 100;
  const sgaGrowth = hearingData.planningHire ? 1 + (hearingData.hireCount * 0.12) : 1.03;

  const budget = {
    revenue: Math.round(lyRevenue * g),
    cogs: Math.round(lyRevenue * g * cogsRate),
    sga: Math.round(lySga * sgaGrowth),
  };
  const [budgetOverride, setBudgetOverride] = useState<{ revenue: number; cogs: number; sga: number } | null>(null);
  const effBudget = budgetOverride ?? budget;

  const gross = effBudget.revenue - effBudget.cogs;
  const op = gross - effBudget.sga;
  const budgetGrossRate = effBudget.revenue > 0 ? Math.round((gross / effBudget.revenue) * 100) : 0;
  const tax = calcEffectiveTax(op, 0.34);
  const netProfit = op - tax;

  const totalHeadcount = hearingData.currentHeadcount + (hearingData.planningHire ? hearingData.hireCount : 0);
  const { level, grossPerPersonMonthly } = computeFeasibility(gross, totalHeadcount);

  const monthlyBudgetRevenue = importedLastYear.revenue.map((v) => Math.round(v * g));
  const monthlyBudgetCogs = importedLastYear.cogs.map((v) => Math.round(v * g));
  const monthlyBudgetSga = importedLastYear.labor.map((v, i) => Math.round((v + importedLastYear.admin[i]) * sgaGrowth));

  const cf = simulate13WeekCf({
    currentCash: hearingData.currentCash,
    arDays: hearingData.arDays,
    apDays: hearingData.apDays,
    loanMonthlyRepayment: hearingData.loanMonthlyRepayment,
    taxRate: 0.34,
    monthlyRevenue: monthlyBudgetRevenue,
    monthlyCogs: monthlyBudgetCogs,
    monthlySga: monthlyBudgetSga,
  });
  const minBalance = Math.min(...cf.map((w) => w.balance));

  async function handleApply() {
    setApplying(true);
    const toMonthlyRow = (name: string, values: number[]): MonthlyRow => ({ id: crypto.randomUUID(), name, values: values.map((v) => Math.round(v / 10000)) });
    const plan = {
      segments: [toMonthlyRow('売上', monthlyBudgetRevenue)],
      cogs: [toMonthlyRow('売上原価', monthlyBudgetCogs)],
      labor: [toMonthlyRow('人件費', importedLastYear.labor.map((v) => Math.round(v * sgaGrowth)))],
      admin: [toMonthlyRow('管理費', importedLastYear.admin.map((v) => Math.round(v * sgaGrowth)))],
      otherIncome: [toMonthlyRow('営業外収益', importedLastYear.otherIncome)],
      otherExpense: [toMonthlyRow('営業外費用', importedLastYear.otherExpense)],
      headcount: [toMonthlyRow('正社員', Array(12).fill(totalHeadcount))],
    };
    await onApply(plan);
    setReflected(true);
    setApplying(false);
    setTimeout(() => setReflected(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AIの予算提案＋CF予測</h2>
          <p className="text-sm text-gray-500 mt-1">成長率を動かすと即時反映。「反映する」で事業計画に保存</p>
        </div>
        <div className="flex-shrink-0 bg-blue-50 rounded-xl px-4 py-3 text-center min-w-[100px]">
          <div className="text-xs text-gray-500 mb-1">成長率</div>
          <div className="flex items-center gap-1 justify-center">
            <input
              type="number"
              value={growthRate}
              min={-50}
              max={200}
              onChange={(e) => { setGrowthRate(Number(e.target.value)); setBudgetOverride(null); }}
              className="w-14 text-right text-lg font-semibold text-blue-700 bg-transparent border-0 focus:outline-none focus:ring-0"
            />
            <span className="text-lg font-semibold text-blue-700">%</span>
          </div>
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <th className="text-left px-4 py-2.5 font-semibold">科目</th>
              <th className="text-right px-4 py-2.5 font-semibold">昨年実績</th>
              <th className="text-right px-4 py-2.5 font-semibold pr-4">今年予算</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: '売上',     ly: lyRevenue, editable: true,  budgetVal: effBudget.revenue, key: 'revenue' as const },
              { label: '原価',     ly: lyCogs,    editable: true,  budgetVal: effBudget.cogs,    key: 'cogs' as const },
              { label: '粗利',     ly: lyGross,   editable: false, budgetVal: gross,              key: null },
              { label: '粗利率',   ly: lyGrossRate, editable: false, budgetVal: budgetGrossRate, key: null, isPct: true },
              { label: '販管費',   ly: lySga,     editable: true,  budgetVal: effBudget.sga,     key: 'sga' as const },
              { label: '営業利益', ly: lyOp,      editable: false, budgetVal: op,                 key: null },
              { label: '法人税等(34%)', ly: Math.max(0, Math.round(lyOp * 0.34)), editable: false, budgetVal: tax, key: null },
              { label: '税引後利益', ly: lyOp - Math.max(0, Math.round(lyOp * 0.34)), editable: false, budgetVal: netProfit, key: null, final: true },
            ].map(({ label, ly, editable, budgetVal, key, isPct, final }) => {
              const isOp = label === '営業利益' || final;
              return (
                <tr key={label} className={`border-t border-gray-100 ${isOp ? 'bg-blue-50 font-semibold' : ''}`}>
                  <td className={`px-4 py-2.5 ${isOp ? 'text-blue-800 font-semibold' : 'text-gray-700 font-medium'}`}>{label}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                    {isPct ? `${ly}%` : `¥${Math.round(ly as number).toLocaleString()}`}
                  </td>
                  <td className="px-2 py-1.5 pr-2">
                    {isPct ? (
                      <div className="text-right px-2 py-1 text-sm font-semibold text-gray-900 tabular-nums">{budgetVal}%</div>
                    ) : editable && key ? (
                      <EditableCell
                        value={budgetVal as number}
                        onChange={(v) => setBudgetOverride({ ...(budgetOverride ?? budget), [key]: v })}
                      />
                    ) : (
                      <div className={`text-right px-2 py-1 text-sm font-semibold tabular-nums ${isOp ? 'text-blue-700' : 'text-gray-900'}`}>
                        ¥{Math.round(budgetVal as number).toLocaleString()}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">実現可能性チェック（粗利/人ベース）</span>
            <FeasibilityBadge level={level} />
          </div>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-700">
            1人あたり月次粗利 <span className="font-semibold tabular-nums">¥{grossPerPersonMonthly.toLocaleString()}万円</span>（{totalHeadcount}名ベース）
            <span className="text-gray-500 ml-1">— 損益分岐目安 50万円／月・人</span>
          </p>
          {level === '低' && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-700">
              1人あたり粗利が120万円/月を超えており、無理があります。原価構造または人員を見直してください。
            </div>
          )}
          {level === '中' && (
            <p className="text-sm text-gray-500">現実的な水準です。稼働率と単価をモニターしましょう。</p>
          )}
          {level === '高' && (
            <p className="text-sm text-gray-500">低めの水準です。単価アップや稼働率改善の余地があります。</p>
          )}
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">13週キャッシュフロー予測</span>
          <span className={`text-xs font-semibold ${minBalance < 0 ? 'text-red-600' : minBalance < hearingData.currentCash * 0.3 ? 'text-amber-600' : 'text-blue-600'}`}>
            最低残高 ¥{minBalance.toLocaleString()}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-500">
                <th className="px-2 py-2 text-left">週</th>
                <th className="px-2 py-2 text-right">入金</th>
                <th className="px-2 py-2 text-right">支払</th>
                <th className="px-2 py-2 text-right">残高</th>
              </tr>
            </thead>
            <tbody>
              {cf.map((w) => (
                <tr key={w.weekIdx} className="border-t border-gray-100">
                  <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{w.label}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-blue-600">¥{w.inflow.toLocaleString()}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-red-600">¥{w.outflow.toLocaleString()}</td>
                  <td className={`px-2 py-1.5 text-right tabular-nums font-semibold ${w.alert === 'danger' ? 'text-red-600' : w.alert === 'caution' ? 'text-amber-600' : 'text-gray-900'}`}>
                    ¥{w.balance.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {minBalance < 0 && (
          <div className="bg-red-50 border-t border-red-100 px-4 py-2.5 text-sm text-red-700">
            ⚠ 13週以内に資金ショートの見込み。入金サイト短縮・借入・支払交渉を検討してください。
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <div className="text-xs font-semibold text-amber-800 mb-1">AIコメント</div>
            <p className="text-sm text-amber-900 leading-relaxed">
              昨年売上 ¥{lyRevenue.toLocaleString()} に対し {growthRate}%成長を想定。原価率は昨年並みの{Math.round(cogsRate * 100)}%維持。
              販管費は{hearingData.planningHire ? `${hearingData.hireCount}名増員で` : ''}{Math.round((sgaGrowth - 1) * 100)}%増を見込み、
              営業利益 ¥{op.toLocaleString()}、法人税 ¥{tax.toLocaleString()}、税引後 ¥{netProfit.toLocaleString()}。
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <button
          onClick={handleApply}
          disabled={applying}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {applying ? '保存中...' : reflected ? '✓ 反映しました' : '事業計画に反映する'}
        </button>
      </div>
    </div>
  );
}

type ActiveTab = 'mf' | 'plan';

export default function BudgetPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('mf');
  const [step, setStep] = useState<Step>(0);
  const [hearingData, setHearingData] = useState<HearingData>(DEFAULT_HEARING);
  const [importedLastYear, setImportedLastYear] = useState<NonNullable<ImportedLastYear> | null>(null);

  async function handleWizardApply(plan: SavedPlan) {
    const fiscalYear = new Date().getFullYear();
    const ok = await savePlanToApi(plan, fiscalYear);
    if (ok) {
      try { localStorage.setItem('budget_plan', JSON.stringify(plan)); } catch {}
      setActiveTab('plan');
    }
  }

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/monthly" className="text-sm text-gray-500 hover:text-gray-900 font-medium">← 月次に戻る</Link>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">AI経営管理</div>
          <h1 className="text-2xl font-semibold text-gray-900">事業計画</h1>
          <p className="text-sm text-gray-500 mt-1">FY2026 / 4月〜3月</p>
        </div>

        <div className="flex gap-1 mb-6 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          <button
            onClick={() => setActiveTab('mf')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'mf'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>📥</span>
            MFから取込
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'plan'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>📊</span>
            事業計画
          </button>
        </div>

        {activeTab === 'mf' && (
          <>
            <StepIndicator current={step} />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
              {step === 0 && <Step1 onNext={() => setStep(1)} onImport={setImportedLastYear} />}
              {step === 1 && (
                <StepHearing
                  data={hearingData}
                  onChange={setHearingData}
                  onNext={() => setStep(2)}
                />
              )}
              {step === 2 && importedLastYear && <Step4 hearingData={hearingData} importedLastYear={importedLastYear} onApply={handleWizardApply} />}
              {step === 2 && !importedLastYear && (
                <div className="text-center text-sm text-gray-500 py-10">
                  昨年実績が必要です。<button onClick={() => setStep(0)} className="text-blue-600 font-semibold">取込に戻る</button>
                </div>
              )}
            </div>
            {step > 0 && step < 3 && (
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={() => setStep((s) => (s - 1) as Step)}
                  className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  前のステップに戻る
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'plan' && <BudgetPlanTab />}
      </div>
    </div>
  );
}
