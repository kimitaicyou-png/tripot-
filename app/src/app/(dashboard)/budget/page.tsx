'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
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

const STEPS = ['データ取り込み', '昨年実績', 'ヒアリング', 'AI生成中', '予算提案'] as const;
type Step = 0 | 1 | 2 | 3 | 4;

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
  makeRow('システム開発',     [...ZEROS12]),
  makeRow('保守・運用',       [...ZEROS12]),
  makeRow('コンサルティング', [...ZEROS12]),
  makeRow('AI導入支援',       [...ZEROS12]),
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
  revenueBase: '昨年実績ベース' | '新規事業含む' | '既存深耕のみ' | 'その他';
  fixedCostTrend: '増加見込み（移転・設備等）' | '現状維持' | '削減予定';
  investmentAreas: string[];
};

const DEFAULT_HEARING: HearingData = {
  currentHeadcount: 8,
  planningHire: false,
  hireCount: 1,
  hireTimeline: '今期中',
  revenueBase: '昨年実績ベース',
  fixedCostTrend: '現状維持',
  investmentAreas: [],
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

function loadSavedPlan(): { segments: MonthlyRow[]; cogs: MonthlyRow[]; labor: MonthlyRow[]; admin: MonthlyRow[]; otherIncome: MonthlyRow[]; otherExpense: MonthlyRow[]; headcount: MonthlyRow[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('budget_plan');
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function BudgetPlanTab() {
  const savedPlan = loadSavedPlan();
  const [segments, setSegments] = useState<MonthlyRow[]>(savedPlan?.segments ?? INITIAL_SEGMENTS);
  const [cogs, setCogs] = useState<MonthlyRow[]>(savedPlan?.cogs ?? INITIAL_COGS);
  const [labor, setLabor] = useState<MonthlyRow[]>(savedPlan?.labor ?? INITIAL_LABOR);
  const [admin, setAdmin] = useState<MonthlyRow[]>(savedPlan?.admin ?? INITIAL_ADMIN);
  const [otherIncome, setOtherIncome] = useState<MonthlyRow[]>(savedPlan?.otherIncome ?? INITIAL_OTHER_INCOME);
  const [otherExpense, setOtherExpense] = useState<MonthlyRow[]>(savedPlan?.otherExpense ?? INITIAL_OTHER_EXPENSE);
  const [headcount, setHeadcount] = useState<MonthlyRow[]>(savedPlan?.headcount ?? INITIAL_HEADCOUNT);
  const [saved, setSaved] = useState(false);
  const [pdfMsg, setPdfMsg] = useState(false);

  useEffect(() => {
    if (!savedPlan) {
      const data = { segments: INITIAL_SEGMENTS, cogs: INITIAL_COGS, labor: INITIAL_LABOR, admin: INITIAL_ADMIN, otherIncome: INITIAL_OTHER_INCOME, otherExpense: INITIAL_OTHER_EXPENSE, headcount: INITIAL_HEADCOUNT };
      try { localStorage.setItem('budget_plan', JSON.stringify(data)); } catch {}
    }
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

  function handleSave() {
    try {
      const data = { segments, cogs, labor, admin, otherIncome, otherExpense, headcount };
      localStorage.setItem('budget_plan', JSON.stringify(data));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
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
        <button
          onClick={() => { setPdfMsg(true); setTimeout(() => setPdfMsg(false), 2000); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <span>🖨</span> PDF出力
        </button>
        {pdfMsg && <span className="text-xs text-gray-500">PDF出力はモックです</span>}
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
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

function Step1({ onNext }: { onNext: () => void }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setFileName(file.name);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">事業計画を作成</h2>
        <p className="text-sm text-gray-500 mt-1">MFクラウドの昨年データからAIが予算の叩き台を自動生成します</p>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
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
            if (file) setFileName(file.name);
          }}
        />
        <div className="text-3xl mb-3">📎</div>
        {fileName ? (
          <p className="text-sm font-semibold text-blue-600">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700">CSVファイルをドロップ</p>
            <p className="text-xs text-gray-500 mt-1">または クリックしてアップロード</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-500">または</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        disabled
        className="w-full py-2.5 rounded-lg border border-gray-200 text-sm text-gray-500 bg-gray-50 cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span>🔗</span>
        MFクラウドから自動取得（将来連携予定）
      </button>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">取り込み期間</label>
        <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>2025年1月〜12月</option>
          <option>2024年1月〜12月</option>
        </select>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        読み込む（モックデータを使用）
      </button>
    </div>
  );
}

function Step2({ onNext }: { onNext: () => void }) {
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
  function toggleArea(area: string) {
    const current = data.investmentAreas;
    if (area === 'なし') {
      onChange({ ...data, investmentAreas: current.includes('なし') ? [] : ['なし'] });
      return;
    }
    const without = current.filter((a) => a !== 'なし');
    if (without.includes(area)) {
      onChange({ ...data, investmentAreas: without.filter((a) => a !== area) });
    } else {
      onChange({ ...data, investmentAreas: [...without, area] });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">ヒアリング</h2>
        <p className="text-sm text-gray-500 mt-1">事業の状況を教えてください。AIがより精度の高い予算を生成します。</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            現在のメンバー数（正社員＋業務委託）
          </label>
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
              <div>
                <label className="block text-xs text-gray-500 mb-1">いつまでに？</label>
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
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">売上目標の根拠</label>
          <select
            value={data.revenueBase}
            onChange={(e) => onChange({ ...data, revenueBase: e.target.value as HearingData['revenueBase'] })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="昨年実績ベース">昨年実績ベース</option>
            <option value="新規事業含む">新規事業含む</option>
            <option value="既存深耕のみ">既存深耕のみ</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">固定費の変動予定</label>
          <select
            value={data.fixedCostTrend}
            onChange={(e) => onChange({ ...data, fixedCostTrend: e.target.value as HearingData['fixedCostTrend'] })}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="増加見込み（移転・設備等）">増加見込み（移転・設備等）</option>
            <option value="現状維持">現状維持</option>
            <option value="削減予定">削減予定</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">重点投資分野</label>
          <div className="flex flex-wrap gap-2">
            {INVESTMENT_AREA_OPTIONS.map((area) => {
              const checked = data.investmentAreas.includes(area);
              return (
                <button
                  key={area}
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-[0.98] ${
                    checked
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {checked ? '✓ ' : ''}{area}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
      >
        次へ（AI生成）
      </button>
    </div>
  );
}

function Step3({ onDone, hearingData }: { onDone: () => void; hearingData: HearingData }) {
  const [progress, setProgress] = useState(0);
  const [taskIndex, setTaskIndex] = useState(0);

  const tasks = [
    '昨年の売上トレンドを分析',
    '季節変動パターンを検出',
    '固定費・変動費を分離',
    '成長率を適用して予算を計算中...',
  ];

  useEffect(() => {
    let p = 0;
    let t = 0;
    const interval = setInterval(() => {
      p += 5;
      if (p >= 25 * (t + 1) && t < tasks.length - 1) {
        t += 1;
        setTaskIndex(t);
      }
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(onDone, 300);
      }
    }, 40);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">AIが予算を生成中...</h2>
        <p className="text-sm text-gray-500 mt-1">昨年の実績データを分析しています</p>
      </div>

      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-100"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <div className="text-right text-sm font-semibold text-gray-600">{Math.min(progress, 100)}%</div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm text-gray-600">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">ヒアリング内容を反映してAI生成中…</p>
        <p>・現在の人数: {hearingData.currentHeadcount}人</p>
        <p>・増員予定: {hearingData.planningHire ? `あり（${hearingData.hireCount}人、${hearingData.hireTimeline}）` : 'なし'}</p>
        <p>・売上根拠: {hearingData.revenueBase}</p>
        <p>・固定費: {hearingData.fixedCostTrend}</p>
        {hearingData.investmentAreas.length > 0 && (
          <p>・重点投資: {hearingData.investmentAreas.join('、')}</p>
        )}
      </div>

      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              i < taskIndex ? 'bg-green-500 text-white' :
              i === taskIndex ? 'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < taskIndex ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <div className={`w-1.5 h-1.5 rounded-full ${i === taskIndex ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
              )}
            </div>
            <span className={`text-sm ${i <= taskIndex ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>{task}</span>
          </div>
        ))}
      </div>
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

function computeFeasibility(annualRevenue: number, totalHeadcount: number): {
  level: '高' | '中' | '低';
  revenuePerPersonMonthly: number;
} {
  const monthly = totalHeadcount === 0 ? 0 : Math.round(annualRevenue / totalHeadcount / 12);
  let level: '高' | '中' | '低';
  if (monthly > 500) {
    level = '低';
  } else if (monthly > 300) {
    level = '中';
  } else {
    level = '高';
  }
  return { level, revenuePerPersonMonthly: monthly };
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

function Step4({ hearingData }: { hearingData: HearingData }) {
  const [growthRate, setGrowthRate] = useState(15);
  const [reflected, setReflected] = useState(false);
  const [budget, setBudget] = useState<BudgetNumbers>(() => computeBudget(15));

  const handleGrowthChange = (v: number) => {
    setGrowthRate(v);
    setBudget(computeBudget(v));
  };

  const gross  = budget.revenue - budget.cogs;
  const op     = gross - budget.sga;
  const lyGrossRate = Math.round((LY_GROSS / LY_REVENUE) * 100);
  const budgetGrossRate = Math.round((gross / budget.revenue) * 100);

  const updateSegment = (i: number, v: number) => {
    setBudget((prev) => {
      const segments = prev.segments.map((s, idx) => idx === i ? { ...s, budget: v } : s);
      return { ...prev, segments };
    });
  };

  const totalHeadcount = hearingData.currentHeadcount + (hearingData.planningHire ? hearingData.hireCount : 0);
  const { level, revenuePerPersonMonthly } = computeFeasibility(budget.revenue, totalHeadcount);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AIの予算提案</h2>
          <p className="text-sm text-gray-500 mt-1">数値を直接クリックして編集できます</p>
        </div>
        <div className="flex-shrink-0 bg-blue-50 rounded-xl px-4 py-3 text-center min-w-[100px]">
          <div className="text-xs text-gray-500 mb-1">成長率</div>
          <div className="flex items-center gap-1 justify-center">
            <input
              type="number"
              value={growthRate}
              min={-20}
              max={100}
              onChange={(e) => handleGrowthChange(Number(e.target.value))}
              className="w-12 text-right text-lg font-semibold text-blue-700 bg-transparent border-0 focus:outline-none focus:ring-0"
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
              { label: '売上',   ly: LY_REVENUE, editable: true,  budgetVal: budget.revenue, key: 'revenue' as const },
              { label: '原価',   ly: LY_COGS,    editable: true,  budgetVal: budget.cogs,    key: 'cogs' as const },
              { label: '粗利',   ly: LY_GROSS,   editable: false, budgetVal: gross,           key: null },
              { label: '粗利率', ly: lyGrossRate, editable: false, budgetVal: budgetGrossRate, key: null, isPct: true },
              { label: '販管費', ly: LY_SGA,     editable: true,  budgetVal: budget.sga,     key: 'sga' as const },
              { label: '営業利益', ly: LY_OP,    editable: false, budgetVal: op,              key: null },
            ].map(({ label, ly, editable, budgetVal, key, isPct }) => {
              const isOp = label === '営業利益';
              return (
                <tr key={label} className={`border-t border-gray-100 ${isOp ? 'bg-blue-50 font-semibold' : ''}`}>
                  <td className={`px-4 py-2.5 ${isOp ? 'text-blue-800 font-semibold' : 'text-gray-700 font-medium'}`}>{label}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">
                    {isPct ? `${ly}%` : fmtYen(ly as number)}
                  </td>
                  <td className="px-2 py-1.5 pr-2">
                    {isPct ? (
                      <div className="text-right px-2 py-1 text-sm font-semibold text-gray-900 tabular-nums">{budgetVal}%</div>
                    ) : editable && key ? (
                      <EditableCell
                        value={budgetVal as number}
                        onChange={(v) => setBudget((prev) => ({ ...prev, [key]: v }))}
                      />
                    ) : (
                      <div className={`text-right px-2 py-1 text-sm font-semibold tabular-nums ${isOp ? 'text-blue-700' : 'text-gray-900'}`}>
                        {fmtYen(budgetVal as number)}
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
            <span className="text-sm font-semibold text-gray-700">実現可能性チェック</span>
            <FeasibilityBadge level={level} />
          </div>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-700">
            1人あたり月商 <span className="font-semibold tabular-nums">{revenuePerPersonMonthly.toLocaleString()}万円</span>（{totalHeadcount}名ベース）
            {revenuePerPersonMonthly > 0 && (
              <span className="text-gray-500 ml-1">
                — 業界平均（約150万円）の
                <span className="font-semibold ml-0.5">{(revenuePerPersonMonthly / 150).toFixed(1)}倍</span>
              </span>
            )}
          </p>
          {level === '低' && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-700">
              この計画は無理がある可能性があります。人員を{Math.ceil(budget.revenue / 12 / 300) - totalHeadcount}人増やすか、売上目標を{Math.round((1 - (totalHeadcount * 300 * 12) / budget.revenue) * 100)}%下げることを検討してください。
            </div>
          )}
          {level === '中' && (
            <p className="text-sm text-gray-500">達成には高い営業効率が必要です。実行計画の精度を高めてください。</p>
          )}
          {level === '高' && (
            <p className="text-sm text-gray-500">現在の人員規模で現実的な目標水準です。</p>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg flex-shrink-0">💡</span>
          <div>
            <div className="text-xs font-semibold text-amber-800 mb-1">AIコメント</div>
            <p className="text-sm text-amber-900 leading-relaxed">
              昨年の成長率12%を踏まえ、{growthRate}%成長を想定。原価率は昨年並みの{Math.round(LY_COGS / LY_REVENUE * 100)}%を維持。販管費は人員増を見込み6%増。
            </p>
          </div>
        </div>
      </div>

      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">セグメント別内訳</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-t border-gray-100 text-xs text-gray-600">
              <th className="text-left px-4 py-2 font-medium">セグメント</th>
              <th className="text-right px-4 py-2 font-medium">昨年（万円）</th>
              <th className="text-right px-4 py-2 font-medium pr-4">今年予算</th>
            </tr>
          </thead>
          <tbody>
            {LAST_YEAR_SEGMENTS.map((s, i) => (
              <tr key={s.name} className="border-t border-gray-100">
                <td className="px-4 py-2.5 text-gray-700 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 text-right text-gray-500 tabular-nums">{s.amount.toLocaleString()}</td>
                <td className="px-2 py-1.5 pr-2">
                  <EditableCell
                    value={budget.segments[i].budget}
                    onChange={(v) => updateSegment(i, v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 pt-2">
        <button
          onClick={() => { setReflected(true); setTimeout(() => setReflected(false), 2000); }}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          {reflected ? '✓ 反映しました' : '事業計画に反映する'}
        </button>
        <button
          onClick={() => setBudget(computeBudget(growthRate))}
          className="w-full py-3 bg-white text-gray-700 font-semibold rounded-xl border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          もう一度AIに生成させる
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
              {step === 0 && <Step1 onNext={() => setStep(1)} />}
              {step === 1 && <Step2 onNext={() => setStep(2)} />}
              {step === 2 && (
                <StepHearing
                  data={hearingData}
                  onChange={setHearingData}
                  onNext={() => setStep(3)}
                />
              )}
              {step === 3 && <Step3 onDone={() => setStep(4)} hearingData={hearingData} />}
              {step === 4 && <Step4 hearingData={hearingData} />}
            </div>
            {step > 0 && step < 4 && (
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
