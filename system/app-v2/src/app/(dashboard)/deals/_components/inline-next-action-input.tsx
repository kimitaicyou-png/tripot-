'use client';

/**
 * 「次やること」のインライン編集（G7 拡張 + 構造化、2026-05-26 03:14 隊長明示）
 *
 * 「いつまでに誰が何を」3 要素：text + due_date + assignee_id
 * 表示：[期日 担当] テキスト  を 1 行 compact
 * 編集：popover 形式で 3 入力（テキスト / 日付 / 担当）
 */

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Calendar, User, X, Check } from 'lucide-react';
import { updateDealNextAction } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';

const MAX_LEN = 200;

export type NextActionData = {
  text: string;
  due_date: string | null;
  assignee_id: string | null;
};

export type MemberOption = { id: string; name: string };

export function InlineNextActionInput({
  dealId,
  initial,
  members,
  fallbackAssigneeId,
}: {
  dealId: string;
  initial: NextActionData;
  members: MemberOption[];
  /** 担当者未指定の場合の fallback（通常は案件 assignee_id）*/
  fallbackAssigneeId: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(initial.text);
  const [dueDate, setDueDate] = useState(initial.due_date ?? '');
  const [assigneeId, setAssigneeId] = useState(initial.assignee_id ?? '');
  const [saved, setSaved] = useState<NextActionData>(initial);
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // popover の外クリックで commit
  useEffect(() => {
    if (!editing) return;
    function onDocClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        commit();
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, text, dueDate, assigneeId]);

  function enterEdit() {
    setText(saved.text);
    setDueDate(saved.due_date ?? '');
    setAssigneeId(saved.assignee_id ?? '');
    setEditing(true);
    setTimeout(() => textInputRef.current?.select(), 0);
  }

  function commit() {
    const next: NextActionData = {
      text,
      due_date: dueDate === '' ? null : dueDate,
      assignee_id: assigneeId === '' ? null : assigneeId,
    };
    setEditing(false);
    if (
      next.text === saved.text &&
      next.due_date === saved.due_date &&
      next.assignee_id === saved.assignee_id
    ) {
      return;
    }
    const prev = saved;
    setSaved(next);
    startTransition(async () => {
      const result = await updateDealNextAction(dealId, next);
      if (!result.ok) {
        setSaved(prev);
        setText(prev.text);
        setDueDate(prev.due_date ?? '');
        setAssigneeId(prev.assignee_id ?? '');
        toast.error(`次やることの更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(
        next.text.trim() === '' && !next.due_date ? '次やることをクリア' : '次やることを更新',
      );
      router.refresh();
    });
  }

  function cancel() {
    setEditing(false);
    setText(saved.text);
    setDueDate(saved.due_date ?? '');
    setAssigneeId(saved.assignee_id ?? '');
  }

  const hasValue = saved.text.trim() !== '' || !!saved.due_date;
  const displayAssignee =
    saved.assignee_id ?? fallbackAssigneeId;
  const displayAssigneeName =
    members.find((m) => m.id === displayAssignee)?.name ?? null;
  const isOverdue =
    saved.due_date != null && saved.due_date < new Date().toISOString().slice(0, 10);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={enterEdit}
        title={
          hasValue
            ? `次やること：${saved.text}${saved.due_date ? `（期日 ${saved.due_date}）` : ''}${displayAssigneeName ? `／${displayAssigneeName}` : ''}（クリックで編集）`
            : 'クリックで「次やること」を追加（いつ／誰が／何を）'
        }
        className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-xs hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 active:scale-[0.98] max-w-[18rem] ${
          hasValue ? 'text-gray-900' : 'text-gray-500'
        }`}
      >
        {hasValue ? (
          <>
            {saved.due_date && (
              <span
                className={`font-mono tabular-nums text-[10px] px-1 rounded shrink-0 ${
                  isOverdue
                    ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200'
                    : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                }`}
              >
                {saved.due_date.slice(5)}
              </span>
            )}
            {displayAssigneeName && (
              <span className="text-[10px] text-gray-600 shrink-0">{displayAssigneeName}</span>
            )}
            <span className="truncate">{saved.text || '（テキストなし）'}</span>
          </>
        ) : (
          <>
            <Pencil className="w-3 h-3 shrink-0 opacity-60" />
            <span>次やること…</span>
          </>
        )}
      </button>

      {editing && (
        <div
          ref={popoverRef}
          className="absolute left-0 top-full mt-1 z-30 w-80 bg-white border border-gray-200 rounded-lg shadow-sm p-3 space-y-2"
        >
          <div className="flex items-center gap-1.5">
            <Pencil className="w-3 h-3 text-gray-500 shrink-0" />
            <input
              ref={textInputRef}
              type="text"
              maxLength={MAX_LEN}
              value={text}
              disabled={isPending}
              placeholder="何を（200 字まで）"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
              aria-label="次やること（何を）"
              className="flex-1 min-w-0 px-2 py-1 text-xs text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
            <input
              type="date"
              value={dueDate}
              disabled={isPending}
              onChange={(e) => setDueDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') cancel();
              }}
              aria-label="次やること（いつまでに）"
              className="px-2 py-1 text-xs font-mono tabular-nums border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="text-[10px] text-gray-500 hover:text-gray-900 underline"
              >
                クリア
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-gray-500 shrink-0" />
            <select
              value={assigneeId}
              disabled={isPending}
              onChange={(e) => setAssigneeId(e.target.value)}
              aria-label="次やること（誰が）"
              className="flex-1 min-w-0 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
            >
              <option value="">案件担当者（既定）</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={cancel}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-gray-700 hover:text-gray-900 active:scale-[0.98]"
            >
              <X className="w-3 h-3" />
              キャンセル
            </button>
            <button
              type="button"
              onClick={commit}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] bg-gray-900 text-white rounded hover:bg-gray-800 active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              保存
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
