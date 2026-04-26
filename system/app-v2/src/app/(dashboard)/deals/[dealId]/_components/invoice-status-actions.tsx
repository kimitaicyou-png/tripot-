'use client';

import { useTransition } from 'react';
import { updateInvoiceStatus, deleteInvoice } from '@/lib/actions/invoices';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type Status = 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'voided';

const STATUS_LABEL: Record<Status, string> = {
  draft: '下書き',
  issued: '発行済',
  sent: '送付済',
  paid: '入金済',
  overdue: '期限超過',
  voided: '取消',
};

export function InvoiceStatusActions({
  invoiceId,
  dealId,
  currentStatus,
}: {
  invoiceId: string;
  dealId: string;
  currentStatus: Status;
}) {
  const [pending, startTransition] = useTransition();

  function transition(next: Status) {
    startTransition(async () => {
      try {
        await updateInvoiceStatus(invoiceId, dealId, next);
        toast.success(`${STATUS_LABEL[next]}に更新`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
      }
    });
  }

  function handleDelete() {
    if (!confirm('この請求書を削除しますか？')) return;
    startTransition(async () => {
      try {
        await deleteInvoice(invoiceId, dealId);
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
        <Button type="button" variant="primary" size="sm" onClick={() => transition('issued')} disabled={pending}>
          ▶ 発行する
        </Button>
      )}
      {currentStatus === 'issued' && (
        <Button type="button" variant="primary" size="sm" onClick={() => transition('sent')} disabled={pending}>
          ✉ 送付した
        </Button>
      )}
      {(currentStatus === 'issued' || currentStatus === 'sent' || currentStatus === 'overdue') && (
        <Button type="button" variant="primary" size="sm" onClick={() => transition('paid')} disabled={pending}>
          ✓ 入金確認
        </Button>
      )}
      {currentStatus === 'sent' && (
        <Button type="button" variant="secondary" size="sm" onClick={() => transition('overdue')} disabled={pending}>
          ⚠ 期限超過
        </Button>
      )}
      {currentStatus !== 'paid' && currentStatus !== 'voided' && (
        <Button type="button" variant="ghost" size="sm" onClick={() => transition('voided')} disabled={pending}>
          取消
        </Button>
      )}
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        削除
      </Button>
    </div>
  );
}
