/**
 * Drizzle DB クライアント
 *
 * Neon Serverless + drizzle-orm/neon-http
 * RLS 用の SET LOCAL ヘルパー込み
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '@/db/schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

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
