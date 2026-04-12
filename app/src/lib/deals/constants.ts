import type { Stage, HistoryEventType, AttachmentKind, CommType } from './types';

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
  lead:           'bg-gray-100 text-gray-700',
  meeting:        'bg-blue-50 text-blue-700 border border-blue-200',
  proposal:       'bg-blue-50 text-blue-700 border border-blue-200',
  estimate_sent:  'bg-blue-50 text-blue-700 border border-blue-200',
  negotiation:    'bg-gray-100 text-gray-700',
  ordered:        'bg-blue-50 text-blue-700 border border-blue-200',
  in_production:  'bg-blue-100 text-blue-800 border border-blue-300',
  delivered:      'bg-blue-50 text-blue-700 border border-blue-200',
  acceptance:     'bg-blue-50 text-blue-700 border border-blue-200',
  invoiced:       'bg-gray-100 text-gray-700',
  accounting:     'bg-gray-100 text-gray-600',
  paid:           'bg-gray-100 text-gray-500',
  claim:          'bg-red-50 text-red-700 border border-red-200',
  claim_resolved: 'bg-gray-100 text-gray-600',
  lost:           'bg-gray-100 text-gray-500',
};

export const CLAIM_NEXT_STAGES: Partial<Record<Stage, Stage[]>> = {
  claim: ['claim_resolved'],
  claim_resolved: ['invoiced', 'paid'],
};

export const SALES_STAGES: Stage[] = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered'];
export const PRODUCTION_STAGES: Stage[] = ['in_production', 'delivered', 'acceptance'];
export const BILLING_STAGES: Stage[] = ['invoiced', 'accounting', 'paid'];

export const HISTORY_TYPE_CONFIG: Record<HistoryEventType, { icon: string; color: string }> = {
  stage_change:    { icon: '🔄', color: 'bg-blue-50 border-blue-200' },
  proposal_sent:   { icon: '📄', color: 'bg-gray-50 border-gray-200' },
  estimate_sent:   { icon: '💰', color: 'bg-gray-50 border-gray-200' },
  contract_sent:   { icon: '📋', color: 'bg-amber-50 border-amber-200' },
  contract_signed: { icon: '✅', color: 'bg-blue-50 border-blue-200' },
  invoice_sent:    { icon: '🧾', color: 'bg-gray-50 border-gray-200' },
  paid:            { icon: '💳', color: 'bg-gray-50 border-gray-200' },
  email_sent:      { icon: '✉', color: 'bg-gray-50 border-gray-200' },
  file_attached:   { icon: '📎', color: 'bg-gray-50 border-gray-200' },
  note:            { icon: '📝', color: 'bg-gray-50 border-gray-200' },
};

export const KIND_ICON: Record<AttachmentKind, string> = {
  figma: '📐',
  link: '🔗',
  google_doc: '📄',
  sheet: '📊',
  slide: '🖼',
  pdf: '📑',
  image: '🖼',
  other: '📎',
};

export const KIND_LABEL: Record<AttachmentKind, string> = {
  figma: 'Figma',
  link: 'リンク',
  google_doc: 'Google Docs',
  sheet: 'スプレッドシート',
  slide: 'スライド',
  pdf: 'PDF',
  image: '画像',
  other: 'その他',
};

export const COMM_TYPE_LABEL: Record<CommType, string> = {
  meeting: '打ち合わせ',
  email:   'メール',
  call:    '電話',
  note:    'メモ',
};

export const ACTION_TABS: { id: 'email' | 'meeting' | 'gmeet' | 'call'; label: string; icon: string }[] = [
  { id: 'meeting', label: '打合せ', icon: '🤝' },
  { id: 'email',   label: 'メール', icon: '✉' },
  { id: 'gmeet',   label: 'Meet',   icon: '📹' },
  { id: 'call',    label: '電話',   icon: '📞' },
];

export const INDUSTRY_RATES: Record<string, { label: string; unitPrice: number; unit: string }[]> = {
  '製造業': [
    { label: '要件定義', unitPrice: 800000, unit: '人月' },
    { label: '基本設計', unitPrice: 900000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 750000, unit: '人月' },
    { label: 'テスト', unitPrice: 600000, unit: '人月' },
    { label: 'PM', unitPrice: 1000000, unit: '人月' },
  ],
  '医療': [
    { label: '要件定義', unitPrice: 900000, unit: '人月' },
    { label: '基本設計', unitPrice: 1000000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 850000, unit: '人月' },
    { label: 'テスト（含バリデーション）', unitPrice: 800000, unit: '人月' },
    { label: 'PM', unitPrice: 1100000, unit: '人月' },
  ],
  '金融': [
    { label: '要件定義', unitPrice: 1000000, unit: '人月' },
    { label: '基本設計', unitPrice: 1100000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 900000, unit: '人月' },
    { label: 'テスト・セキュリティ検証', unitPrice: 850000, unit: '人月' },
    { label: 'PM', unitPrice: 1200000, unit: '人月' },
  ],
  '官公庁・教育': [
    { label: '要件定義', unitPrice: 850000, unit: '人月' },
    { label: '基本設計', unitPrice: 950000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 800000, unit: '人月' },
    { label: 'テスト・受入支援', unitPrice: 700000, unit: '人月' },
    { label: 'PM', unitPrice: 1000000, unit: '人月' },
  ],
  default: [
    { label: '要件定義', unitPrice: 800000, unit: '人月' },
    { label: '基本設計', unitPrice: 850000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 750000, unit: '人月' },
    { label: 'テスト', unitPrice: 600000, unit: '人月' },
    { label: 'PM', unitPrice: 950000, unit: '人月' },
  ],
};

