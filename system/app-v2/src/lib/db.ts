/**
 * Drizzle DB クライアント
 *
 * Neon Serverless + drizzle-orm/neon-http
 * RLS 用の SET LOCAL ヘルパー込み
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

/**
 * Neon serverless の scale-to-zero cold start 由来の一時的 5xx を吸収するリトライ。
 *
 * 2026-05-28 隊長報告：「503 エラー（ページが一時的に開けない）が複数画面でランダム発生」
 * （バグリスト 4-② / 14-③）。Neon の compute がアイドルでサスペンドした後、最初の
 * リクエストが compute 起動待ちで 502/503/504 を返すのが主因。neon-http は各クエリが
 * 独立 HTTP のためリトライが無く、ユーザーに 503 がそのまま見えていた。
 *
 * 502/503/504（サーバー未処理＝リクエスト副作用なし）と、ネットワーク例外を
 * 最大 3 回・指数バックオフ（150/300ms）でリトライする。cold start は通常数百 ms で
 * 起動するため、これで体感のランダム 503 はほぼ吸収できる。
 * fetchFunction は NeonConfig グローバル設定（型は any）。
 */
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRIES = 3;

neonConfig.fetchFunction = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(input, init);
      if (RETRYABLE_STATUS.has(res.status) && attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err) {
      // ネットワーク例外（cold start 中の接続失敗等）。最終試行なら投げる
      lastError = err;
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastError ?? new Error('Neon fetch failed after retries');
};

const client = neon(databaseUrl);

export const db = drizzle({ client, schema, casing: 'snake_case' });

/**
 * 行レベルセキュリティ（RLS）用に session.user.company_id を SET LOCAL する
 * API ルートの先頭で必ず呼ぶ。これにより以降のクエリに company_id フィルタが自動適用される
 *
 * Neon serverless HTTP は auto-commit でトランザクション外、SET LOCAL は WARNING/ERROR になる。
 * RLS migration apply 前は GUC 未登録で失敗する。どちらの段階でも swallow してアプリを止めない。
 * Apply 後はトランザクション wrap される Server Action 内で正しく機能する想定。
 */
export async function setTenantContext(companyId: string): Promise<void> {
  try {
    await db.execute(sql`SET LOCAL app.current_company_id = ${companyId}`);
  } catch {
    // RLS pre-apply or auto-commit context — skip silently
  }
}

/**
 * 監査ログ書き込みヘルパー
 */
export async function logAudit(params: {
  member_id?: string;
  company_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(schema.audit_logs).values({
    member_id: params.member_id,
    company_id: params.company_id,
    action: params.action,
    resource_type: params.resource_type,
    resource_id: params.resource_id,
    ip: params.ip,
    user_agent: params.user_agent,
    metadata: params.metadata,
  });
}
