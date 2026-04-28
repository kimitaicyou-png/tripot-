'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markPurchaseOrderDelivered, markPurchaseOrderPaid } from '@/lib/actions/purchase-orders';

type Props = {
  id: string;
  cardId: string;
  title: string;
  amount: number | null;
  vendor_name: string | null;
  issued_on: string | null;
  delivered_on: string | null;
  paid_on: string | null;
  created_at: Date | string;
};

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

function formatDate(v: string | null): string {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function PurchaseOrderRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleMarkDelivered() {
    startTransition(async () => {
      const result = await markPurchaseOrderDelivered(props.id, props.cardId);
      if (!result.success) {
        alert(result.error ?? '更新失敗');
        return;
      }
      router.refresh();
    });
  }

  function handleMarkPaid() {
    startTransition(async () => {
      const result = await markPurchaseOrderPaid(props.id, props.cardId);
      if (!result.success) {
        alert(result.error ?? '更新失敗');
        return;
      }
      router.refresh();
    });
  }

  const isPaid = !!props.paid_on;

  return (
    <li className={`bg-white border border-gray-200 rounded-lg p-4 space-y-2 ${isPaid ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-base font-medium text-gray-900">{props.title}</p>
            <span className="text-xs uppercase tracking-widest text-gray-500">
              {props.vendor_name ?? '外注先未設定'}
            </span>
          </div>
          <p className="text-lg font-mono tabular-nums text-gray-900 mt-1">{formatYen(props.amount)}</p>
          <p className="text-xs text-gray-500 font-mono tabular-nums mt-1">
            発注 {formatDate(props.issued_on)} · 納品 {formatDate(props.delivered_on)} · 支払 {formatDate(props.paid_on)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {!props.delivered_on && (
          <button
            type="button"
            onClick={handleMarkDelivered}
            disabled={pending}
            className="px-2 py-0.5 text-xs text-gray-700 border border-gray-200 rounded hover:text-gray-900 hover:border-gray-900 transition-colors disabled:opacity-40"
          >
            → 納品済
          </button>
        )}
        {!props.paid_on && (
          <button
            type="button"
            onClick={handleMarkPaid}
            disabled={pending}
            className="px-2 py-0.5 text-xs text-gray-700 border border-gray-200 rounded hover:text-gray-900 hover:border-gray-900 transition-colors disabled:opacity-40"
          >
            → 支払済
          </button>
        )}
      </div>
    </li>
  );
}
