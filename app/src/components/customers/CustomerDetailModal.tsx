'use client';

import { useEffect } from 'react';
import type { Customer, Deal } from '@/lib/stores/types';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';

type Props = {
  customer: Customer;
  deals: Deal[];
  onClose: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
};

export function CustomerDetailModal({ customer, deals, onClose, onEdit, onRemove }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const totalAmount = deals.reduce((s, d) => s + d.amount, 0);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms_ease-out]" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-sm z-50 flex flex-col animate-[slide-in-right_250ms_ease-out]" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900">{customer.companyName}</p>
            {customer.contactName && <p className="text-xs text-gray-500 mt-0.5">{customer.contactName}</p>}
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full text-gray-500 hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">業種</p>
              <p className="text-gray-900">{customer.industry || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">流入元</p>
              <p className="text-gray-900">{customer.source || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">メール</p>
              {customer.email ? (
                <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">{customer.email}</a>
              ) : <p className="text-gray-500">—</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">電話</p>
              {customer.phone ? (
                <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">{customer.phone}</a>
              ) : <p className="text-gray-500">—</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">登録日</p>
              <p className="text-gray-900 tabular-nums">{customer.createdAt.slice(0, 10)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">取引総額</p>
              <p className="font-semibold text-gray-900 tabular-nums">{formatYen(totalAmount)}</p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">関連案件（{deals.length}件）</h3>
            {deals.length === 0 ? (
              <p className="text-xs text-gray-500 py-3 text-center">関連する案件はありません</p>
            ) : (
              <div className="space-y-2">
                {deals.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{d.dealName}</p>
                      <p className="text-xs text-gray-500 tabular-nums">{formatYen(d.amount)}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[d.stage]}`}>
                      {STAGE_LABEL[d.stage]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onRemove(customer.id)}
            className="text-xs px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 active:scale-[0.98]"
          >
            削除
          </button>
          <button
            type="button"
            onClick={() => onEdit(customer.id)}
            className="text-xs px-3 py-1.5 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
          >
            編集
          </button>
        </div>
      </div>
    </>
  );
}
