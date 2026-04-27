'use server';

import { revalidatePath } from 'next/cache';
import { eq, and, sql, isNull, gte } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { budgets, budget_actuals, deals, notifications } from '@/db/schema';

export type BudgetAlertResult = {
  generated: number;
  skipped: number;
  errors?: string[];
};

const RULE_KEY_PREFIX = 'budget.';
const THRESHOLD_LOW = 0.8;
const THRESHOLD_MID = 0.95;

export async function evaluateBudgetAlerts(): Promise<BudgetAlertResult> {
  const session = await auth();
  if (!session?.user?.member_id) return { generated: 0, skipped: 0, errors: ['認証が必要です'] };
  await setTenantContext(session.user.company_id);

  const companyId = session.user.company_id;
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const ruleKey = `${RULE_KEY_PREFIX}m${year}-${String(month).padStart(2, '0')}`;

  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);

  const [budgetRow, actualRow, paidRow, existingAlert] = await Promise.all([
    db
      .select({
        revenue: budgets.target_revenue,
        gp: budgets.target_gross_profit,
        op: budgets.target_operating_profit,
      })
      .from(budgets)
      .where(
        and(
          eq(budgets.company_id, companyId),
          eq(budgets.year, year),
          eq(budgets.month, month)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        revenue: budget_actuals.revenue,
        cogs: budget_actuals.cogs,
        sga: budget_actuals.sga,
        op: budget_actuals.operating_profit,
      })
      .from(budget_actuals)
      .where(
        and(
          eq(budget_actuals.company_id, companyId),
          eq(budget_actuals.year, year),
          eq(budget_actuals.month, month)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
    db
      .select({
        revenue: sql<number>`COALESCE(SUM(${deals.amount}) FILTER (WHERE ${deals.stage} IN ('paid','invoiced')), 0)::int`,
      })
      .from(deals)
      .where(
        and(
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          gte(deals.paid_at, monthStart),
          sql`${deals.paid_at} <= ${monthEnd}`
        )
      )
      .then((rows) => rows[0]),
    db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.company_id, companyId),
          eq(notifications.rule_key, ruleKey)
        )
      )
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!budgetRow) {
    return { generated: 0, skipped: 0, errors: ['当月の予算が未設定です'] };
  }

  if (existingAlert) {
    return { generated: 0, skipped: 1 };
  }

  const targetRevenue = budgetRow.revenue ?? 0;
  const actualRevenue = (actualRow?.revenue ?? 0) || (paidRow?.revenue ?? 0);
  if (targetRevenue === 0) {
    return { generated: 0, skipped: 0, errors: ['予算 0 のため評価不可'] };
  }

  const dayOfMonth = today.getDate();
  const lastDay = new Date(year, month, 0).getDate();
  const expectedRatio = dayOfMonth / lastDay;
  const actualRatio = actualRevenue / targetRevenue;

  let title = '';
  let body = '';
  let severity: 'info' | 'warning' | 'critical' = 'info';

  if (actualRatio < expectedRatio * THRESHOLD_LOW) {
    severity = 'critical';
    title = `🚨 予算未達リスク（${month}月）`;
    body = `経過 ${Math.round(expectedRatio * 100)}% に対し、売上達成率は ${Math.round(actualRatio * 100)}%（¥${actualRevenue.toLocaleString('ja-JP')} / ¥${targetRevenue.toLocaleString('ja-JP')}）。早急にアクションを`;
  } else if (actualRatio < expectedRatio * THRESHOLD_MID) {
    severity = 'warning';
    title = `⚠️ 予算ペース遅れ（${month}月）`;
    body = `経過 ${Math.round(expectedRatio * 100)}% に対し、売上達成率は ${Math.round(actualRatio * 100)}%。ペースアップが必要`;
  } else if (actualRatio >= 1.0) {
    severity = 'info';
    title = `🎉 予算達成（${month}月）`;
    body = `売上達成率 ${Math.round(actualRatio * 100)}%（¥${actualRevenue.toLocaleString('ja-JP')} / ¥${targetRevenue.toLocaleString('ja-JP')}）`;
  } else {
    return { generated: 0, skipped: 1 };
  }

  await db.insert(notifications).values({
    company_id: companyId,
    member_id: null,
    rule_key: ruleKey,
    channel: 'app',
    title,
    body,
    status: 'queued',
    payload: { severity, year, month, expectedRatio, actualRatio, actualRevenue, targetRevenue },
  });

  await logAudit({
    member_id: session.user.member_id,
    company_id: companyId,
    action: 'budget.alert_generated',
    resource_type: 'notification',
    metadata: { rule_key: ruleKey, severity, actualRatio: Math.round(actualRatio * 100) / 100 },
  });

  revalidatePath('/notifications');
  revalidatePath('/budget');
  return { generated: 1, skipped: 0 };
}
