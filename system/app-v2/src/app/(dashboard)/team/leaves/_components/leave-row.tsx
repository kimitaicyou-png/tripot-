'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteLeave } from '@/lib/actions/leaves';

type LeaveRowProps = {
  id: string;
  member_name: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  note: string | null;
};

function formatRange(start: string, end: string): string {
  if (start === end) return start;
  return `${start} 〜 ${end}`;
}

function dayCount(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
}

export function LeaveRow(props: LeaveRowProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    startTransition(async () => {
      await deleteLeave(props.id);
      router.refresh();
    });
  }

  return (
    <li className="flex items-center gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-base font-medium text-gray-900">{props.member_name ?? '（不明）'}</p>
          <span className="text-xs uppercase tracking-widest text-gray-500">{props.leave_type}</span>
          <span className="text-xs font-mono tabular-nums text-gray-700">
            {dayCount(props.start_date, props.end_date)}日
          </span>
        </div>
        <p className="text-sm font-mono tabular-nums text-gray-700 mt-0.5">
          {formatRange(props.start_date, props.end_date)}
        </p>
        {props.note && <p className="text-xs text-gray-500 mt-1">{props.note}</p>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`shrink-0 px-3 py-1.5 text-xs border rounded transition-colors ${
          confirming
            ? 'text-red-700 border-red-700 hover:bg-red-50'
            : 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900'
        } disabled:opacity-40`}
      >
        {pending ? '...' : confirming ? '本当に削除' : '削除'}
      </button>
    </li>
  );
}
