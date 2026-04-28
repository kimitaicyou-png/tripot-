'use client';

import { useTransition } from 'react';
import { Send, Check, X, Undo2 } from 'lucide-react';
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
          <span className="inline-flex items-center gap-1"><Send className="w-3.5 h-3.5" />送付した</span>
        </Button>
      )}
      {currentStatus === 'sent' && (
        <>
          <Button type="button" variant="primary" size="sm" onClick={() => transition('accepted')} disabled={pending}>
            <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />受諾された</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => transition('declined')} disabled={pending}>
            <span className="inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />辞退された</span>
          </Button>
        </>
      )}
      {(currentStatus === 'accepted' || currentStatus === 'declined') && (
        <Button type="button" variant="ghost" size="sm" onClick={() => transition('draft')} disabled={pending}>
          <span className="inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" />下書きに戻す</span>
        </Button>
      )}
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        削除
      </Button>
    </div>
  );
}
