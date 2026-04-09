import type {
  Company,
  ActionRecord,
  KpiSnapshot,
  WeeklyTodo,
  MonthlyTheme,
} from '@/types';

// ─── 型定義 ──────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'reviewing' | 'approved' | 'rejected' | 'pending';

export type Approval = {
  id: string;
  title: string;
  applicant: string;
  companyId: string;
  amount: number;
  purpose: string;
  recoveryPlan: string;
  risk: string;
  approvalCondition: string;
  status: ApprovalStatus;
  createdAt: string;
};

export type AiOutput = {
  id: string;
  type: 'preview' | 'agenda' | 'report' | 'alert';
  title: string;
  content: string;
  companyId?: string;
  createdAt: string;
};

// ─── マスターデータ ────────────────────────────────────────────────────────────

export const COMPANIES: Company[] = [
  { id: 'deraforce', name: 'デラフォース株式会社', shortName: 'デラフォース' },
  { id: 'kuuhaku', name: '株式会社クウハク', shortName: 'クウハク' },
  { id: 'dotsync', name: '株式会社ドットシンク', shortName: 'ドットシンク' },
];

export const ACTION_RECORDS: ActionRecord[] = [
  { id: 'a001', companyId: 'deraforce', date: '2026-04-04', actionType: 'appointment', clientName: '株式会社山田製作所', dealName: 'Webサイトリニューアル', probability: 60, assignee: '田中 太郎', memo: '先方担当: 鈴木部長。来週アポ確定。', createdAt: '2026-04-04T10:00:00' },
  { id: 'a002', companyId: 'deraforce', date: '2026-04-03', actionType: 'meeting', clientName: '有限会社中部物流', dealName: '在庫管理システム導入', probability: 70, assignee: '田中 太郎', memo: '要件ヒアリング完了。見積依頼あり。', createdAt: '2026-04-03T14:30:00' },
  { id: 'a003', companyId: 'deraforce', date: '2026-04-03', actionType: 'proposal', clientName: '株式会社ナゴヤフーズ', dealName: 'ECサイト構築', amount: 2800000, probability: 50, assignee: '佐藤 花子', memo: '提案書送付済み。来週回答予定。', createdAt: '2026-04-03T11:00:00' },
  { id: 'a004', companyId: 'deraforce', date: '2026-04-02', actionType: 'order', clientName: '東海商事株式会社', dealName: '基幹システム保守契約', amount: 1200000, assignee: '田中 太郎', createdAt: '2026-04-02T09:00:00' },
  { id: 'a005', companyId: 'deraforce', date: '2026-04-01', actionType: 'invoice', clientName: '名古屋精密工業株式会社', dealName: 'アプリ開発フェーズ1', amount: 980000, expectedPaymentDate: '2026-04-30', assignee: '鈴木 一郎', createdAt: '2026-04-01T10:00:00' },
  { id: 'a006', companyId: 'deraforce', date: '2026-03-31', actionType: 'payment_confirmed', clientName: '株式会社丸八産業', dealName: '保守サポート3月分', amount: 350000, assignee: '鈴木 一郎', createdAt: '2026-03-31T16:00:00' },
  { id: 'a007', companyId: 'deraforce', date: '2026-03-29', actionType: 'appointment', clientName: '株式会社三河電気', dealName: 'DX推進コンサル', probability: 40, assignee: '佐藤 花子', createdAt: '2026-03-29T13:00:00' },
  { id: 'a008', companyId: 'deraforce', date: '2026-03-28', actionType: 'meeting', clientName: '株式会社岡崎機械', dealName: 'IoT導入支援', probability: 65, assignee: '田中 太郎', memo: '工場見学済み。課題整理して再訪予定。', createdAt: '2026-03-28T10:30:00' },
  { id: 'a009', companyId: 'deraforce', date: '2026-03-27', actionType: 'proposal', clientName: '医療法人誠和会', dealName: '予約システム刷新', amount: 4500000, probability: 35, assignee: '佐藤 花子', createdAt: '2026-03-27T15:00:00' },
  { id: 'a010', companyId: 'deraforce', date: '2026-03-26', actionType: 'order', clientName: 'トヨタ系列協力会社', dealName: '品質管理アプリ開発', amount: 3200000, assignee: '田中 太郎', createdAt: '2026-03-26T11:00:00' },
  { id: 'b001', companyId: 'kuuhaku', date: '2026-04-04', actionType: 'meeting', clientName: '株式会社サカエデザイン', dealName: 'ブランディング支援', probability: 80, assignee: '木村 誠', memo: '方向性一致。次回で契約見込み。', createdAt: '2026-04-04T11:00:00' },
  { id: 'b002', companyId: 'kuuhaku', date: '2026-04-03', actionType: 'proposal', clientName: '有限会社花咲屋', dealName: 'パンフレット制作', amount: 450000, probability: 70, assignee: '木村 誠', createdAt: '2026-04-03T14:00:00' },
  { id: 'b003', companyId: 'kuuhaku', date: '2026-04-02', actionType: 'order', clientName: '名古屋観光開発株式会社', dealName: 'Webデザイン一式', amount: 880000, assignee: '伊藤 美咲', createdAt: '2026-04-02T10:00:00' },
  { id: 'b004', companyId: 'kuuhaku', date: '2026-04-01', actionType: 'invoice', clientName: '株式会社マルコ食品', dealName: 'パッケージデザイン', amount: 320000, expectedPaymentDate: '2026-04-25', assignee: '伊藤 美咲', createdAt: '2026-04-01T09:00:00' },
  { id: 'b005', companyId: 'kuuhaku', date: '2026-03-31', actionType: 'appointment', clientName: '医療クリニック南山', dealName: 'クリニックロゴ作成', probability: 55, assignee: '木村 誠', createdAt: '2026-03-31T13:00:00' },
  { id: 'b006', companyId: 'kuuhaku', date: '2026-03-30', actionType: 'payment_confirmed', clientName: '株式会社ナゴヤライフ', dealName: 'カタログ制作', amount: 650000, assignee: '伊藤 美咲', createdAt: '2026-03-30T16:30:00' },
  { id: 'b007', companyId: 'kuuhaku', date: '2026-03-28', actionType: 'meeting', clientName: '愛知工業株式会社', dealName: '採用サイト制作', probability: 60, assignee: '木村 誠', createdAt: '2026-03-28T11:00:00' },
  { id: 'b008', companyId: 'kuuhaku', date: '2026-03-27', actionType: 'appointment', clientName: '有限会社東山インテリア', dealName: '店舗POP制作', probability: 45, assignee: '木村 誠', createdAt: '2026-03-27T10:00:00' },
  { id: 'b009', companyId: 'kuuhaku', date: '2026-03-26', actionType: 'proposal', clientName: '株式会社セントラル商事', dealName: '会社案内刷新', amount: 780000, probability: 40, assignee: '伊藤 美咲', createdAt: '2026-03-26T14:00:00' },
  { id: 'b010', companyId: 'kuuhaku', date: '2026-03-25', actionType: 'order', clientName: '名古屋不動産開発', dealName: '物件紹介冊子', amount: 560000, assignee: '木村 誠', createdAt: '2026-03-25T09:30:00' },
  { id: 'c001', companyId: 'dotsync', date: '2026-04-04', actionType: 'proposal', clientName: '株式会社豊田精工', dealName: 'SaaSプラットフォーム開発', amount: 6500000, probability: 55, assignee: '渡辺 健', memo: 'CTO同席で技術提案。先方の反応良好。', createdAt: '2026-04-04T13:00:00' },
  { id: 'c002', companyId: 'dotsync', date: '2026-04-03', actionType: 'meeting', clientName: '株式会社中京メディカル', dealName: '電子カルテAPI連携', probability: 70, assignee: '渡辺 健', createdAt: '2026-04-03T10:00:00' },
  { id: 'c003', companyId: 'dotsync', date: '2026-04-02', actionType: 'order', clientName: '名古屋市教育委員会', dealName: '学習管理システム', amount: 8900000, assignee: '山本 彩', createdAt: '2026-04-02T11:00:00' },
  { id: 'c004', companyId: 'dotsync', date: '2026-04-01', actionType: 'invoice', clientName: '愛知県信用金庫', dealName: '内部管理ツール開発', amount: 2100000, expectedPaymentDate: '2026-04-30', assignee: '山本 彩', createdAt: '2026-04-01T09:00:00' },
  { id: 'c005', companyId: 'dotsync', date: '2026-03-31', actionType: 'payment_confirmed', clientName: '株式会社東海ロジスティクス', dealName: '配送管理システム', amount: 3400000, assignee: '山本 彩', createdAt: '2026-03-31T15:00:00' },
  { id: 'c006', companyId: 'dotsync', date: '2026-03-30', actionType: 'appointment', clientName: '株式会社名港工業', dealName: '生産管理DX', probability: 50, assignee: '渡辺 健', createdAt: '2026-03-30T10:00:00' },
  { id: 'c007', companyId: 'dotsync', date: '2026-03-29', actionType: 'meeting', clientName: '有限会社スマート農業', dealName: 'IoT農業センサー管理', probability: 60, assignee: '渡辺 健', memo: '実証実験の提案へ進む予定。', createdAt: '2026-03-29T14:00:00' },
  { id: 'c008', companyId: 'dotsync', date: '2026-03-28', actionType: 'appointment', clientName: '株式会社セントラルコーポ', dealName: 'BIダッシュボード構築', probability: 40, assignee: '山本 彩', createdAt: '2026-03-28T11:00:00' },
  { id: 'c009', companyId: 'dotsync', date: '2026-03-27', actionType: 'proposal', clientName: '医療法人碧会', dealName: '病院向け患者管理アプリ', amount: 5200000, probability: 45, assignee: '渡辺 健', createdAt: '2026-03-27T13:00:00' },
  { id: 'c010', companyId: 'dotsync', date: '2026-03-26', actionType: 'order', clientName: '愛知トヨタ協力工場', dealName: 'QC管理システム追加開発', amount: 1800000, assignee: '山本 彩', createdAt: '2026-03-26T10:00:00' },
];

