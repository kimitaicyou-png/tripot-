/**
 * 案件 × 週マトリクス view（G2、ADR-0014、2026-05-26）
 *
 * 現行スプレッドシートの月別週グリッドを tripot v2 で再現。
 * 12 週固定（過去 4 + 今週 + 未来 7）、左カラム sticky。
 *
 * 表示専用 Server Component。データ取得は親 page.tsx 側。
 */

import Link from 'next/link';
import { Phone, Handshake, FileText, Mail, Footprints, Pin } from 'lucide-react';
import { InlineStageChanger } from '../[dealId]/_components/inline-stage-changer';
import { InlineConfidenceSelect } from './inline-confidence-select';
import { InlineAmountInput } from './inline-amount-input';
import { InlineAssigneeSelect, type MemberOption } from './inline-assignee-select';
import type { WeekInfo, WeekGridDeal, WeekCell, ActionType } from '@/lib/deals/week-grid';

const STAGE_LABEL: Record<string, string> = {
  prospect: '見込み',
  proposing: '提案',
  ordered: '受注',
  in_production: '制作',
  delivered: '納品',
  acceptance: '検収',
  invoiced: '請求',
  paid: '入金',
  lost: '失注',
};

const STAGE_COLOR: Record<string, string> = {
  prospect: 'bg-slate-100 text-slate-700',
  proposing: 'bg-blue-50 text-blue-700',
  ordered: 'bg-amber-50 text-amber-700',
  in_production: 'bg-indigo-50 text-indigo-700',
  delivered: 'bg-purple-50 text-purple-700',
  acceptance: 'bg-pink-50 text-pink-700',
  invoiced: 'bg-rose-50 text-rose-700',
  paid: 'bg-emerald-50 text-emerald-700',
  lost: 'bg-red-50 text-red-700',
};

// アクション type → 1 文字 emoji 風（ただし lucide icon を使う、絵文字禁止）
const ACTION_ICON: Record<ActionType, typeof Phone> = {
  call: Phone,
  meeting: Handshake,
  proposal: FileText,
  email: Mail,
  visit: Footprints,
  other: FileText,
};

const ACTION_TYPE_LABEL_JA: Record<ActionType, string> = {
  call: '電話',
  meeting: '商談',
  proposal: '提案',
  email: 'メール',
  visit: '訪問',
  other: 'その他',
};

function buildWeekCellTooltip(cell: WeekCell, weekStart: string): string {
  const lines: string[] = [`週 ${weekStart} の活動`];
  if (cell.actionCount > 0) {
    const breakdown = Object.entries(cell.actionsByType)
      .filter(([, n]) => (n ?? 0) > 0)
      .map(([t, n]) => `${ACTION_TYPE_LABEL_JA[t as ActionType] ?? t} ${n}`)
      .join(' / ');
    lines.push(`行動 ${cell.actionCount} 件（${breakdown}）`);
  }
  if (cell.meetingCount > 0) {
    lines.push(`議事録 ${cell.meetingCount} 件`);
  }
  if (cell.tasksTotal > 0) {
    lines.push(`タスク ${cell.tasksDone}/${cell.tasksTotal}（完了/期限）`);
  }
  if (lines.length === 1) lines.push('（活動なし）');
  return lines.join('\n');
}

