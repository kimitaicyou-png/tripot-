// 案件から制作に引き渡された「ProductionCard」のストア
// localStorage 永続化（MVP）。将来的には本部ブリッジ経由で同期する

export type ReviewStatus = 'pending' | 'in_review' | 'approved' | 'rejected';

export type ProductionCardTask = {
  id: string;
  title: string;
  status: 'todo' | 'doing' | 'review' | 'done';
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

export type RequirementItem = {
  id: string;
  text: string;
  depth: number;
};

export function parseRequirementItems(text: string | undefined): RequirementItem[] {
  if (!text) return [];
  const items: RequirementItem[] = [];
  const seen = new Set<string>();
  const lines = text.split('\n');
  for (const raw of lines) {
    const m = raw.match(/^(\s*)[-*+]\s+(.+?)\s*$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const content = m[2].trim();
    if (!content) continue;
    const base = content.toLowerCase().replace(/\s+/g, '_').slice(0, 40);
    let id = base;
    let n = 1;
    while (seen.has(id)) id = `${base}_${n++}`;
    seen.add(id);
    items.push({ id, text: content, depth });
  }
  return items;
}

export type ProductionNextAction = {
  date: string;
  time?: string;
  content: string;
  assignee: string;
};

export type ProductionActionType = 'voice' | 'email' | 'meet' | 'phone' | 'incident';

export type ProductionAttachmentKind = 'contract' | 'proposal' | 'quote' | 'spec' | 'design' | 'other';

export type ProductionAttachment = {
  id: string;
  kind: ProductionAttachmentKind;
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

export type SentLogEntry = {
  id: string;
  taskId: string;
  channel: 'gmail' | 'slack';
  to: string;
  sentAt: string;
};

export type IncidentStatus = 'open' | 'investigating' | 'resolved';

export type ProjectTemplate = {
  id: string;
  name: string;
  icon: string;
  tasks: { title: string; assigneeType: 'internal' | 'external'; estimatedCost?: number }[];
  milestones: { label: string; offsetDays: number }[];
};

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl_lp',
    name: 'LP制作',
    icon: '📄',
    tasks: [
      { title: 'デザインカンプ', assigneeType: 'external', estimatedCost: 80000 },
      { title: 'コーディング', assigneeType: 'internal' },
    ],
    milestones: [
      { label: 'デザイン確定', offsetDays: 7 },
      { label: '納品', offsetDays: 14 },
    ],
  },
  {
    id: 'tpl_corporate',
    name: 'コーポレートサイト',
    icon: '🏢',
    tasks: [
      { title: 'ワイヤーフレーム作成', assigneeType: 'internal' },
      { title: 'デザインカンプ', assigneeType: 'external', estimatedCost: 150000 },
      { title: 'フロント実装', assigneeType: 'internal' },
      { title: 'CMS構築', assigneeType: 'internal' },
      { title: 'テスト・検証', assigneeType: 'internal' },
      { title: '公開作業', assigneeType: 'internal' },
    ],
    milestones: [
      { label: '設計完了', offsetDays: 14 },
      { label: 'デザイン確定', offsetDays: 28 },
      { label: '開発完了', offsetDays: 56 },
      { label: '検収', offsetDays: 70 },
    ],
  },
  {
    id: 'tpl_ec',
    name: 'ECサイト',
    icon: '🛒',
    tasks: [
      { title: 'UI/UXデザイン', assigneeType: 'external', estimatedCost: 200000 },
      { title: 'フロント実装', assigneeType: 'internal' },
      { title: 'バックエンドAPI', assigneeType: 'internal' },
      { title: '決済連携', assigneeType: 'external', estimatedCost: 150000 },
      { title: '商品管理CMS', assigneeType: 'internal' },
      { title: 'テスト・QA', assigneeType: 'external', estimatedCost: 100000 },
      { title: 'リリース・運用開始', assigneeType: 'internal' },
    ],
    milestones: [
      { label: '要件確定', offsetDays: 14 },
      { label: 'デザイン確定', offsetDays: 35 },
      { label: '開発完了', offsetDays: 70 },
      { label: 'テスト完了', offsetDays: 84 },
      { label: '検収・公開', offsetDays: 90 },
    ],
  },
  {
    id: 'tpl_maintenance',
    name: '月額保守',
    icon: '🔧',
    tasks: [
      { title: 'セキュリティパッチ適用', assigneeType: 'internal' },
      { title: 'DBバックアップ確認', assigneeType: 'internal' },
      { title: '問い合わせ対応', assigneeType: 'internal' },
    ],
    milestones: [
      { label: '月次チェック完了', offsetDays: 30 },
    ],
  },
];

export type ProductionAction = {
  id: string;
  type: ProductionActionType;
  date: string;
  time?: string;
  content: string;
  assignee: string;
  createdAt: string;
  incidentStatus?: IncidentStatus;
};

export type ProductionCardMilestone = {
  id: string;
  label: string;
  dueDate: string;
  done: boolean;
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
  milestones: ProductionCardMilestone[];
  phase: 'kickoff' | 'requirements' | 'design' | 'development' | 'test' | 'release' | 'operation';
  progress: number;
  risk: 'none' | 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'done' | 'cancelled';
  retrospective?: string;

  nextAction?: ProductionNextAction | null;
  actions?: ProductionAction[];
  salesHandoffNotes?: string;
  sitemap?: string;
  attachments?: ProductionAttachment[];
  amendments?: RevenueAmendment[];
  sentLog?: SentLogEntry[];

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'tripot_production_cards';

const SEED_CARDS: ProductionCard[] = [];

export function loadProductionCards(): ProductionCard[] {
  if (typeof window === 'undefined') return [];
  const isReset = localStorage.getItem('tripot_data_reset') === '1';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as ProductionCard[];
    return [];
  } catch {
    return [];
  }
}

export function saveProductionCards(cards: ProductionCard[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function addProductionCard(card: ProductionCard): ProductionCard[] {
  const cards = loadProductionCards();
  // 同じ dealId のカードが既にあれば上書き（idempotent な引き渡し）
  const filtered = cards.filter((c) => c.dealId !== card.dealId);
  const next = [card, ...filtered];
  saveProductionCards(next);
  return next;
}

export function getProductionCardByDealId(dealId: string): ProductionCard | undefined {
  return loadProductionCards().find((c) => c.dealId === dealId);
}

export function updateProductionCard(id: string, patch: Partial<ProductionCard>): ProductionCard | undefined {
  const cards = loadProductionCards();
  const idx = cards.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  const updated = { ...cards[idx], ...patch, updatedAt: new Date().toISOString() };
  cards[idx] = updated;
  saveProductionCards(cards);
  return updated;
}

type BuildInput = {
  dealId: string;
  dealName: string;
  clientName: string;
  amount: number;
  pmId: string;
  pmName: string;
  teamMemberIds: string[];
  externalPartnerIds: string[];
  requirement: string;
  proposalSummary: string;
  quoteTotal: number;
  budget: number;
  handedOffBy: string;
};

export function buildProductionCard(input: BuildInput): ProductionCard {
  const now = new Date().toISOString();
  return {
    id: `pc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    dealId: input.dealId,
    dealName: input.dealName,
    clientName: input.clientName,
    amount: input.amount,
    pmId: input.pmId,
    pmName: input.pmName,
    teamMemberIds: input.teamMemberIds,
    externalPartnerIds: input.externalPartnerIds,
    referenceArtifacts: {
      requirement: input.requirement,
      proposalSummary: input.proposalSummary,
      quoteTotal: input.quoteTotal,
      budget: input.budget,
    },
    tasks: [],
    milestones: [
      { id: 'm1', label: 'キックオフ',       dueDate: '',  done: false },
      { id: 'm2', label: '要件確定',         dueDate: '',  done: false },
      { id: 'm3', label: '設計完了',         dueDate: '',  done: false },
      { id: 'm4', label: '開発完了',         dueDate: '',  done: false },
      { id: 'm5', label: '検収完了',         dueDate: '',  done: false },
    ],
    phase: 'kickoff',
    progress: 0,
    risk: 'none',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}
