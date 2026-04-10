export type Stage =
  | 'lead'
  | 'meeting'
  | 'proposal'
  | 'estimate_sent'
  | 'negotiation'
  | 'ordered'
  | 'in_production'
  | 'delivered'
  | 'acceptance'
  | 'invoiced'
  | 'accounting'
  | 'paid'
  | 'claim'
  | 'claim_resolved'
  | 'lost';

export type HistoryEventType =
  | 'stage_change'
  | 'proposal_sent'
  | 'estimate_sent'
  | 'contract_sent'
  | 'contract_signed'
  | 'invoice_sent'
  | 'paid'
  | 'email_sent'
  | 'file_attached'
  | 'note';

export type HistoryEvent = {
  id: string;
  at: string;
  type: HistoryEventType;
  title: string;
  description?: string;
  actor?: string;
};

export type AttachmentKind = 'figma' | 'link' | 'google_doc' | 'sheet' | 'slide' | 'pdf' | 'image' | 'other';

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  title: string;
  url: string;
  addedAt: string;
  addedBy?: string;
};

export type ProcessTask = {
  id: string;
  title: string;
  dueDate?: string;
  assigneeType: 'internal' | 'external' | 'unassigned';
  internalMemberId?: string;
  externalPartnerId?: string;
  hours?: number;
  note?: string;
};

export type DealProcess = {
  requirementsGenerated: boolean;
  requirementsDoc?: string;
  wbsGenerated: boolean;
  tasks?: ProcessTask[];
  committedToProduction: boolean;
  committedAt?: string;
  pmId?: string;
  teamMemberIds?: string[];
  handoffCardId?: string;
};

export type Deal = {
  id: string;
  clientName: string;
  dealName: string;
  industry: string;
  stage: Stage;
  amount: number;
  probability: number;
  assignee: string;
  lastDate: string;
  memo: string;
  revenueType: 'shot' | 'running';
  monthlyAmount?: number;
  runningStartDate?: string;
  progress?: number;
  invoiceDate?: string;
  paymentDue?: string;
  paidDate?: string;
  invoice?: {
    status: 'none' | 'draft' | 'sent' | 'paid';
    issuedAt?: string;
    paidAt?: string;
    amount?: number;
    memo?: string;
  };
  history?: HistoryEvent[];
  attachments?: Attachment[];
  process?: DealProcess;
};

export type Filter = 'active' | 'estimate' | 'ordered' | 'production' | 'handed_off' | 'billing' | 'running' | 'claim' | 'lost' | 'all';

export type Claim = {
  id: string;
  date: string;
  content: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  assignee: string;
  response?: string;
};

export type CommType = 'meeting' | 'email' | 'call' | 'note';

export type CommRecord = {
  id: string;
  type: CommType;
  date: string;
  title: string;
  summary: string;
  needs?: string[];
};

export type SlideType = 'cover' | 'problem' | 'solution' | 'effect' | 'tech' | 'schedule' | 'team' | 'cases' | 'cost' | 'next' | 'custom';

export type Slide = {
  type: SlideType;
  title: string;
  bullets: string[];
  note?: string;
};

export type EstimateItem = {
  name: string;
  amount: number;
  manMonth: number;
  unitPrice: number;
};

export type BudgetItem = {
  name: string;
  revenue: number;
  costLabel: string;
  budgetCost: number;
  grossProfit: number;
};

export type ActionTab = 'email' | 'meeting' | 'gmeet' | 'call';