export const KPI_SNAPSHOTS: KpiSnapshot[] = [
  {
    companyId: 'deraforce',
    period: '2026-04',
    funnel: { appointments: 8, meetings: 6, proposals: 4, orders: 2, conversionRates: { meeting: 75, proposal: 67, order: 50 } },
    plSummary: {
      revenue: { target: 8000000, actual: 6800000, diff: -1200000, alertLevel: 'warning' },
      grossProfit: { target: 4000000, actual: 3200000, diff: -800000, alertLevel: 'warning' },
      grossMarginRate: { target: 50, actual: 47, diff: -3, alertLevel: 'warning' },
      sgaExpenses: { target: 2500000, actual: 2700000, diff: 200000, alertLevel: 'danger' },
      operatingProfit: { target: 1500000, actual: 500000, diff: -1000000, alertLevel: 'danger' },
      ordinaryProfit: { target: 1400000, actual: 450000, diff: -950000, alertLevel: 'danger' },
    },
    cfSummary: { expectedPayment: 4200000, receivedPayment: 3100000, overdue: 450000, balance: 1850000, fourWeekShortage: 'caution', breakEvenMargin: 'caution' },
  },
  {
    companyId: 'kuuhaku',
    period: '2026-04',
    funnel: { appointments: 6, meetings: 5, proposals: 3, orders: 2, conversionRates: { meeting: 83, proposal: 60, order: 67 } },
    plSummary: {
      revenue: { target: 3500000, actual: 3800000, diff: 300000, alertLevel: 'normal' },
      grossProfit: { target: 2100000, actual: 2280000, diff: 180000, alertLevel: 'normal' },
      grossMarginRate: { target: 60, actual: 60, diff: 0, alertLevel: 'normal' },
      sgaExpenses: { target: 1400000, actual: 1380000, diff: -20000, alertLevel: 'normal' },
      operatingProfit: { target: 700000, actual: 900000, diff: 200000, alertLevel: 'normal' },
      ordinaryProfit: { target: 680000, actual: 880000, diff: 200000, alertLevel: 'normal' },
    },
    cfSummary: { expectedPayment: 2100000, receivedPayment: 1950000, overdue: 0, balance: 2300000, fourWeekShortage: 'safe', breakEvenMargin: 'safe' },
  },
  // TODO: company.ts の MONTHLY_TARGETS['2026-04'] と calculateMonthlyActual('2026-04') から生成する
  {
    companyId: 'dotsync',
    period: '2026-04',
    funnel: { appointments: 5, meetings: 4, proposals: 3, orders: 2, conversionRates: { meeting: 80, proposal: 75, order: 67 } },
    plSummary: {
      revenue:         { target: 12000000, actual: 10500000, diff: -1500000,  alertLevel: 'warning' },
      grossProfit:     { target:  5520000, actual:  4798500, diff:  -721500,  alertLevel: 'warning' },
      grossMarginRate: { target:        46, actual:       46, diff:         0, alertLevel: 'normal'  },
      sgaExpenses:     { target:  3500000, actual:  3200000, diff:  -300000,  alertLevel: 'normal'  },
      operatingProfit: { target:  2020000, actual:  1598500, diff:  -421500,  alertLevel: 'warning' },
      ordinaryProfit:  { target:  1920000, actual:  1498500, diff:  -421500,  alertLevel: 'warning' },
    },
    cfSummary: { expectedPayment: 8500000, receivedPayment: 5100000, overdue: 1200000, balance: 3200000, fourWeekShortage: 'danger', breakEvenMargin: 'caution' },
  },
];

