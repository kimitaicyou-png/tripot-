'use server';

import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, setTenantContext } from '@/lib/db';
import { audit_logs, members } from '@/db/schema';

export type AuditFilter = {
  member_id?: string;
  action_prefix?: string;
  resource_type?: string;
  from?: string;
  to?: string;
  limit?: number;
};

export async function listAuditLogs(filter: AuditFilter = {}) {
  const session = await auth();
  if (!session?.user?.member_id) return { rows: [], total: 0 };
  await setTenantContext(session.user.company_id);

  const conditions = [eq(audit_logs.company_id, session.user.company_id)];

  if (filter.member_id) {
    conditions.push(eq(audit_logs.member_id, filter.member_id));
  }
  if (filter.action_prefix) {
    conditions.push(sql`${audit_logs.action} LIKE ${filter.action_prefix + '%'}`);
  }
  if (filter.resource_type) {
    conditions.push(eq(audit_logs.resource_type, filter.resource_type));
  }
  if (filter.from) {
    conditions.push(gte(audit_logs.occurred_at, new Date(filter.from)));
  }
  if (filter.to) {
    conditions.push(lte(audit_logs.occurred_at, new Date(filter.to)));
  }

  const whereClause = and(...conditions);
  const limit = Math.min(filter.limit ?? 200, 500);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: audit_logs.id,
        occurred_at: audit_logs.occurred_at,
        action: audit_logs.action,
        resource_type: audit_logs.resource_type,
        resource_id: audit_logs.resource_id,
        member_name: members.name,
        member_id: audit_logs.member_id,
        ip: audit_logs.ip,
        metadata: audit_logs.metadata,
      })
      .from(audit_logs)
      .leftJoin(members, eq(audit_logs.member_id, members.id))
      .where(whereClause)
      .orderBy(desc(audit_logs.occurred_at))
      .limit(limit),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(audit_logs)
      .where(whereClause),
  ]);

  return { rows, total: totalRow[0]?.n ?? 0 };
}

export async function listAuditableMembers() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(eq(members.company_id, session.user.company_id))
    .orderBy(members.name);
}
