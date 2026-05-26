/**
 * 案件 × 週マトリクス（G2 月別週グリッド view、ADR-0014 起案前提、2026-05-26）
 *
 * 現行スプレッドシート（4 タブ、案件 90 件）で営業が毎日触る「5/11, 5/18, 5/25...」
 * 月別週グリッドを tripot v2 で再現する。柏樹（ノリスケ反証ペルソナ）「3 大シート恋しい
 * 理由の 1 つ」指摘を受けて実装。
 *
 * 12 週固定（過去 4 週 + 今週 + 未来 7 週）。月曜始まり。
 */

import type { SubjectiveConfidence } from './confidence';

export const WEEKS_PAST = 4;
export const WEEKS_FUTURE = 7;
export const WEEKS_TOTAL = WEEKS_PAST + 1 + WEEKS_FUTURE; // 過去 + 今週 + 未来

export interface WeekInfo {
  /** ISO 8601 YYYY-MM-DD（その週の月曜日）*/
  startDate: string;
  /** 表示用「5/26」形式 */
  label: string;
  /** 月の頭の週（label の頭に月を出す）*/
  isMonthStart: boolean;
  /** 今週 */
  isCurrent: boolean;
}

/**
 * 指定日付の所属する週の月曜日（00:00:00 UTC）を返す。
 * ISO 8601 準拠（月曜始まり）。
 */
export function getWeekMonday(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay(); // 0=日, 1=月, ..., 6=土
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Date → ISO 8601 YYYY-MM-DD */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * 12 週分の WeekInfo を生成（過去 4 週 + 今週 + 未来 7 週）
 */
export function generateWeeks(now: Date = new Date()): WeekInfo[] {
  const currentMonday = getWeekMonday(now);
  const currentIso = toIsoDate(currentMonday);

  const weeks: WeekInfo[] = [];
  let prevMonth = -1;

  for (let offset = -WEEKS_PAST; offset <= WEEKS_FUTURE; offset++) {
    const d = new Date(currentMonday);
    d.setUTCDate(d.getUTCDate() + offset * 7);
    const iso = toIsoDate(d);
    const month = d.getUTCMonth();
    const day = d.getUTCDate();
    const isMonthStart = month !== prevMonth;
    const label = isMonthStart ? `${month + 1}/${day}` : `${day}`;
    weeks.push({
      startDate: iso,
      label,
      isMonthStart,
      isCurrent: iso === currentIso,
    });
    prevMonth = month;
  }

  return weeks;
}

/** 12 週の最古月曜日（SQL の下限）*/
export function getWeeksRangeStart(now: Date = new Date()): Date {
  const currentMonday = getWeekMonday(now);
  const start = new Date(currentMonday);
  start.setUTCDate(start.getUTCDate() - WEEKS_PAST * 7);
  return start;
}

/** 12 週の最新月曜日 + 6 日 = 期間末日（SQL の上限）*/
export function getWeeksRangeEnd(now: Date = new Date()): Date {
  const currentMonday = getWeekMonday(now);
  const end = new Date(currentMonday);
  end.setUTCDate(end.getUTCDate() + (WEEKS_FUTURE + 1) * 7 - 1);
  end.setUTCHours(23, 59, 59, 999);
  return end;
}

export type ActionType = 'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other';

export interface WeekCell {
  /** その週のアクション数（電話・商談・提案・メール・訪問・その他、合計）*/
  actionCount: number;
  /** その週のアクション内訳（複数 type の発生回数）*/
  actionsByType: Partial<Record<ActionType, number>>;
  /** その週に occurred_at がある議事録の数 */
  meetingCount: number;
  /** その週に due_date があるタスクの (done, total) */
  tasksDone: number;
  tasksTotal: number;
}

export interface WeekGridDeal {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  customer_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  subjective_confidence: SubjectiveConfidence | null;
  /** 隊長明示 2026-05-27 01:39：次やること（期日が該当週セルに pin 表示）*/
  next_action_text: string | null;
  next_action_due_week: string | null; // ISO 週月曜 yyyy-mm-dd（該当週セルに pin）
  next_action_assignee_id: string | null;
  /** key = WeekInfo.startDate (ISO yyyy-mm-dd) */
  weeks: Record<string, WeekCell>;
}

/**
 * 空の WeekCell（イベントなしの週用）
 */
export function emptyWeekCell(): WeekCell {
  return {
    actionCount: 0,
    actionsByType: {},
    meetingCount: 0,
    tasksDone: 0,
    tasksTotal: 0,
  };
}

/**
 * Date 値（or string）を月曜日 ISO に正規化する helper（集計用）
 */
export function normalizeToWeekIso(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return toIsoDate(getWeekMonday(d));
}
