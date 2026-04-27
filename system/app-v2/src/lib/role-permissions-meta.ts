export const RESOURCES = [
  'deal',
  'customer',
  'task',
  'meeting',
  'proposal',
  'estimate',
  'invoice',
  'attack_plan',
  'commitment',
  'production_card',
  'budget',
  'monthly_report',
  'approval',
  'audit_log',
  'company_settings',
  'member',
  'integration',
] as const;

export const ACTIONS_BY_RESOURCE: Record<string, string[]> = {
  deal: ['create', 'read_self', 'read_all', 'update', 'delete'],
  customer: ['create', 'read_self', 'read_all', 'update', 'delete'],
  task: ['create', 'read', 'update', 'delete'],
  meeting: ['create', 'read', 'update', 'delete'],
  proposal: ['create', 'read', 'update', 'delete'],
  estimate: ['create', 'read', 'update', 'delete'],
  invoice: ['create', 'read', 'update', 'delete', 'mark_paid'],
  attack_plan: ['create', 'read', 'update'],
  commitment: ['create', 'read_self', 'read_all', 'complete', 'delete'],
  production_card: ['create', 'read', 'update', 'delete'],
  budget: ['read', 'update', 'import_actuals'],
  monthly_report: ['generate', 'read', 'send_to_hq'],
  approval: ['request', 'decide', 'read_all'],
  audit_log: ['read'],
  company_settings: ['read', 'update'],
  member: ['create', 'read', 'update', 'deactivate'],
  integration: ['connect', 'disconnect', 'read'],
};

export type Role = 'president' | 'hq_member' | 'member';
export const ROLES: Role[] = ['president', 'hq_member', 'member'];

export const RESOURCE_LABELS: Record<string, string> = {
  deal: '案件',
  customer: '顧客',
  task: 'タスク',
  meeting: '議事録',
  proposal: '提案書',
  estimate: '見積',
  invoice: '請求書',
  attack_plan: '攻略カード',
  commitment: 'コミットメント',
  production_card: '制作カード',
  budget: '事業計画',
  monthly_report: '月次レポート',
  approval: '承認',
  audit_log: '監査ログ',
  company_settings: '会社設定',
  member: 'メンバー',
  integration: '外部連携',
};

export const ACTION_LABELS: Record<string, string> = {
  create: '作成',
  read: '閲覧',
  read_self: '自分のみ閲覧',
  read_all: '全社閲覧',
  update: '編集',
  delete: '削除',
  request: '申請',
  decide: '決裁',
  generate: '生成',
  send_to_hq: '本部送信',
  connect: '接続',
  disconnect: '切断',
  mark_paid: '入金確認',
  complete: '完了',
  deactivate: '無効化',
  import_actuals: '実績取込',
};

export function getResourceList(): readonly string[] {
  return RESOURCES;
}

export function getActionsForResource(resource: string): string[] {
  return ACTIONS_BY_RESOURCE[resource] ?? [];
}
