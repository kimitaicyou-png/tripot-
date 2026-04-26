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
      path: string; // /public/companies/{id}/logo.svg
    };
    /** Tailwind CSS class、コアリスUI絶対ルール準拠 */
    primaryColor: string; // 例: 'bg-blue-600'
    /** 実際の HEX 値（CSS variable で使用） */
    primaryColorHex: string; // 例: '#2563EB'
    accentColor: string;
    accentColorHex: string;
    /** ❄️美冬選定、Geist 脱却 */
    fontFamily: string; // 例: "'Manrope', 'Noto Sans JP', sans-serif"
  };

  /** 認証＆権限設定（NextAuth signIn callback で使う） */
  auth: {
    /** このメアドドメイン以外はログイン拒否 */
    allowedEmailDomains: string[]; // 例: ['coaris.ai', 'tripot.coaris.ai']
    /** 初回ログイン時のデフォルトロール */
    defaultRole: CompanyRole;
    /** 開発時の例外許可メアドリスト（DEV_ALLOWED_EMAILS env 経由） */
    devAllowedFromEnv: boolean;
  };

  /** 機能フラグ（13社で機能差別化） */
  features: {
    moneyForward: boolean; // MFクラウド連携
    csvImport: boolean; // データ取込
    weeklyMeeting: boolean; // 週次会議画面
    monthlyMeeting: boolean; // 月次会議画面
    yearlyBudget: boolean; // 事業計画
    productionDashboard: boolean; // 制作管理（IT系のみ）
    customerCRM: boolean; // 顧客管理
    approvalFlow: boolean; // 申請承認
    aiAssistant: boolean; // 4姉妹常駐AI
    auditLog: boolean; // 監査ログ（推奨ON）
  };

  /** 業界特化フィールド */
  industryFields?: {
    type: IndustryType;
    customKPIs?: string[]; // 業界特有のKPI識別子
  };

  /** 本部との接続設定 */
  bridgeToHQ: {
    /** 本部に送信するKPIエンドポイント */
    kpiEndpoint: string; // /api/bridge/kpi
    /** 同期方式 */
    syncMode: SyncMode;
    /** 重要変化を本部にPushするWebhook URL（本部側で受信） */
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
    moneyForward: true, // MFクラウド連携あり（v2再設計、隊長指摘「雑」を解消）
    csvImport: true,
    weeklyMeeting: true,
    monthlyMeeting: true,
    yearlyBudget: true,
    productionDashboard: true, // IT系なのでON
    customerCRM: true,
    approvalFlow: true,
    aiAssistant: true, // 4姉妹常駐
    auditLog: true,
  },
  industryFields: {
    type: 'IT',
    customKPIs: ['bug_fixes', 'deployments'],
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
