import type { ActionType } from '@/types';
import { ACTION_RECORDS, KPI_SNAPSHOTS } from '@/lib/mock-data';

export const WEEKLY_COMPANY_ID = 'tripot';
// NOTE: mock-data/index.tsのACTION_RECORDSはdotsyncのIDで格納されているが、トライポットのデータとして扱う
export const WEEKLY_COMPANY_NAME = 'トライポット';
export const WEEKLY_REF_DATE = new Date('2026-04-05');

export const WEEKLY_MONTHLY_THEME = {
  month: 4,
  theme: '販売力（商談量の上限突破）',
  status: 'yellow' as const,
  comment: '先週比で商談・提案が増加。ただしアポ獲得ペースはまだ目標の60%。今週は新規架電強化が鍵。',
};

export type ProjectStatus = 'in_progress' | 'delivered_pending' | 'delayed';

export type Project = {
  id: string;
  name: string;
  client: string;
  progress: number;
  status: ProjectStatus;
  deadline: string;
  note: string;
};

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    name: '学習管理システム',
    client: '名古屋市教育委員会',
    progress: 35,
    status: 'in_progress',
    deadline: '2026-07-31',
    note: '設計フェーズ完了。実装着手中。',
  },
  {
    id: 'p2',
    name: 'QC管理システム追加開発',
    client: '愛知トヨタ協力工場',
    progress: 100,
    status: 'delivered_pending',
    deadline: '2026-03-31',
    note: '納品済み。検収待ち（4/10予定）。',
  },
];

export type PrevTodoItem = {
  id: string;
  content: string;
  assignee: string;
  status: 'pending' | 'completed';
  weeksCarried: number;
  reason?: string;
  insight?: string;
};

export const PREV_TODOS_MOCK: PrevTodoItem[] = [];

export type NewTodo = {
  id: string;
  content: string;
  assignee: string;
  deadline: string;
};

export const NEXT_TODOS_INITIAL: NewTodo[] = [];

export const FUNNEL_STAGES: { key: ActionType; label: string; dataKey: string }[] = [
  { key: 'appointment', label: 'アポ', dataKey: 'appointments' },
  { key: 'meeting', label: '商談', dataKey: 'meetings' },
  { key: 'proposal', label: '提案', dataKey: 'proposals' },
  { key: 'order', label: '受注', dataKey: 'orders' },
];

export function getWeekRange(refDate: Date): { start: Date; end: Date } {
  const d = new Date(refDate);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const start = new Date(d);
  start.setDate(d.getDate() + diffToMon);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function countByType(records: typeof ACTION_RECORDS) {
  const counts = { appointment: 0, meeting: 0, proposal: 0, order: 0, invoice: 0, payment_confirmed: 0 };
  records.forEach((r) => { counts[r.actionType]++; });
  return counts;
}

export function sumAmountByType(records: typeof ACTION_RECORDS, type: ActionType) {
  return records.filter((r) => r.actionType === type).reduce((s, r) => s + (r.amount ?? 0), 0);
}

export function buildWeeklyTrend(companyRecords: typeof ACTION_RECORDS, refDate: Date) {
  const weeks: { week: string; appointments: number; meetings: number; proposals: number; orders: number }[] = [];
  for (let i = 3; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i * 7);
    const { start, end } = getWeekRange(d);
    const weekRecords = companyRecords.filter((r) => {
      const rd = new Date(r.date);
      return rd >= start && rd <= end;
    });
    const c = countByType(weekRecords);
    weeks.push({
      week: `${start.getMonth() + 1}/${start.getDate()}`,
      appointments: c.appointment,
      meetings: c.meeting,
      proposals: c.proposal,
      orders: c.order,
    });
  }
  return weeks;
}

export function yen(v: number) {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}万`;
  return `${(v / 1000).toFixed(0)}千`;
}

export function getWeeklyData() {
  const companyRecords = ACTION_RECORDS.filter((r) => r.companyId === WEEKLY_COMPANY_ID);
  const refDate = WEEKLY_REF_DATE;

  const thisWeekRange = getWeekRange(refDate);
  const lastWeekD = new Date(refDate);
  lastWeekD.setDate(lastWeekD.getDate() - 7);
  const lastWeekRange = getWeekRange(lastWeekD);

  const thisWeekRecords = companyRecords.filter((r) => {
    const d = new Date(r.date);
    return d >= thisWeekRange.start && d <= thisWeekRange.end;
  });
  const lastWeekRecords = companyRecords.filter((r) => {
    const d = new Date(r.date);
    return d >= lastWeekRange.start && d <= lastWeekRange.end;
  });

  const monthRecords = companyRecords.filter((r) => r.date.startsWith('2026-04'));
  const kpi = KPI_SNAPSHOTS.find((s) => s.companyId === WEEKLY_COMPANY_ID);

  const dayOfMonth = refDate.getDate();
  const daysInMonth = 30;
  const remainingWeeks = Math.max(Math.ceil((daysInMonth - dayOfMonth) / 7), 1);
  const weekNumber = Math.ceil(dayOfMonth / 7);

  return {
    companyRecords,
    thisWeekRecords,
    lastWeekRecords,
    monthRecords,
    kpi,
    trendData: buildWeeklyTrend(companyRecords, refDate),
    thisWeek: countByType(thisWeekRecords),
    lastWeek: countByType(lastWeekRecords),
    monthCounts: countByType(monthRecords),
    remainingWeeks,
    weekNumber,
  };
}

export const CF_ROLLING_WEEKS = [
  { week: '4/7〜4/13', expectedInflow: 3200000, actualInflow: 0, payment: 2800000, balance: 3200000 },
  { week: '4/14〜4/20', expectedInflow: 2100000, actualInflow: 0, payment: 1500000, balance: 4000000 },
  { week: '4/21〜4/27', expectedInflow: 1800000, actualInflow: 0, payment: 3200000, balance: 2600000 },
  { week: '4/28〜5/4', expectedInflow: 800000, actualInflow: 0, payment: 2500000, balance: 900000 },
];

export const PL_PREV_MONTH = {
  revenue: { target: 11000000, actual: 10200000 },
  grossProfit: { target: 5500000, actual: 4700000 },
  grossMarginRate: { target: 50, actual: 46 },
  sgaExpenses: { target: 3200000, actual: 3100000 },
  operatingProfit: { target: 2300000, actual: 1600000 },
  ordinaryProfit: { target: 2200000, actual: 1550000 },
};