function WeekCellContent({
  cell,
  weekStart,
  nextActionPinText,
}: {
  cell: WeekCell | undefined;
  weekStart: string;
  /** その週に「次やること」の期日が落ちる場合のテキスト（pin 表示用）*/
  nextActionPinText: string | null;
}) {
  const hasPin = !!nextActionPinText;
  const cellEmpty =
    !cell || (cell.actionCount === 0 && cell.meetingCount === 0 && cell.tasksTotal === 0);

  if (cellEmpty && !hasPin) {
    return (
      <span className="text-gray-300 text-[10px]" title={`週 ${weekStart}（活動なし）`}>
        ・
      </span>
    );
  }

  const tooltipLines: string[] = [];
  if (hasPin) tooltipLines.push(`次やること（期日この週）：${nextActionPinText}`);
  if (cell && (cell.actionCount > 0 || cell.meetingCount > 0 || cell.tasksTotal > 0)) {
    tooltipLines.push(buildWeekCellTooltip(cell, weekStart));
  } else {
    tooltipLines.push(`週 ${weekStart}（活動はまだ）`);
  }
  const tooltip = tooltipLines.join('\n---\n');

  return (
    <div
      className="flex flex-col items-center gap-0.5 leading-tight cursor-help"
      title={tooltip}
    >
      {hasPin && (
        <span
          className="inline-flex items-center text-rose-700"
          aria-label="この週に「次やること」期日"
        >
          <Pin className="w-3 h-3" />
        </span>
      )}
      {cell && cell.actionCount > 0 && (
        <span className="font-mono tabular-nums text-[10px] text-gray-700">
          {cell.actionCount}
        </span>
      )}
      {cell && cell.meetingCount > 0 && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"
          aria-label={`議事録 ${cell.meetingCount} 件`}
        />
      )}
      {cell && cell.tasksTotal > 0 && (
        <span
          className={`font-mono tabular-nums text-[9px] ${
            cell.tasksDone === cell.tasksTotal ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {cell.tasksDone}/{cell.tasksTotal}
        </span>
      )}
    </div>
  );
}

export function DealsWeekGrid({
  deals,
  weeks,
  members,
}: {
  deals: WeekGridDeal[];
  weeks: WeekInfo[];
  members: MemberOption[];
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-sm text-gray-700">表示する案件がありません。</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 凡例 */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-600">
        <span>
          <span className="font-mono tabular-nums text-gray-900">数字</span>＝行動件数
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />議事録あり
        </span>
        <span>
          <span className="font-mono tabular-nums text-emerald-700">X/Y</span>＝完了/期限タスク
        </span>
        <span className="text-gray-500">／週は月曜始まり、横スクロール可</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-max border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-[11px] font-medium text-gray-700 border-r border-gray-200"
                style={{ minWidth: 220 }}
              >
                案件
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-700" style={{ minWidth: 80 }}>
                顧客
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-700" style={{ minWidth: 70 }}>
                担当
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-700" style={{ minWidth: 50 }}>
                確度
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-700" style={{ minWidth: 60 }}>
                段階
              </th>
              <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-700" style={{ minWidth: 80 }}>
                金額
              </th>
              {weeks.map((w) => (
                <th
                  key={w.startDate}
                  className={`px-1 py-2 text-center text-[10px] font-mono tabular-nums border-l border-gray-100 ${
                    w.isCurrent ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-gray-600'
                  }`}
                  style={{ minWidth: 44 }}
                  title={w.startDate}
                >
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <tr
                key={deal.id}
                className={`border-b border-gray-100 hover:bg-slate-50 ${
                  i % 2 === 1 ? 'bg-gray-50/30' : ''
                }`}
              >
                <td
                  className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-200"
                  style={{ minWidth: 220 }}
                >
                  <Link
                    href={`/deals/${deal.id}`}
                    className="text-xs text-gray-900 font-medium truncate block max-w-[200px] hover:underline decoration-gray-400"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-700 truncate" style={{ maxWidth: 100 }}>
                  {deal.customer_name ?? '—'}
                </td>
                <td className="px-2 py-2 text-[11px]" style={{ maxWidth: 110 }}>
                  <InlineAssigneeSelect dealId={deal.id} initial={deal.assignee_id} members={members} />
                </td>
                {/* 隊長明示 2026-05-27 01:39：「ここで触れなかったら意味ない」→ 確度・段階・金額 inline 編集 */}
                <td className="px-2 py-2 text-center">
                  <InlineConfidenceSelect dealId={deal.id} initial={deal.subjective_confidence} />
                </td>
                <td className="px-2 py-2 text-center">
                  <InlineStageChanger dealId={deal.id} currentStage={deal.stage} />
                </td>
                <td className="px-2 py-2 text-right">
                  <InlineAmountInput dealId={deal.id} initialAmount={deal.amount} />
                </td>
                {weeks.map((w) => {
                  const pinHere =
                    deal.next_action_due_week === w.startDate ? deal.next_action_text : null;
                  return (
                    <td
                      key={w.startDate}
                      className={`px-1 py-2 text-center border-l border-gray-100 ${
                        w.isCurrent ? 'bg-amber-50/40' : ''
                      } ${pinHere ? 'bg-rose-50/40' : ''}`}
                    >
                      <WeekCellContent
                        cell={deal.weeks[w.startDate]}
                        weekStart={w.startDate}
                        nextActionPinText={pinHere}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