export const WEEKLY_TODOS: WeeklyTodo[] = [
  { id: 't001', companyId: 'deraforce', weekStart: '2026-03-30', content: '山田製作所に提案書送付', assignee: '田中 太郎', deadline: '2026-04-03', completionCriteria: '先方から提案書受領メールを確認', status: 'completed' },
  { id: 't002', companyId: 'deraforce', weekStart: '2026-03-30', content: '中部物流 見積書作成・送付', assignee: '田中 太郎', deadline: '2026-04-04', completionCriteria: '見積書をメールで送付完了', status: 'pending' },
  { id: 't003', companyId: 'deraforce', weekStart: '2026-03-30', content: '名古屋精密工業 請求書発行', assignee: '鈴木 一郎', deadline: '2026-04-01', completionCriteria: '請求書発行・メール送付完了', status: 'completed' },
  { id: 't004', companyId: 'kuuhaku', weekStart: '2026-03-30', content: 'サカエデザイン 契約書ドラフト作成', assignee: '木村 誠', deadline: '2026-04-05', completionCriteria: '弁護士確認後に先方へ送付', status: 'pending' },
  { id: 't005', companyId: 'kuuhaku', weekStart: '2026-03-30', content: '花咲屋 提案プレゼン準備', assignee: '木村 誠', deadline: '2026-04-03', completionCriteria: 'スライド完成・レビュー完了', status: 'completed' },
  { id: 't006', companyId: 'kuuhaku', weekStart: '2026-03-30', content: '入金確認・未収リスト更新', assignee: '伊藤 美咲', deadline: '2026-04-01', completionCriteria: '未収リストを経理に提出', status: 'completed' },
  { id: 't007', companyId: 'dotsync', weekStart: '2026-03-30', content: '豊田精工 技術提案書作成', assignee: '渡辺 健', deadline: '2026-04-04', completionCriteria: '技術仕様書・見積り込みで提出', status: 'pending' },
  { id: 't008', companyId: 'dotsync', weekStart: '2026-03-30', content: '名古屋市教育委員会 受注処理完了', assignee: '山本 彩', deadline: '2026-04-02', completionCriteria: '契約書締結・キックオフ日程確定', status: 'completed' },
  { id: 't009', companyId: 'dotsync', weekStart: '2026-03-30', content: '東海ロジスティクス 過入金確認', assignee: '山本 彩', deadline: '2026-04-03', completionCriteria: '入金消込完了・残高確認', status: 'completed' },
];

