'use client';

import type { Customer } from '@/lib/stores/types';

type Props = {
  customer: Customer;
  dealCount: number;
  ltv: number;
  onClick: () => void;
};

export function CustomerCard({ customer, dealCount, ltv, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-gray-200 shadow-sm bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">{customer.companyName}</p>
          {customer.contactName && (
            <p className="text-xs text-gray-500 mt-0.5">{customer.contactName}</p>
          )}
        </div>
        {customer.industry && (
          <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 shrink-0">{customer.industry}</span>
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>案件 {dealCount}件</span>
        {ltv > 0 && <span className="tabular-nums">LTV ¥{ltv.toLocaleString()}</span>}
        {customer.source && <span className="ml-auto">{customer.source}</span>}
      </div>
    </button>
  );
}
