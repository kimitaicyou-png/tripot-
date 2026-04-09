
export type Phase = 'kickoff' | 'requirement' | 'design' | 'development' | 'testing' | 'delivery' | 'acceptance' | 'invoiced' | 'claim' | 'claim_resolved';

export type Stage =
  | 'lead'
  | 'meeting'
  | 'proposal'
  | 'estimate_sent'
  | 'negotiation'
  | 'ordered'
  | 'invoiced'
  | 'paid'
  | 'claim'
  | 'claim_resolved';

export type Deal = {
  id: string;
  clientName: string;
  dealName: string;
  industry: string;
  stage: Stage;
  revenueType: 'shot' | 'running';
  amount: number;
  monthlyAmount?: number;
  runningStartDate?: string;
  probability: number;
  assignee: string;
  lastDate: string;
  memo: string;
};

export type Member = {
  id: string;
  name: string;
  role: string;
  initial: string;
};

export type MonthlyTarget = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  sga: number;
  operatingProfit: number;
  ordinaryProfit: number;
};

export type MonthlyActual = {
  shotRevenue: number;
  runningRevenue: number;
  totalRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginRate: number;
  sga: number;
  operatingProfit: number;
  ordinaryProfit: number;
};

export type MemberActual = {
  memberId: string;
  memberName: string;
  shotRevenue: number;
  runningRevenue: number;
  totalRevenue: number;
  cost: number;
  grossProfit: number;
  grossMarginRate: number;
};
