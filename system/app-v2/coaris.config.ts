/**
 * coaris.config.ts — tripot v2 ＋13社展開テンプレ基盤
 *
 * 2026-04-25 美桜＋セバスチャン合議起草、本実装版。
 * 旧 v1 の `USERS = {toki, ono}` ハードコードと localStorage["tripot_current_user"] を絶滅させ、
 * このファイル1個書き換えるだけで各事業会社が立ち上がる構造にする。
 *
 * セキュリティガイドライン：
 * - このファイルに API Key / Secret / パスワードを絶対に書かない
 * - 機密情報は環境変数経由のみ（process.env.XXX）
 * - 本ファイルは Git 追跡対象、社外秘扱い
 */

import type { ReactNode } from 'react';

/* ============================================================
 * 型定義（厳格）
 * ============================================================ */

export type CompanyRole = 'president' | 'hq_member' | 'member';

export type SyncMode = 'realtime' | 'daily_batch' | 'hybrid' | 'disabled';

export type IndustryType =
  | 'IT'
  | '製造'
  | '建設'
  | 'BPO'
  | '医療'
  | '介護'
  | 'マーケ'
  | '広告'
  | '飲食'
  | '不動産'
  | 'グローバル';

/** 案件ステージ定義（13社で名称・色・順序カスタム可） */
export type StageDef = {
  key: string;
  label: string;
  badgeClass: string;
  order: number;
  /** weekly/cf 確度モデル：このステージの加重係数（0-1） */
  cashflowWeight: number;
  isTerminal?: boolean;
};

/** ロール権限 */
export type RoleDef = {
  key: CompanyRole;
  label: string;
  description: string;
};

/** 業界特化 KPI 定義 */
export type IndustryKpiDef = {
  key: string;
  label: string;
  unit?: string;
  goalDirection: 'up' | 'down';
};

/** 名言（home top ローテ用、v1 DEFAULT_QUOTES 撲滅） */
export type QuoteSeed = {
  body: string;
  author?: string;
  weight?: number;
};

/** プロジェクトテンプレ（v1 PROJECT_TEMPLATES 撲滅、IT系のみ使用） */
export type ProjectTemplateSeed = {
  name: string;
  description: string;
};

/** 攻略スコアリング重み付け */
export type AttackScoringConfig = {
  budgetMatch: number;
  decisionMakerAccess: number;
  competitorAdvantage: number;
  timingFit: number;
  relationshipDepth: number;
};

/** 会計年度設定 */
export type FiscalConfig = {
  /** 期初月（1=1月、4=4月） */
  startMonth: number;
};

export type CompanyConfig = {
  /** 会社識別ID（URL階層、DBスキーマ、設定キーで使う） */
  id: string;

  /** 会社の正式名称（UIに表示） */
  name: string;

  /** 会社の略称・愛称 */
  shortName: string;

  /** coaris.ai 配下のパス（例: 'tripot' → coaris.ai/tripot） */
  pathPrefix: string;

  /** 法人形態 */
  legalForm: '株式会社' | '合同会社' | '一般社団法人' | '個人事業主';

  /** 代表者・社長情報（DBの初期データではなくUI表示用、メンバーDBが正本） */
  president: {
    name: string;
    email: string;
    role: 'president';
  };

  /** ブランディング */
  branding: {
    logo: {
      type: 'svg' | 'png';
      path: string;
    };
    primaryColor: string;
    primaryColorHex: string;
    accentColor: string;
    accentColorHex: string;
    fontFamily: string;
  };

  /** 認証＆権限設定（NextAuth signIn callback で使う） */
  auth: {
    allowedEmailDomains: string[];
    defaultRole: CompanyRole;
    devAllowedFromEnv: boolean;
  };

  /** 機能フラグ（13社で機能差別化） */
  features: {
    moneyForward: boolean;
    csvImport: boolean;
    weeklyMeeting: boolean;
    monthlyMeeting: boolean;
    yearlyBudget: boolean;
    productionDashboard: boolean;
    customerCRM: boolean;
    approvalFlow: boolean;
    aiAssistant: boolean;
    auditLog: boolean;
    childAiSecretary: boolean;
    voiceMeetings: boolean;
    proposalAi: boolean;
    estimateAi: boolean;
    attackScoring: boolean;
  };

  /** 業界特化フィールド */
  industryFields?: {
    type: IndustryType;
    customKPIs?: IndustryKpiDef[];
  };

  /** 案件ステージ（13社カスタム可） */
  stages: StageDef[];

  /** ロール定義 */
  roles: RoleDef[];

  /** 名言初期 seed（home top ローテ） */
  quotes: QuoteSeed[];

  /** プロジェクトテンプレ初期 seed（IT系のみ） */
  projectTemplates?: ProjectTemplateSeed[];

  /** 攻略スコア重み付け */
  attackScoring: AttackScoringConfig;

  /** 会計年度設定 */
  fiscal: FiscalConfig;

  /** 本部との接続設定 */
  bridgeToHQ: {
    kpiEndpoint: string;
    syncMode: SyncMode;
    webhookUrl?: string;
  };
};

