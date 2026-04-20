export type ParsedMfRow = {
  account: string;
  category: 'revenue' | 'cogs' | 'labor' | 'admin' | 'other_income' | 'other_expense' | 'unknown';
  monthly: number[];
  yearTotal: number;
};

export type ParsedMfResult = {
  rows: ParsedMfRow[];
  fiscalYear: number | null;
  warnings: string[];
};

const ACCOUNT_CATEGORY_MAP: Array<{ match: RegExp; category: ParsedMfRow['category'] }> = [
  { match: /売上|Sales|revenue/i, category: 'revenue' },
  { match: /仕入|外注|業務委託|売上原価|COGS/i, category: 'cogs' },
  { match: /役員報酬|給料|賞与|法定福利|福利厚生|退職金/i, category: 'labor' },
  { match: /地代家賃|通信|交際|旅費|広告|消耗品|支払手数料|減価償却|保険|租税/i, category: 'admin' },
  { match: /受取利息|雑収入|営業外収益/i, category: 'other_income' },
  { match: /支払利息|雑損失|営業外費用/i, category: 'other_expense' },
];

function classify(account: string): ParsedMfRow['category'] {
  for (const { match, category } of ACCOUNT_CATEGORY_MAP) {
    if (match.test(account)) return category;
  }
  return 'unknown';
}

function stripCommas(s: string): string {
  return s.replace(/[,，¥￥\s]/g, '');
}

function num(s: string): number {
  if (!s) return 0;
  const stripped = stripCommas(s);
  const n = Number(stripped);
  return Number.isFinite(n) ? n : 0;
}

export function parseMfCsv(csv: string): ParsedMfResult {
  const warnings: string[] = [];
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], fiscalYear: null, warnings: ['CSVが空か、ヘッダーしかありません'] };
  }

  const header = lines[0].split(',').map((h) => h.trim());
  const monthColStart = header.findIndex((h) => /^\d+月|^\d{4}[-/]\d{1,2}$|^M\d+$/.test(h));

  if (monthColStart < 0) {
    warnings.push('月列が見つかりません。ヘッダーに「4月」「1月」等を含めてください');
    return { rows: [], fiscalYear: null, warnings };
  }

  const fiscalYearMatch = csv.match(/(20\d{2})/);
  const fiscalYear = fiscalYearMatch ? Number(fiscalYearMatch[1]) : null;

  const rows: ParsedMfRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim());
    const account = cells[0] ?? '';
    if (!account) continue;

    const monthly = Array.from({ length: 12 }, (_, idx) => num(cells[monthColStart + idx] ?? '0'));
    const yearTotal = monthly.reduce((s, v) => s + v, 0);
    const category = classify(account);
    if (category === 'unknown') {
      warnings.push(`未分類の勘定科目: ${account}`);
    }
    rows.push({ account, category, monthly, yearTotal });
  }

  return { rows, fiscalYear, warnings };
}

export function aggregateByCategory(rows: ParsedMfRow[]): {
  revenue: number[];
  cogs: number[];
  labor: number[];
  admin: number[];
  otherIncome: number[];
  otherExpense: number[];
} {
  const zeros = () => Array(12).fill(0);
  const out = {
    revenue: zeros(),
    cogs: zeros(),
    labor: zeros(),
    admin: zeros(),
    otherIncome: zeros(),
    otherExpense: zeros(),
  };
  for (const r of rows) {
    const target =
      r.category === 'revenue' ? out.revenue :
      r.category === 'cogs' ? out.cogs :
      r.category === 'labor' ? out.labor :
      r.category === 'admin' ? out.admin :
      r.category === 'other_income' ? out.otherIncome :
      r.category === 'other_expense' ? out.otherExpense :
      null;
    if (!target) continue;
    for (let i = 0; i < 12; i++) target[i] += r.monthly[i] ?? 0;
  }
  return out;
}