export const MONTHLY_THEMES: MonthlyTheme[] = [
  { month: 4, theme: '販売力', purpose: '新規商談獲得数を前月比150%に引き上げ、パイプラインを強化する', progressStatus: 'yellow' },
  { month: 5, theme: '収益改善', purpose: '粗利率を55%以上に回復させ、収益体質を強化する', progressStatus: 'green' },
  { month: 6, theme: '組織強化', purpose: '採用・育成施策を完了し、下半期の体制を整える', progressStatus: 'green' },
];

export const mockApprovals: Approval[] = [];

export const mockAiOutputs: AiOutput[] = [
  {
    id: 'ai-001',
    type: 'preview',
    title: '2026年4月 週次プレレビュー',
    content: `## 今週のサマリー

**全社合計:** アポ19件 / 商談15件 / 提案10件 / 受注6件

---

### デラフォース
売上進捗が目標比85%と遅れています。特に営業利益が目標の33%にとどまっており、販管費の圧縮か受注増が急務です。

### クウハク
全項目で目標超過。粗利率60%を維持しており、安定した収益体質を確認できます。来月以降の新規開拓に注力することを推奨します。

### ドットシンク
大型案件（教育委員会）を受注しましたが、CF面で4週間不足リスクが危険判定です。入金スケジュールの前倒し交渉を検討してください。`,
    createdAt: '2026-04-04',
  },
  {
    id: 'ai-002',
    type: 'agenda',
    title: '2026年4月第2週 週次会議アジェンダ',
    content: `# 週次会議アジェンダ（2026/4/7）

## 1. 先週の振り返り（10分）
- [ ] 各社ToDoの完了確認
- [ ] 未完了ToDo の要因共有

## 2. 数字の確認（15分）
- [ ] ファネル転換率の確認（ボトルネック重点議論）
- [ ] CF状況確認（ドットシンクのキャッシュ不足対策）

## 3. 今週の重点行動（10分）
- [ ] デラフォース: 中部物流 見積提出
- [ ] クウハク: サカエデザイン 契約書送付
- [ ] ドットシンク: 豊田精工 技術提案書提出

## 4. 懸案事項・支援依頼（10分）
- [ ] 各社から支援依頼の共有

## 5. 来週のテーマ確認（5分）`,
    createdAt: '2026-04-05',
  },
  {
    id: 'ai-003',
    type: 'alert',
    title: 'キャッシュフロー警告: ドットシンク',
    content: '4週間以内のキャッシュショートリスクが危険水準です。未収入金1,200万円の早期回収と支払いの優先順位付けを即座に行ってください。',
    companyId: 'dotsync',
    createdAt: '2026-04-04',
  },
  {
    id: 'ai-004',
    type: 'alert',
    title: '営業利益乖離警告: デラフォース',
    content: '当月の営業利益が目標比33%（50万円）にとどまっています。販管費超過（+20万円）が主因です。経費抑制または売上追加が必要です。',
    companyId: 'deraforce',
    createdAt: '2026-04-03',
  },
];

// ─── ヘルパー関数 ─────────────────────────────────────────────────────────────

export function getCompanyById(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function getActionRecordsByCompany(companyId: string): ActionRecord[] {
  return ACTION_RECORDS.filter((r) => r.companyId === companyId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getKpiSnapshot(companyId: string): KpiSnapshot | undefined {
  return KPI_SNAPSHOTS.find((s) => s.companyId === companyId);
}

export function getWeeklyTodosByCompany(companyId: string): WeeklyTodo[] {
  return WEEKLY_TODOS.filter((t) => t.companyId === companyId);
}

export function getCurrentMonthlyTheme(): MonthlyTheme | undefined {
  const currentMonth = new Date().getMonth() + 1;
  return MONTHLY_THEMES.find((t) => t.month === currentMonth);
}

// ─── 互換エクスポート（既存ページとの互換性維持） ─────────────────────────────

export const companies = COMPANIES;

export const mockKpiByCompany: Record<string, KpiSnapshot> = Object.fromEntries(
  KPI_SNAPSHOTS.map((s) => [s.companyId, s])
);
