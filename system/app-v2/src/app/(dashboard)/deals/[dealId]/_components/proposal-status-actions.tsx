'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProposalStatus, type ProposalStatus } from '@/lib/actions/proposals';

const TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  draft: ['shared', 'archived'],
  shared: ['won', 'lost', 'archived'],
  won: ['archived'],
  lost: ['archived'],
  archived: ['draft'],
};

const LABEL: Record<ProposalStatus, string> = {
  draft: '下書きへ戻す',
  shared: '共有済にする',
  won: '✓ 受注',
  lost: '✗ 失注',
  archived: 'アーカイブ',
};

const TONE: Record<ProposalStatus, string> = {
  draft: 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900',
  shared: 'text-blue-700 border-blue-200 hover:bg-blue-50',
  won: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  lost: 'text-red-700 border-red-200 hover:bg-red-50',
  archived: 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900',
};

export function ProposalStatusActions({
  proposalId,
  dealId,
  currentStatus,
}: {
  proposalId: string;
  dealId: string;
  currentStatus: ProposalStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingStatus, setConfirmingStatus] = useState<ProposalStatus | null>(null);

  const nextStatuses = TRANSITIONS[currentStatus] ?? [];

  function handleClick(status: ProposalStatus) {
    const isDestructive = status === 'won' || status === 'lost' || status === 'archived';
    if (isDestructive && confirmingStatus !== status) {
      setConfirmingStatus(status);
      setTimeout(() => setConfirmingStatus((s) => (s === status ? null : s)), 5000);
      return;
    }
    setConfirmingStatus(null);
    startTransition(async () => {
      const result = await updateProposalStatus(proposalId, status, dealId);
      if (!result.success) {
        alert(result.error ?? '更新に失敗しました');
        return;
      }
      router.refresh();
    });
  }

  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {nextStatuses.map((s) => {
        const isConfirming = confirmingStatus === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => handleClick(s)}
            disabled={pending}
            className={`px-3 py-1 text-xs border rounded transition-colors disabled:opacity-40 ${
              isConfirming ? 'text-amber-700 border-amber-700 bg-amber-50' : TONE[s]
            }`}
          >
            {pending ? '...' : isConfirming ? '本当に' : LABEL[s]}
          </button>
        );
      })}
    </div>
  );
}