export function getIndustryRates(industry: string) {
  return INDUSTRY_RATES[industry] ?? INDUSTRY_RATES['default'];
}

export const SLIDE_TO_SECTION: Record<string, number> = {
  cover: -1, problem: 0, solution: 1, effect: 1, tech: 1, schedule: 2, team: 2, cases: 2, cost: 2, next: 3, custom: 3,
};

export const KISHOUTENKETSU: { key: string; label: string; color: string; subItems: string[] }[] = [
  { key: 'ki',  label: '起', color: '#B91C1C', subItems: ['市場調査', '顧客動向', '他社状況', '課題'] },
  { key: 'shou', label: '承', color: '#1D4ED8', subItems: ['サービス概要', 'サービス特徴', 'ビジネスフロー', '競合優位性'] },
  { key: 'ten',  label: '転', color: '#047857', subItems: ['事業計画', 'KPI', '販売・獲得プラン', 'スケジュール'] },
  { key: 'ketsu', label: '結', color: '#7C3AED', subItems: ['ビジョン', '2〜3年後の未来', 'サービスイメージ', '結び'] },
];

export const KSTK_TABS = [
  { key: 'ki', label: '起', sub: '課題提起', color: '#B91C1C', placeholder: '市場の動向、顧客が抱える課題、競合状況など' },
  { key: 'shou', label: '承', sub: 'ソリューション', color: '#1D4ED8', placeholder: 'サービスの概要、特徴、ビジネスフロー、競合優位性' },
  { key: 'ten', label: '転', sub: '実行計画', color: '#047857', placeholder: '事業計画、KPI、費用、スケジュール' },
  { key: 'ketsu', label: '結', sub: 'ビジョン', color: '#7C3AED', placeholder: '2〜3年後の未来、ビジョン、導入後の理想像' },
] as const;

export type MarketData = { size: string; growth: string; trends: string[]; competitors: string[] };

export const MARKET_DATA: Record<string, MarketData> = {
  '製造業': {
    size: '4.2兆円',
    growth: '年5.8%',
    trends: ['DX投資の本格化', 'IoT・AIによる予知保全', 'カーボンニュートラル対応'],
    competitors: ['富士通', 'NEC', 'CTC'],
  },
  '医療': {
    size: '1.8兆円',
    growth: '年7.2%',
    trends: ['電子カルテの普及加速', 'AI診断支援の台頭', '訪問・在宅医療のデジタル化'],
    competitors: ['MEDIS', '富士フイルム', 'NTTデータ'],
  },
  '金融': {
    size: '3.1兆円',
    growth: '年6.4%',
    trends: ['オープンバンキングの拡大', 'AIリスク審査の普及', 'ノーコード業務自動化'],
    competitors: ['NTTデータ', 'TIS', 'FISC'],
  },
  '物流': {
    size: '2.6兆円',
    growth: '年8.1%',
    trends: ['ラストワンマイル自動化', 'WMS・TMSクラウド化', '2024年問題対応'],
    competitors: ['NTTロジスコ', 'SBSホールディングス', 'オープンロジ'],
  },
  '小売': {
    size: '1.4兆円',
    growth: '年9.3%',
    trends: ['OMO戦略の本格化', 'AIパーソナライズ推薦', '在庫最適化AI'],
    competitors: ['インテージ', 'True Data', 'シナジーマーケティング'],
  },
  '建設': {
    size: '1.1兆円',
    growth: '年4.9%',
    trends: ['BIM/CIMの義務化対応', 'ドローン測量の普及', '施工管理DX'],
    competitors: ['オートデスク', '福井コンピュータ', 'コンピュータシステム研究所'],
  },
  '不動産': {
    size: '0.9兆円',
    growth: '年5.5%',
    trends: ['PropTechによる取引デジタル化', 'AI査定の普及', 'スマートビル化'],
    competitors: ['いえらぶGROUP', 'Land Brain', 'GA technologies'],
  },
  'IT': {
    size: '5.6兆円',
    growth: '年11.2%',
    trends: ['生成AI組み込みの標準化', 'エッジコンピューティング拡大', 'セキュリティ強化投資増'],
    competitors: ['アクセンチュア', '野村総研', 'SAP'],
  },
};

export const MARKET_DATA_DEFAULT: MarketData = {
  size: '市場規模調査中',
  growth: '成長率調査中',
  trends: ['DX推進の加速', 'AI・クラウド活用', 'コスト最適化ニーズの高まり'],
  competitors: ['既存ベンダー', 'SaaS新興勢力', '内製化傾向'],
};

export function getMarketData(industry: string): MarketData {
  return MARKET_DATA[industry] ?? MARKET_DATA_DEFAULT;
}

export const RESOURCES: { id: string; name: string; role: string; load: number; type: 'inhouse' | 'outsource' }[] = [];

export const COMPANY_BANK_ACCOUNT = {
  bank: '三菱UFJ銀行',
  branch: '名古屋支店',
  accountType: '普通',
  accountNumber: '1234567',
  accountName: 'トライポット(カ',
} as const;

export const COMPANY_BANK_ACCOUNT_TEXT = `${COMPANY_BANK_ACCOUNT.bank} ${COMPANY_BANK_ACCOUNT.branch} ${COMPANY_BANK_ACCOUNT.accountType} ${COMPANY_BANK_ACCOUNT.accountNumber} ${COMPANY_BANK_ACCOUNT.accountName}`;

export const scheduleData = [
  { name: '要件定義', start: 0, duration: 2 },
  { name: '基本設計', start: 2, duration: 2 },
  { name: '詳細設計・開発', start: 4, duration: 6 },
  { name: 'テスト', start: 10, duration: 2 },
];
