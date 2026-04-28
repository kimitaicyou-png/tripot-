'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDealArtifact } from '@/lib/actions/deal-artifacts';

type Props = {
  id: string;
  dealId: string;
  title: string;
  artifact_type: string | null;
  file_url: string | null;
  note: string | null;
};

export function ArtifactRow(props: Props) {
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
      await deleteDealArtifact(props.id, props.dealId);
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-4 px-5 py-4 bg-white border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          {props.file_url ? (
            <a
              href={props.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base font-medium text-gray-900 hover:underline"
            >
              {props.title} ↗
            </a>
          ) : (
            <p className="text-base font-medium text-gray-900">{props.title}</p>
          )}
          {props.artifact_type && (
            <span className="text-xs uppercase tracking-widest text-gray-500">{props.artifact_type}</span>
          )}
        </div>
        {props.note && <p className="text-xs text-gray-500 whitespace-pre-wrap">{props.note}</p>}
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
