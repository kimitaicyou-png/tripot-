import type { Deal, Claim, CommRecord } from './types';

export const MOCK_DEALS_INIT: Deal[] = [
  { id: 'd1',  clientName: 'トライポット株式会社',   dealName: 'SaaSプラットフォーム開発',  revenueType: 'shot',    industry: '製造業',      stage: 'estimate_sent', amount: 6500000, probability: 60,  assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: '最終見積書を提出済み。先方決裁待ち。' },
  { id: 'd2',  clientName: '株式会社中京メディカル',  dealName: '電子カルテAPI連携',         revenueType: 'shot',    industry: '医療',        stage: 'meeting',       amount: 0,       probability: 70,  assignee: '柏樹 久美子', lastDate: '2026-04-03', memo: '' },
  { id: 'd3',  clientName: '名古屋市教育委員会',      dealName: '学習管理システム',           revenueType: 'shot',    industry: '官公庁・教育', stage: 'in_production', amount: 8900000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-02', memo: '制作中。フロントエンド実装フェーズ。', progress: 35 },
  { id: 'd4',  clientName: '愛知県信用金庫',          dealName: '内部管理ツール開発',         revenueType: 'shot',    industry: '金融',        stage: 'invoiced',      amount: 2100000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-01', memo: '請求済み。入金待ち。', invoiceDate: '2026-04-01', paymentDue: '2026-04-30' },
  { id: 'd5',  clientName: '株式会社東海ロジスティクス', dealName: '配送管理システム',         revenueType: 'shot',    industry: '物流',        stage: 'paid',          amount: 3500000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-03-31', memo: '入金確認済み。', paidDate: '2026-03-28' },
  { id: 'd6',  clientName: '株式会社名港工業',        dealName: '生産管理DX',                revenueType: 'shot',    industry: '製造業',      stage: 'lead',          amount: 0,       probability: 50,  assignee: '柏樹 久美子', lastDate: '2026-03-30', memo: '' },
  { id: 'd7',  clientName: '有限会社スマート農業',    dealName: 'IoT農業センサー管理',        revenueType: 'shot',    industry: '農業',        stage: 'meeting',       amount: 0,       probability: 60,  assignee: '柏樹 久美子', lastDate: '2026-03-29', memo: '実証実験の提案へ進む予定。' },
  { id: 'd8',  clientName: '医療法人碧会',            dealName: '病院向け患者管理アプリ',     revenueType: 'shot',    industry: '医療',        stage: 'estimate_sent', amount: 5200000, probability: 45,  assignee: '柏樹 久美子', lastDate: '2026-03-27', memo: '見積書提出済み。回答待ち。' },
  { id: 'd9',  clientName: '愛知トヨタ協力工場',      dealName: 'QC管理システム追加開発',     revenueType: 'shot',    industry: '製造業',      stage: 'acceptance',    amount: 4200000, probability: 100, assignee: '犬飼 智之',   lastDate: '2026-03-26', memo: '先方での検収テスト中。', progress: 95 },
  { id: 'd10', clientName: '名古屋市教育委員会',      dealName: '学習管理システム保守',       revenueType: 'running', industry: '官公庁・教育', stage: 'ordered',       amount: 0,       probability: 100, assignee: '犬飼 智之',   lastDate: '2026-04-02', memo: '開発完了後に自動開始', monthlyAmount: 150000,  runningStartDate: '2026-07' },
  { id: 'd11', clientName: '愛知トヨタ協力工場',      dealName: 'QC管理システム保守',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '柏樹 久美子', lastDate: '2026-03-26', memo: '月額保守',         monthlyAmount: 80000,   runningStartDate: '2026-05' },
  { id: 'd12', clientName: '株式会社豊田精工',        dealName: 'ITコンサルティング',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: '月額コンサル。4月より開始。',   monthlyAmount: 300000,  runningStartDate: '2026-04' },
  { id: 'd13', clientName: '和泉クリエイティブ',       dealName: 'ブランドサイト制作',         revenueType: 'shot',    industry: 'IT',          stage: 'ordered',       amount: 2270000, probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '受注済み。デザイン着手中。' },
  { id: 'd14', clientName: '三河電機サービス',           dealName: 'Webサイト運用保守',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '月額運用サポート。4月より開始。', monthlyAmount: 230000,  runningStartDate: '2026-04' },
];

export const MOCK_CLAIMS: Record<string, Claim[]> = {
  'd1': [
    { id: 'cl1', date: '2026-04-03', content: '提案書の技術構成に質問あり。セキュリティ面の説明が不足との指摘。', severity: 'major', status: 'in_progress', assignee: '柏樹 久美子', response: '追加資料を準備中' },
  ],
};

export const MOCK_COMMS: Record<string, CommRecord[]> = {
  'd1': [
    { id: 'cm1', type: 'meeting', date: '2026-04-04', title: '初回技術提案', summary: 'CTO鈴木氏同席。現行システムのレスポンス問題が最大の課題。予算は6000万前後で社内稟議中。', needs: ['レスポンス改善が最優先', 'マイクロサービスへの移行希望', '既存データの移行が必須条件'] },
    { id: 'cm2', type: 'email', date: '2026-04-02', title: '提案資料送付', summary: '提案書v1をPDFで送付。「社内で共有します」との返信あり。' },
  ],
  'd2': [
    { id: 'cm3', type: 'meeting', date: '2026-04-03', title: 'ヒアリング', summary: '電子カルテの既存システムがHL7 FHIR非対応。API連携で患者データの一元管理を希望。', needs: ['HL7 FHIR対応が必須', '医療情報ガイドライン準拠', 'オンプレミス環境との共存'] },
  ],
  'd8': [
    { id: 'cm4', type: 'meeting', date: '2026-03-27', title: '初回提案', summary: '院長と事務長に提案。予約システムとの連携を重視。', needs: ['予約システム連携', 'スマホ対応（患者向け）', '高齢患者への配慮'] },
  ],
};
