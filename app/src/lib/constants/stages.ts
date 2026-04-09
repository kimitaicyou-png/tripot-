import type { Stage, Phase, CancelReason } from '@/lib/stores/types';

export const STAGE_LABEL: Record<Stage, string> = {
  lead:           'リード',
  meeting:        '商談',
  proposal:       '提案',
  estimate_sent:  '見積提出',
  negotiation:    '交渉中',
  ordered:        '受注',
  in_production:  '制作中',
  delivered:      '納品',
  acceptance:     '検収',
  invoiced:       '請求済',
  accounting:     '経理処理中',
  paid:           '入金済',
  claim:          'クレーム',
  claim_resolved: 'クレーム解決',
  lost:           '失注',
};

export const STAGE_BADGE: Record<Stage, string> = {
  lead:           'bg-gray-100 text-gray-600',
  meeting:        'bg-blue-50 text-blue-700',
  proposal:       'bg-blue-50 text-blue-700',
  estimate_sent:  'bg-blue-50 text-blue-700',
  negotiation:    'bg-gray-100 text-gray-700',
  ordered:        'bg-blue-50 text-blue-700',
  in_production:  'bg-blue-100 text-blue-800',
  delivered:      'bg-blue-50 text-blue-700',
  acceptance:     'bg-blue-50 text-blue-700',
  invoiced:       'bg-gray-100 text-gray-700',
  accounting:     'bg-gray-100 text-gray-600',
  paid:           'bg-emerald-50 text-emerald-700',
  claim:          'bg-red-50 text-red-700',
  claim_resolved: 'bg-gray-100 text-gray-600',
  lost:           'bg-gray-100 text-gray-500',
};

export const SALES_STAGES: Stage[] = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered'];
export const ORDERED_STAGES: Stage[] = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];

export const PHASE_LABEL: Record<Phase, string> = {
  kickoff:      'キックオフ前',
  requirements: '要件整理',
  design:       '設計中',
  development:  '開発中',
  test:         'テスト中',
  release:      'リリース',
  operation:    '運用',
};

export const PHASE_ORDER: Phase[] = ['kickoff', 'requirements', 'design', 'development', 'test', 'release', 'operation'];

export const PHASE_BORDER_COLOR: Record<Phase, string> = {
  kickoff:      'border-l-gray-400',
  requirements: 'border-l-blue-400',
  design:       'border-l-indigo-400',
  development:  'border-l-amber-400',
  test:         'border-l-orange-400',
  release:      'border-l-emerald-400',
  operation:    'border-l-teal-400',
};

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  price:             '価格・費用',
  competitor:        '競合他社に負けた',
  budget_freeze:     '顧客の予算凍結',
  spec_disagreement: '仕様が合意できなかった',
  client_reason:     '顧客都合（事業方針変更等）',
  other:             'その他',
};

export const CANCEL_REASONS: CancelReason[] = ['price', 'competitor', 'budget_freeze', 'spec_disagreement', 'client_reason', 'other'];

export const RISK_COLOR: Record<string, string> = {
  none:   'bg-gray-100 text-gray-500',
  low:    'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-300',
  high:   'bg-red-50 text-red-700 border-red-300',
};

export const RISK_LABEL: Record<string, string> = {
  none:   'リスクなし',
  low:    'リスク低',
  medium: 'リスク中',
  high:   'リスク高',
};
