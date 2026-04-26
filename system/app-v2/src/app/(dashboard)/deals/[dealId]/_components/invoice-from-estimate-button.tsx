'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoiceFromEstimate } from '@/lib/actions/invoices';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function InvoiceFromEstimateButton({
  dealId,
  estimateId,
  estimateTotal,
}: {
  dealId: string;
  estimateId: string;
  estimateTotal: number;
  estimateSubtotal: number;
  estimateTax: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await createInvoiceFromEstimate(estimateId, dealId);
        toast.success('請求書を作成しました', {
          description: `合計 ¥${estimateTotal.toLocaleString('ja-JP')}・期限30日後・請求書タブで確認`,
        });
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '作成失敗';
        toast.error('請求書作成失敗', { description: msg });
      }
    });
  }

  return (
    <Button
      type="button"
      variant="primary"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      {pending ? '作成中…' : '🧾 請求書を作成'}
    </Button>
  );
}
