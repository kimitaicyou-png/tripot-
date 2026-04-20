export type SalesStage =
  | 'lead' | 'meeting' | 'proposal' | 'estimate_sent' | 'negotiation' | 'ordered';

export type ProductionStage =
  | 'in_production' | 'delivered' | 'acceptance';

export type BillingStage =
  | 'invoiced' | 'accounting' | 'paid';

export type ClaimStage = 'claim' | 'claim_resolved';

export type Stage = SalesStage | ProductionStage | BillingStage | ClaimStage | 'lost';

export type Phase =
  | 'kickoff' | 'requirements' | 'design' | 'development'
  | 'test' | 'release' | 'operation';

export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';
export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';
export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type CardStatus = 'active' | 'paused' | 'done' | 'cancelled';
export type ActionType = 'voice' | 'email' | 'meet' | 'phone' | 'incident';
export type IncidentStatus = 'open' | 'investigating' | 'resolved';
export type AttachmentKind = 'contract' | 'proposal' | 'quote' | 'spec' | 'design' | 'other';
export type MemberLevel = 'junior' | 'mid' | 'senior' | 'lead';

export type CancelReason =
  | 'price'
  | 'competitor'
  | 'budget_freeze'
  | 'spec_disagreement'
  | 'client_reason'
  | 'other';

export type HistoryEvent = {
  id: string;
  at: string;
  type: 'stage_change' | 'proposal_sent' | 'estimate_sent'
    | 'contract_sent' | 'contract_signed' | 'invoice_sent'
    | 'paid' | 'email_sent' | 'file_attached' | 'note';
  title: string;
  description?: string;
  actor?: string;
};

export type DealAttachment = {
  id: string;
  kind: 'figma' | 'link' | 'google_doc' | 'sheet' | 'slide' | 'pdf' | 'image' | 'other';
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
  revenueType: 'shot' | 'running' | 'both';
  monthlyAmount?: number;
  runningStartDate?: string;
  progress?: number;
  invoiceDate?: string;
  paymentDue?: string;
  paidDate?: string;
  cancelReason?: CancelReason;
  invoice?: {
    status: 'none' | 'draft' | 'sent' | 'paid';
    issuedAt?: string;
    paidAt?: string;
    amount?: number;
    memo?: string;
  };
  history?: HistoryEvent[];
  attachments?: DealAttachment[];
  process?: DealProcess;
  updatedAt?: string;
};

export type ProductionCardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeType?: 'internal' | 'external';
  externalPartnerName?: string;
  estimatedCost?: number;
  dueDate?: string;
  estimatedHours?: number;
  requirementRefs?: string[];
  reviewerId?: string;
  reviewStatus?: ReviewStatus;
  completedAt?: string;
  startedAt?: string;
};

export type Milestone = {
  id: string;
  label: string;
  dueDate: string;
  done: boolean;
};

export type ProductionAttachment = {
  id: string;
  kind: AttachmentKind;
  name: string;
  url: string;
  note?: string;
  addedAt: string;
};

export type RevenueAmendment = {
  id: string;
  date: string;
  amount: number;
  reason: string;
};

export type ProductionAction = {
  id: string;
  type: ActionType;
  date: string;
  time?: string;
  content: string;
  assignee: string;
  createdAt: string;
  incidentStatus?: IncidentStatus;
};

export type NextAction = {
  date: string;
  time?: string;
  content: string;
  assignee: string;
};

export type SentLogEntry = {
  id: string;
  taskId: string;
  channel: 'gmail' | 'slack';
  to: string;
  sentAt: string;
};

export type ProductionCard = {
  id: string;
  dealId: string;
  dealName: string;
  clientName: string;
  amount: number;
  pmId: string;
  pmName: string;
  teamMemberIds: string[];
  externalPartnerIds: string[];
  referenceArtifacts: {
    requirement: string;
    proposalSummary: string;
    quoteTotal: number;
    budget: number;
  };
  tasks: ProductionCardTask[];
  milestones: Milestone[];
  phase: Phase;
  progress: number;
  risk: RiskLevel;
  status: CardStatus;
  retrospective?: string;
  nextAction?: NextAction | null;
  actions?: ProductionAction[];
  salesHandoffNotes?: string;
  sitemap?: string;
  attachments?: ProductionAttachment[];
  amendments?: RevenueAmendment[];
  sentLog?: SentLogEntry[];
  createdAt: string;
  updatedAt: string;
};

export type MemberInfo = {
  id: string;
  name: string;
  initial: string;
  color: string;
  email?: string;
  slackId?: string;
  skills?: string[];
  level?: MemberLevel;
};

export type Vendor = {
  id: string;
  name: string;
  specialty: string;
  defaultRate?: string;
  note?: string;
  email?: string;
  rating: number;
  pastProjects: number;
  onTimeRate: number;
  internalOwnerId: string;
  backupVendorId?: string;
};

export type Customer = {
  id: string;
  companyName: string;
  contactName?: string;
  email?: string;
  phone?: string;
  industry?: string;
  source?: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  toMemberId: string;
  fromMemberId: string;
  fromName: string;
  type: 'mention' | 'review_request' | 'task_assigned' | 'deal_update' | 'general';
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  read: boolean;
};
