'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDealComment } from '@/lib/actions/deal-comments';

type Props = {
  id: string;
  dealId: string;
  body: string;
  created_at: string;
  member_name: string | null;
};

export function CommentRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    startTransition(async () => {
      await deleteDealComment(props.id, props.dealId);
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{props.member_name ?? '（不明）'}</p>
          <p className="text-xs font-mono tabular-nums text-gray-500">
            {new Date(props.created_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{props.body}</p>
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`shrink-0 px-3 py-1.5 text-xs border rounded transition-colors disabled:opacity-40 ${
          confirming
            ? 'text-red-700 border-red-700 hover:bg-red-50'
            : 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900'
        }`}
      >
        {pending ? '...' : confirming ? '本当に削除' : '削除'}
      </button>
    </li>
  );
}
