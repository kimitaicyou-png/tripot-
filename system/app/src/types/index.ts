export type Company = {
  id: string;
  name: string;
  shortName: string;
};

export type ActionType =
  | 'appointment'
  | 'meeting'
  | 'proposal'
  | 'order'
  | 'invoice'
  | 'payment_confirmed';

export type AlertLevel = 'normal' | 'warning' | 'danger';

export type KpiValue = {
  target: number;
  actual: number;
  diff: number;
  alertLevel: AlertLevel;
};

export type ActionRecord = {
  id: string;
  companyId: string;
  date: string;
  actionType: ActionType;
  clientName: string;
  dealName: string;
  amount?: number;
  probability?: number;
  expectedPaymentDate?: string;
  assignee: string;
  memo?: string;
  createdAt: string;
};

export type FunnelData = {
  appointments: number;
  meetings: number;
  proposals: number;
  orders: number;
  conversionRates: {
    meeting: number;
    proposal: number;
    order: number;
  };
};

export type PlSummary = {
  revenue: KpiValue;
  grossProfit: KpiValue;
  grossMarginRate: KpiValue;
  sgaExpenses: KpiValue;
  operatingProfit: KpiValue;
  ordinaryProfit: KpiValue;
};

export type CfSummary = {
  expectedPayment: number;
  receivedPayment: number;
  overdue: number;
  balance: number;
  fourWeekShortage: 'safe' | 'caution' | 'danger';
  breakEvenMargin: 'safe' | 'caution' | 'danger';
};

export type KpiSnapshot = {
  companyId: string;
  period: string;
  funnel: FunnelData;
  plSummary: PlSummary;
  cfSummary: CfSummary;
};

export type WeeklyTodo = {
  id: string;
  companyId: string;
  weekStart: string;
  content: string;
  assignee: string;
  deadline: string;
  completionCriteria: string;
  status: 'pending' | 'completed' | 'cancelled';
};

export type MonthlyTheme = {
  month: number;
  theme: string;
  purpose: string;
  progressStatus: 'green' | 'yellow' | 'red';
};