/* ============================================================
 * tripot v2 設定（最初の事業会社、基準値）
 * ============================================================ */

export const TRIPOT_CONFIG: CompanyConfig = {
  id: 'tripot',
  name: 'トライポット株式会社',
  shortName: 'tripot',
  pathPrefix: 'tripot',
  legalForm: '株式会社',
  president: {
    name: '土岐 公人',
    email: 'k.toki@coaris.ai', // 旧 jtravel.group から正式独立後
    role: 'president',
  },
  branding: {
    logo: {
      type: 'svg',
      path: '/companies/tripot/logo.svg',
    },
    primaryColor: 'bg-blue-600',
    primaryColorHex: '#2563EB',
    accentColor: 'bg-amber-500',
    accentColorHex: '#F59E0B',
    fontFamily: "'Manrope', 'Noto Sans JP', sans-serif", // ❄️美冬選定
  },
  auth: {
    allowedEmailDomains: ['coaris.ai', 'tripot.coaris.ai'],
    defaultRole: 'member',
    devAllowedFromEnv: true,
  },
  features: {
    moneyForward: true,
    csvImport: true,
    weeklyMeeting: true,
    monthlyMeeting: true,
    yearlyBudget: true,
    productionDashboard: true,
    customerCRM: true,
    approvalFlow: true,
    aiAssistant: true,
    auditLog: true,
    childAiSecretary: true,
    voiceMeetings: true,
    proposalAi: true,
    estimateAi: true,
    attackScoring: true,
  },
  industryFields: {
    type: 'IT',
    customKPIs: [
      { key: 'bug_fixes', label: 'バグ修正数', unit: '件', goalDirection: 'up' },
      { key: 'deployments', label: 'デプロイ回数', unit: '回', goalDirection: 'up' },
      { key: 'mttr_minutes', label: '障害復旧時間', unit: '分', goalDirection: 'down' },
    ],
  },
  stages: [
    { key: 'prospect', label: '見込み', badgeClass: 'bg-slate-100 text-slate-700', order: 10, cashflowWeight: 0.1 },
    { key: 'proposing', label: '提案中', badgeClass: 'bg-blue-100 text-blue-800', order: 20, cashflowWeight: 0.3 },
    { key: 'ordered', label: '受注', badgeClass: 'bg-amber-100 text-amber-800', order: 30, cashflowWeight: 0.7 },
    { key: 'in_production', label: '制作中', badgeClass: 'bg-purple-100 text-purple-800', order: 40, cashflowWeight: 0.8 },
    { key: 'delivered', label: '納品済', badgeClass: 'bg-cyan-100 text-cyan-800', order: 50, cashflowWeight: 0.9 },
    { key: 'acceptance', label: '検収', badgeClass: 'bg-teal-100 text-teal-800', order: 60, cashflowWeight: 0.95 },
    { key: 'invoiced', label: '請求済', badgeClass: 'bg-indigo-100 text-indigo-800', order: 70, cashflowWeight: 0.95 },
    { key: 'paid', label: '入金済', badgeClass: 'bg-green-100 text-green-800', order: 80, cashflowWeight: 1.0, isTerminal: true },
    { key: 'lost', label: '失注', badgeClass: 'bg-red-100 text-red-800', order: 999, cashflowWeight: 0, isTerminal: true },
  ],
  roles: [
    { key: 'president', label: '代表', description: '全社俯瞰・最終決裁・予算策定' },
    { key: 'hq_member', label: '本部メンバー', description: '全社データ閲覧・部門横断業務' },
    { key: 'member', label: 'メンバー', description: '自分の案件・タスクを推進' },
  ],
  quotes: [
    { body: '打席に立たなければヒットは出ない', weight: 3 },
    { body: '小さな一歩が、明日の風景を変える', weight: 2 },
    { body: '放置は最大の敵', weight: 2 },
    { body: '行動量がKPIの源泉', weight: 3 },
    { body: 'みんなの甲子園を応援する', author: '隊長', weight: 1 },
    { body: '過程こそが幸せ', author: '隊長', weight: 1 },
  ],
  projectTemplates: [
    { name: 'LP制作', description: 'ランディングページ単発、デザイン+実装+運用引渡' },
    { name: 'コーポレートサイト', description: '会社案内・採用・IR含む複数ページ構成' },
    { name: 'ECサイト', description: 'Shopify or 自社実装、決済・在庫連携' },
    { name: 'システム開発', description: '受託SI、要件定義から保守まで' },
    { name: '運用保守', description: '月額継続、稼働監視・改修対応' },
    { name: 'PoC・検証', description: '短期スプリント、実証実験' },
  ],
  attackScoring: {
    budgetMatch: 0.25,
    decisionMakerAccess: 0.25,
    competitorAdvantage: 0.20,
    timingFit: 0.15,
    relationshipDepth: 0.15,
  },
  fiscal: {
    startMonth: 4,
  },
  bridgeToHQ: {
    kpiEndpoint: '/api/bridge/kpi',
    syncMode: 'hybrid',
    webhookUrl: 'https://coaris.ai/api/hq/webhook',
  },
};

