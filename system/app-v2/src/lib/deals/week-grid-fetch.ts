/**
 * 案件 × 週マトリクス用データ集計（G2、ADR-0014、2026-05-26）
 *
 * 12 週分の actions / meetings / tasks を 1 回ずつ集計クエリで取得、
 * dealId × weekIso のマップに組み立てる。
 *
 * Server Component から呼ぶ前提（Drizzle + マルチテナント遵守）。
 */

import { and, eq, gte, lte, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { actions, meetings, tasks } from '@/db/schema';
import {
  emptyWeekCell,
  getWeeksRangeEnd,
  getWeeksRangeStart,
  normalizeToWeekIso,
  toIsoDate,
  type ActionType,
  type WeekCell,
} from './week-grid';

export type WeekCellMap = Record<string, Record<string, WeekCell>>;

/**
 * 案件 ID 配列に対する 12 週分の集計を取得。
 *
 * 戻り値：weekCellMap[dealId][weekIso] = WeekCell
 * 案件が無い / 該当 dealId が空配列の場合は {} を返す。
 */
export async function fetchWeekGridCells({
  companyId,
  dealIds,
  now = new Date(),
}: {
  companyId: string;
  dealIds: string[];
  now?: Date;
}): Promise<WeekCellMap> {
  if (dealIds.length === 0) return {};

  const rangeStart = getWeeksRangeStart(now);
  const rangeEnd = getWeeksRangeEnd(now);
  const rangeStartIso = toIsoDate(rangeStart);
  const rangeEndIso = toIsoDate(rangeEnd);

  // 3 ソース並列取得
  const [actionRows, meetingRows, taskRows] = await Promise.all([
    // actions: occurred_at が範囲内
    db
      .select({
        deal_id: actions.deal_id,
        occurred_at: actions.occurred_at,
        type: actions.type,
      })
      .from(actions)
      .where(
        and(
          eq(actions.company_id, companyId),
          inArray(actions.deal_id, dealIds),
          gte(actions.occurred_at, rangeStart),
          lte(actions.occurred_at, rangeEnd),
        ),
      ),
    // meetings: occurred_at が範囲内 + 削除されてない
    db
      .select({
        deal_id: meetings.deal_id,
        occurred_at: meetings.occurred_at,
      })
      .from(meetings)
      .where(
        and(
          eq(meetings.company_id, companyId),
          inArray(meetings.deal_id, dealIds),
          gte(meetings.occurred_at, rangeStart),
          lte(meetings.occurred_at, rangeEnd),
          isNull(meetings.deleted_at),
        ),
      ),
    // tasks: due_date が範囲内（DATE 型なので文字列比較）+ 削除されてない
    db
      .select({
        deal_id: tasks.deal_id,
        due_date: tasks.due_date,
        status: tasks.status,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.company_id, companyId),
          inArray(tasks.deal_id, dealIds),
          gte(tasks.due_date, rangeStartIso),
          lte(tasks.due_date, rangeEndIso),
          isNull(tasks.deleted_at),
        ),
      ),
  ]);

  const map: WeekCellMap = {};

  function getCell(dealId: string, weekIso: string): WeekCell {
    if (!map[dealId]) map[dealId] = {};
    if (!map[dealId]![weekIso]) map[dealId]![weekIso] = emptyWeekCell();
    return map[dealId]![weekIso]!;
  }

  // actions 集計
  for (const row of actionRows) {
    if (!row.deal_id) continue;
    const weekIso = normalizeToWeekIso(row.occurred_at);
    const cell = getCell(row.deal_id, weekIso);
    cell.actionCount += 1;
    const t = row.type as ActionType;
    cell.actionsByType[t] = (cell.actionsByType[t] ?? 0) + 1;
  }

  // meetings 集計
  for (const row of meetingRows) {
    if (!row.deal_id) continue;
    const weekIso = normalizeToWeekIso(row.occurred_at);
    const cell = getCell(row.deal_id, weekIso);
    cell.meetingCount += 1;
  }

  // tasks 集計
  for (const row of taskRows) {
    if (!row.deal_id || !row.due_date) continue;
    const weekIso = normalizeToWeekIso(row.due_date);
    const cell = getCell(row.deal_id, weekIso);
    cell.tasksTotal += 1;
    if (row.status === 'done') {
      cell.tasksDone += 1;
    }
  }

  return map;
}

// 未使用 import を抑止（sql は将来の集計 SQL 拡張用に予約）
void sql;
