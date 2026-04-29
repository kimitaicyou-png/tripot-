'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { deleteTimeLog } from '@/lib/actions/time-logs';

type Props = {
  id: string;
  cardId: string;
  minutes: number;
  occurred_on: string;
  note: string | null;
  member_name: string | null;
};

function formatHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}分`;
  if (m === 0) return `${h}時間`;
  return `${h}時間${m}分`;
}

export function TimeLogRow(props: Props) {
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
      await deleteTimeLog(props.id, props.cardId);
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono tabular-nums text-base text-gray-900 font-medium">{formatHM(props.minutes)}</span>
          <span className="text-xs font-mono tabular-nums text-gray-500">{props.occurred_on}</span>
          {props.member_name && <span className="text-xs text-gray-700">{props.member_name}</span>}
        </div>
        {props.note && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{props.note}</p>}
      </div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs border rounded transition-colors disabled:opacity-40 ${
          confirming
            ? 'text-red-700 border-red-700 hover:bg-red-50'
            : 'text-gray-700 border-gray-200 hover:text-red-700 hover:border-red-700'
        }`}
        aria-label="削除"
      >
        <Trash2 className="w-3 h-3" />
        {confirming ? '本当に削除' : '削除'}
      </button>
    </li>
  );
}
