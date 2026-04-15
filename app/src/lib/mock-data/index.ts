import type {
  Company,
  ActionRecord,
  KpiSnapshot,
  WeeklyTodo,
  MonthlyTheme,
} from '@/types';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'reviewing' | 'approved' | 'rejected' | 'pending';

export type Approval = {
  id: string;
  title: string;
  applicant: string;
  companyId: string;
  amount: number;
  purpose: string;
  recoveryPlan: string;
  risk: string;
  approvalCondition: string;
  status: ApprovalStatus;
  createdAt: string;
};

export type AiOutput = {
  id: string;
  type: 'preview' | 'agenda' | 'report' | 'alert';
  title: string;
  content: string;
  companyId?: string;
  createdAt: string;
};

// ─── マスターデータ ────────────────────────────────────────────────────────────

export const COMPANIES: Company[] = [
  { id: 'tripot', name: 'トライポット株式会社', shortName: 'トライポット' },
];

export const ACTION_RECORDS: ActionRecord[] = [];

export const KPI_SNAPSHOTS: KpiSnapshot[] = [];

export const WEEKLY_TODOS: WeeklyTodo[] = [];

export const MONTHLY_THEMES: MonthlyTheme[] = [];

export const mockApprovals: Approval[] = [];

export const mockAiOutputs: AiOutput[] = [];

// ─── ヘルパー関数 ─────────────────────────────────────────────────────────────

export function getCompanyById(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function getActionRecordsByCompany(companyId: string): ActionRecord[] {
  return ACTION_RECORDS.filter((r) => r.companyId === companyId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getKpiSnapshot(companyId: string): KpiSnapshot | undefined {
  return KPI_SNAPSHOTS.find((s) => s.companyId === companyId);
}

export function getWeeklyTodosByCompany(companyId: string): WeeklyTodo[] {
  return WEEKLY_TODOS.filter((t) => t.companyId === companyId);
}

export function getCurrentMonthlyTheme(): MonthlyTheme | undefined {
  const currentMonth = new Date().getMonth() + 1;
  return MONTHLY_THEMES.find((t) => t.month === currentMonth);
}

// ─── 互換エクスポート（既存ページとの互換性維持） ─────────────────────────────

export const companies = COMPANIES;

export const mockKpiByCompany: Record<string, KpiSnapshot> = Object.fromEntries(
  KPI_SNAPSHOTS.map((s) => [s.companyId, s])
);