/* ============================================================
 * 13社展開時の手順（テンプレ運用）
 * ============================================================
 *
 * 新会社（例：deraforce）を追加する時：
 *
 * 1. 新規 Next.js プロジェクト作成（coaris-deraforce）
 * 2. このファイルをコピーして deraforce.config.ts として保存
 * 3. CompanyConfig 全フィールドを deraforce 用に書き換え
 * 4. 本部 coaris-ai の Microfrontends 設定に deraforce を追加
 * 5. DNS設定：Vercel Microfrontends が自動で coaris.ai/deraforce を配信
 * 6. /api/bridge/kpi 実装：deraforce 業務フローに合わせて翻訳ロジック書く
 * 7. Webhook 配信先を本部 webhookUrl に向ける
 * 8. 本部側の coaris.ai 管理画面に deraforce を登録
 * 9. メンバー招待開始
 *
 * 1社追加に半日〜1日（テンプレ流用＋設定書き換え）。
 * ============================================================ */

/* ============================================================
 * 環境変数（実装時に process.env から取得）
 * ============================================================
 *
 * AUTH_GOOGLE_ID_V2       — Google OAuth Client ID（v2用、新規発行）
 * AUTH_GOOGLE_SECRET_V2   — Google OAuth Client Secret
 * AUTH_SECRET             — NextAuth JWT 署名鍵（新規生成）
 * NEXTAUTH_URL            — https://coaris.ai/tripot
 * DATABASE_URL            — Neon PostgreSQL
 * MEM0_API_URL            — https://mem0-coaris.fly.dev
 * MEM0_API_KEY            — Mem0 サーバー API Key
 * BRIDGE_SERVICE_TOKEN    — 本部↔事業会社の内部 service token
 * MF_CLIENT_ID            — MoneyForward OAuth
 * MF_CLIENT_SECRET        — MoneyForward OAuth
 * MF_API_KEY              — MoneyForward API Key
 * RESEND_API_KEY          — メール送信
 * ANTHROPIC_API_KEY       — Claude API（4姉妹常駐AI用）
 * DEV_ALLOWED_EMAILS      — 開発時に許可するメアド（カンマ区切り）
 * ============================================================ */
