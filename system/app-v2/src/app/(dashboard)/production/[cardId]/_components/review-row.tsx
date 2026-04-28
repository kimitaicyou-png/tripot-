'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateReviewStatus } from '@/lib/actions/reviews';

const STATUS_TONE: Record<string, string> = {
  pending: 'text-gray-500',
  approved: 'text-emerald-700',
  rejected: 'text-red-700',
  revision: 'text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'pending（保留）',
  approved: 'approved（承認）',
  rejected: 'rejected（差戻）',
  revision: 'revision（修正）',
};

const NEXT_OPTIONS: Record<string, string[]> = {
  pending: ['approved', 'rejected', 'revision'],
  approved: ['revision', 'pending'],
  rejected: ['revision', 'approved'],
  revision: ['approved', 'rejected'],
};

type Props = {
  id: string;
  cardId: string;
  deliverable_name: string | null;
  deliverable_version: number | null;
  reviewer_name: string | null;
  status: string;
  feedback: string | null;
  reviewed_at: Date | string | null;
  created_at: Date | string;
};

export function ReviewRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStatus(status: string) {
    startTransition(async () => {
      const result = await updateReviewStatus(
        props.id,
        props.cardId,
        status as 'pending' | 'approved' | 'rejected' | 'revision'
      );
      if (!result.success) {
        alert(result.error ?? '更新失敗');
        return;
      }
      router.refresh();
    });
  }

  const next = NEXT_OPTIONS[props.status] ?? [];

  return (
    <li className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className={`text-xs uppercase tracking-widest font-medium ${STATUS_TONE[props.status] ?? 'text-gray-500'}`}>
              {STATUS_LABEL[props.status] ?? props.status}
            </span>
            {props.deliverable_name && (
              <span className="text-xs text-gray-700">
                対象：{props.deliverable_name} v{props.deliverable_version}
              </span>
            )}
          </div>
          {props.feedback && (
            <p className="text-sm text-gray-700 whitespace-pre-wrap mt-1">{props.feedback}</p>
          )}
          <p className="text-xs text-gray-500 font-mono tabular-nums mt-1">
            レビュアー {props.reviewer_name ?? '不明'} · {new Date(props.created_at).toLocaleString('ja-JP')}
            {props.reviewed_at && ` · 確定 ${new Date(props.reviewed_at).toLocaleString('ja-JP')}`}
          </p>
        </div>
      </div>
      {next.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {next.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatus(s)}
              disabled={pending}
              className="px-2 py-0.5 text-xs text-gray-700 border border-gray-200 rounded hover:text-gray-900 hover:border-gray-900 transition-colors disabled:opacity-40"
            >
              → {STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
