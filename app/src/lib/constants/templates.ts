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
