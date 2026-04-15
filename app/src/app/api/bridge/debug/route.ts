import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeAssignee(s: unknown): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[\s\u3000]+/g, ' ').trim();
}

function matchesAssignee(a: unknown, b: string): boolean {
  const na = normalizeAssignee(a);
  const nb = normalizeAssignee(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(' ')[0];
  const lb = nb.split(' ')[0];
  return Boolean(la && lb && la === lb);
}

const ORDERED_STAGES = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const expected = process.env.BRIDGE_API_KEY;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const sql = getDb();
  const members = await sql`SELECT id, name, role, status FROM members ORDER BY created_at` as Array<{ id: string; name: string; role: string; status: string }>;
  const deals = await sql`SELECT id, assignee, stage, amount, monthly_amount, revenue_type FROM deals` as Array<{ id: string; assignee: string; stage: string; amount: number; monthly_amount: number; revenue_type: string }>;

  const allAssignees = [...new Set(deals.map((d) => normalizeAssignee(d.assignee)).filter(Boolean))];

  const perMember = members.map((m) => {
    const mine = deals.filter((d) => matchesAssignee(d.assignee, m.name));
    const myOrdered = mine.filter((d) => ORDERED_STAGES.includes(d.stage));
    const revenue = myOrdered.reduce((s, d) => {
      const running = (d.revenue_type === 'running' || d.revenue_type === 'both') ? num(d.monthly_amount) : 0;
      return s + num(d.amount) + running;
    }, 0);
    return {
      id: m.id,
      name: m.name,
      role: m.role,
      status: m.status,
      totalDeals: mine.length,
      orderedDeals: myOrdered.length,
      revenue,
      sampleAssignees: [...new Set(mine.map((d) => d.assignee))].slice(0, 3),
    };
  });

  const unassigned = deals.filter((d) => !normalizeAssignee(d.assignee));
  const unmatched = allAssignees.filter((a) => !members.some((m) => matchesAssignee(a, m.name)));

  return NextResponse.json({
    members: perMember,
    dealsTotal: deals.length,
    unassignedDeals: unassigned.length,
    unmatchedAssignees: unmatched,
    allAssigneesInDeals: allAssignees,
  });
}
