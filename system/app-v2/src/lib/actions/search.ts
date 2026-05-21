'use server';

import { eq, and, isNull, sql, or, desc } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  deals,
  customers,
  tasks,
  meetings,
  members,
  actions,
  proposals,
  estimates,
  invoices,
} from '@/db/schema';
import { requirePermission } from '@/lib/rbac';

export type SearchHit = {
  kind:
    | 'deal'
    | 'customer'
    | 'task'
    | 'meeting'
    | 'member'
    | 'action'
    | 'proposal'
    | 'estimate'
    | 'invoice';
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
  const guard = await requirePermission({ resource: 'deal', action: 'read_self' });
  if (!guard.ok) return [];
  const { session } = guard;

  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const pattern = ilikeWrap(trimmed);
  const companyId = session.user.company_id;

  const [
    dealRows,
    customerRows,
    taskRows,
    meetingRows,
    memberRows,
    actionRows,
    proposalRows,
    estimateRows,
    invoiceRows,
  ] = await Promise.all([
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
    db
      .select({
        id: actions.id,
        type: actions.type,
        note: actions.note,
        deal_id: actions.deal_id,
        occurred_at: actions.occurred_at,
      })
      .from(actions)
      .where(
        and(
          eq(actions.company_id, companyId),
          sql`${actions.note} ILIKE ${pattern}`
        )
      )
      .orderBy(desc(actions.occurred_at))
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: proposals.id,
        title: proposals.title,
        deal_id: proposals.deal_id,
      })
      .from(proposals)
      .where(
        and(
          eq(proposals.company_id, companyId),
          isNull(proposals.deleted_at),
          sql`${proposals.title} ILIKE ${pattern}`
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: estimates.id,
        title: estimates.title,
        deal_id: estimates.deal_id,
        total: estimates.total,
      })
      .from(estimates)
      .where(
        and(
          eq(estimates.company_id, companyId),
          isNull(estimates.deleted_at),
          sql`${estimates.title} ILIKE ${pattern}`
        )
      )
      .limit(LIMIT_PER_KIND),
    db
      .select({
        id: invoices.id,
        invoice_number: invoices.invoice_number,
        deal_id: invoices.deal_id,
        status: invoices.status,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.company_id, companyId),
          isNull(invoices.deleted_at),
          or(
            sql`${invoices.invoice_number} ILIKE ${pattern}`,
            sql`CAST(${invoices.id} AS TEXT) ILIKE ${pattern}`
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
    ...actionRows.map<SearchHit>((a) => ({
      kind: 'action',
      id: a.id,
      title: a.note?.slice(0, 60) ?? `(${a.type})`,
      subtitle: `${a.type} / ${new Date(a.occurred_at).toLocaleDateString('ja-JP')}`,
      href: a.deal_id ? `/deals/${a.deal_id}` : '/home',
    })),
    ...proposalRows.map<SearchHit>((p) => ({
      kind: 'proposal',
      id: p.id,
      title: p.title,
      subtitle: p.deal_id ? '案件に紐付き' : '案件未紐付',
      href: p.deal_id ? `/deals/${p.deal_id}?tab=proposals` : '/deals',
    })),
    ...estimateRows.map<SearchHit>((e) => ({
      kind: 'estimate',
      id: e.id,
      title: e.title,
      subtitle: `¥${(e.total ?? 0).toLocaleString('ja-JP')}`,
      href: e.deal_id ? `/deals/${e.deal_id}?tab=estimates` : '/deals',
    })),
    ...invoiceRows.map<SearchHit>((i) => ({
      kind: 'invoice',
      id: i.id,
      title: i.invoice_number ?? i.id.slice(0, 8),
      subtitle: `請求書 (${i.status})`,
      href: i.deal_id ? `/deals/${i.deal_id}?tab=invoices` : '/deals',
    })),
  ];

  return hits;
}
