'use client';

import { useTransition } from 'react';
import { updateEstimateStatus, deleteEstimate } from '@/lib/actions/estimates';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function EstimateStatusActions({
  estimateId,
  dealId,
  currentStatus,
}: {
  estimateId: string;
  dealId: string;
  currentStatus: 'draft' | 'sent' | 'accepted' | 'declined';
}) {
  const [pending, startTransition] = useTransition();

  function transition(next: 'sent' | 'accepted' | 'declined' | 'draft') {
    startTransition(async () => {
      try {
        await updateEstimateStatus(estimateId, dealId, next);
        const label =
          next === 'sent' ? '送付済' : next === 'accepted' ? '受諾' : next === 'declined' ? '辞退' : '下書き';
        toast.success(`${label}に更新`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
      }
    });
  }

  function handleDelete() {
    if (!confirm('この見積を削除しますか？')) return;
    startTransition(async () => {
      try {
        await deleteEstimate(estimateId, dealId);
        toast.success('削除しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '削除失敗';
        toast.error('削除失敗', { description: msg });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === 'draft' && (
        <Button type="button" variant="primary" size="sm" onClick={() => transition('sent')} disabled={pending}>
          ▶ 送付した
        </Button>
      )}
      {currentStatus === 'sent' && (
        <>
          <Button type="button" variant="primary" size="sm" onClick={() => transition('accepted')} disabled={pending}>
            ✓ 受諾された
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => transition('declined')} disabled={pending}>
            ✕ 辞退された
          </Button>
        </>
      )}
      {(currentStatus === 'accepted' || currentStatus === 'declined') && (
        <Button type="button" variant="ghost" size="sm" onClick={() => transition('draft')} disabled={pending}>
          ↩ 下書きに戻す
        </Button>
      )}
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        削除
      </Button>
    </div>
  );
}
