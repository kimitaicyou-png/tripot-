'use server';

import { eq, and, isNull, sql, or } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals, customers, tasks, meetings, members } from '@/db/schema';

export type SearchHit = {
  kind: 'deal' | 'customer' | 'task' | 'meeting' | 'member';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

const LIMIT_PER_KIND = 5;

function ilikeWrap(q: string): string {
  return `%${q.replace(/[\\%_]/g, '\\$&')}%`;
}

export async function globalSearch(query: string): Promise<SearchHit[]> {
  const session = await auth();
  if (!session?.user?.member_id) return [];

  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const pattern = ilikeWrap(trimmed);
  const companyId = session.user.company_id;

  const [dealRows, customerRows, taskRows, meetingRows, memberRows] = await Promise.all([
    db
      .select({
        id: deals.id,
        title: deals.title,
        stage: deals.stage,
        customer_name: customers.name,
      })
      .from(deals)
      .leftJoin(customers, eq(deals.customer_id, customers.id))
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          sql`${deals.title} ILIKE ${pattern}`
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: customers.id,
        name: customers.name,
        contact_email: customers.contact_email,
      })
      .from(customers)
      .where(
        and(
          eq(customers.company_id, companyId),
          isNull(customers.deleted_at),
          or(
            sql`${customers.name} ILIKE ${pattern}`,
            sql`${customers.contact_email} ILIKE ${pattern}`
          )
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        deal_id: tasks.deal_id,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          isNull(tasks.deleted_at),
          sql`${tasks.title} ILIKE ${pattern}`
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        summary: meetings.summary,
        deal_id: meetings.deal_id,
        type: meetings.type,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.company_id, companyId),
          isNull(meetings.deleted_at),
          or(
            sql`${meetings.title} ILIKE ${pattern}`,
            sql`${meetings.summary} ILIKE ${pattern}`,
            sql`${meetings.raw_text} ILIKE ${pattern}`
          )
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: members.id,
        name: members.name,
        email: members.email,
      })
      .from(members)
      .where(
        and(
          eq(members.company_id, companyId),
          isNull(members.deleted_at),
          or(
            sql`${members.name} ILIKE ${pattern}`,
            sql`${members.email} ILIKE ${pattern}`
          )
        )
      )
      .limit(LIMIT_PER_KIND),
  ]);

  const hits: SearchHit[] = [
    ...dealRows.map<SearchHit>((d) => ({
      kind: 'deal',
      id: d.id,
      title: d.title,
      subtitle: `${d.customer_name ?? '—'} / ${d.stage}`,
      href: `/deals/${d.id}`,
    })),
    ...customerRows.map<SearchHit>((c) => ({
      kind: 'customer',
      id: c.id,
      title: c.name,
      subtitle: c.contact_email ?? undefined,
      href: `/customers/${c.id}`,
    })),
    ...taskRows.map<SearchHit>((t) => ({
      kind: 'task',
      id: t.id,
      title: t.title,
      subtitle: `タスク (${t.status})${t.deal_id ? '・案件あり' : ''}`,
      href: t.deal_id ? `/deals/${t.deal_id}` : `/tasks/${t.id}`,
    })),
    ...meetingRows.map<SearchHit>((m) => ({
      kind: 'meeting',
      id: m.id,
      title: m.title ?? `${m.type}（無題）`,
      subtitle: m.summary?.slice(0, 60) ?? undefined,
      href: m.deal_id ? `/deals/${m.deal_id}` : '/deals',
    })),
    ...memberRows.map<SearchHit>((m) => ({
      kind: 'member',
      id: m.id,
      title: m.name,
      subtitle: m.email,
      href: `/team/${m.id}`,
    })),
  ];

  return hits;
}
