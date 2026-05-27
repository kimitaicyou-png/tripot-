/**
 * 案件グリッド view 用の型定義（旧「月別週グリッド」、隊長明示 2026-05-27 02:02 で週列廃止）
 *
 * 元々は 12 週マトリクス用 helper（generateWeeks / fetchWeekGridCells 等）があったが、
 * 「グリッド自体はいい、日にちの部分はいらん」で週列廃止 → 案件 table 用の型だけ残置。
 *
 * 残置：WeekGridDeal（page.tsx と deals-week-grid.tsx で参照）、ActionType（既存型互換用）。
 * 削除：WeekInfo / WeekCell / generateWeeks / fetchWeekGridCells / 週計算 helper 群。
 */

import type { SubjectiveConfidence } from './confidence';

export type ActionType = 'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other';

export interface WeekGridDeal {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  customer_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  subjective_confidence: SubjectiveConfidence | null;
  /** 隊長明示 2026-05-27 02:10：次やること 3 要素（text / due_date / assignee_id）*/
  next_action_text: string | null;
  next_action_due_date: string | null; // YYYY-MM-DD（編集用）
  next_action_assignee_id: string | null;
}
