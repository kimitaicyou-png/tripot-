'use client';

import { useTransition } from 'react';
import { decideApproval } from '@/lib/actions/approvals';

export function DecideButtons({ approvalId }: { approvalId: string }) {
  const [pending, startTransition] = useTransition();

  function handle(decision: 'approved' | 'rejected') {
    startTransition(async () => {
      try {
        await decideApproval(approvalId, decision);
      } catch (e) {
        alert(e instanceof Error ? e.message : '操作に失敗しました');
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => handle('approved')}
        className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        承認
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => handle('rejected')}
        className="px-3 py-1 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        却下
      </button>
    </div>
  );
}
