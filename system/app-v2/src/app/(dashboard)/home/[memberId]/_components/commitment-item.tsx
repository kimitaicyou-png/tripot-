'use client';

import { useTransition } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { completeCommitment, deleteCommitment } from '@/lib/actions/commitments';
import { toast } from '@/components/ui/toaster';

type Commitment = {
  id: string;
  text: string;
  due_date: string | null;
  deal_id: string | null;
  status: string;
  completed_at: Date | string | null;
  created_at: Date | string;
};

function formatDue(due: string | null, status: string): { label: string; tone: string } {
  if (status === 'done') return { label: '完了', tone: 'text-emerald-700' };
  if (!due) return { label: '期限なし', tone: 'text-gray-500' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due);
  const diffDays = Math.round((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return { label: `期限超過 ${Math.abs(diffDays)}日`, tone: 'text-red-700' };
  if (diffDays === 0) return { label: '今日まで', tone: 'text-amber-700' };
  if (diffDays <= 3) return { label: `あと${diffDays}日`, tone: 'text-amber-700' };
  return { label: `${due}`, tone: 'text-gray-700' };
}

export function CommitmentItem({
  commitment,
  memberId,
}: {
  commitment: Commitment;
  memberId: string;
}) {
  const [pending, startTransition] = useTransition();
  const isDone = commitment.status === 'done';
  const due = formatDue(commitment.due_date, commitment.status);

  function handleComplete() {
    startTransition(async () => {
      try {
        await completeCommitment(commitment.id, memberId);
        toast.success('完了しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
      }
    });
  }

  function handleDelete() {
    if (!confirm('このコミットメントを削除しますか？')) return;
    startTransition(async () => {
      try {
        await deleteCommitment(commitment.id, memberId);
        toast.success('削除しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '削除失敗';
        toast.error('削除失敗', { description: msg });
      }
    });
  }

  return (
    <li
      className={`flex items-start gap-3 border-l-2 pl-3 py-1 ${
        isDone ? 'border-gray-200 opacity-60' : 'border-amber-300'
      }`}
    >
      {!isDone && (
        <button
          type="button"
          onClick={handleComplete}
          disabled={pending}
          className="mt-0.5 w-5 h-5 rounded-full border-2 border-gray-200 hover:border-gray-900 transition-colors disabled:opacity-50"
          aria-label="完了にする"
        />
      )}
      {isDone && (
        <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${isDone ? 'line-through text-gray-700' : 'text-gray-900'}`}>
          {commitment.text}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={`text-xs font-mono ${due.tone}`}>{due.label}</span>
          {commitment.deal_id && (
            <Link
              href={`/deals/${commitment.deal_id}`}
              className="text-xs text-gray-700 hover:text-gray-900 underline"
            >
              関連案件
            </Link>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="flex items-center justify-center text-gray-700 hover:text-red-700 disabled:opacity-50"
        aria-label="削除"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}
