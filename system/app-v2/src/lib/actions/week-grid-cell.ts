'use server';

/**
 * 週グリッドセル click popover 用の詳細取得（Phase 3、隊長明示 2026-05-27 01:39）
 *
 * その週（月曜 0:00 → 日曜 23:59:59）の actions / meetings / tasks を案件単位で返す。
 * popover で表示、各 item は案件詳細ページの該当タブへリンク。
 */

import { and, eq, gte, lte, isNull, desc } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { actions, meetings, tasks } from '@/db/schema';

export interface WeekCellDetail {
  actions: Array<{
    id: string;
    type: string;
    occurred_at: string; // ISO
    note: string | null;
  }>;
  meetings: Array<{
    id: string;
    type: string;
    title: string | null;
    occurred_at: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    due_date: string | null;
  }>;
}

/**
 * 週セル詳細取得
 * @param dealId - 案件 ID
 * @param weekStartIso - 週月曜 ISO 'YYYY-MM-DD'
 */
export async function getWeekCellDetail(
  dealId: string,
  weekStartIso: string,
): Promise<{ ok: true; data: WeekCellDetail } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.company_id) {
    return { ok: false, error: 'unauthorized' };
  }
  const companyId = session.user.company_id;

  // 週月曜 00:00 UTC ~ 日曜 23:59:59.999 UTC
  const weekStart = new Date(`${weekStartIso}T00:00:00Z`);
  if (Number.isNaN(weekStart.getTime())) {
    return { ok: false, error: 'invalid_week' };
  }
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  weekEnd.setUTCMilliseconds(-1);

  const weekStartDate = weekStartIso;
  const weekEndDate = weekEnd.toISOString().slice(0, 10);

  const [actionRows, meetingRows, taskRows] = await Promise.all([
    db
      .select({
        id: actions.id,
        type: actions.type,
        occurred_at: actions.occurred_at,
        note: actions.note,
      })
      .from(actions)
      .where(
        and(
          eq(actions.company_id, companyId),
          eq(actions.deal_id, dealId),
          gte(actions.occurred_at, weekStart),
          lte(actions.occurred_at, weekEnd),
        ),
      )
      .orderBy(desc(actions.occurred_at))
      .limit(20),
    db
      .select({
        id: meetings.id,
        type: meetings.type,
        title: meetings.title,
        occurred_at: meetings.occurred_at,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.company_id, companyId),
          eq(meetings.deal_id, dealId),
          gte(meetings.occurred_at, weekStart),
          lte(meetings.occurred_at, weekEnd),
          isNull(meetings.deleted_at),
        ),
      )
      .orderBy(desc(meetings.occurred_at))
      .limit(20),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        due_date: tasks.due_date,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          eq(tasks.deal_id, dealId),
          gte(tasks.due_date, weekStartDate),
          lte(tasks.due_date, weekEndDate),
          isNull(tasks.deleted_at),
        ),
      )
      .orderBy(tasks.due_date)
      .limit(20),
  ]);

  return {
    ok: true,
    data: {
      actions: actionRows.map((r) => ({
        id: r.id,
        type: r.type,
        occurred_at: r.occurred_at.toISOString(),
        note: r.note,
      })),
      meetings: meetingRows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        occurred_at: r.occurred_at.toISOString(),
      })),
      tasks: taskRows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        due_date: r.due_date,
      })),
    },
  };
}
