'use client';

import type { Deal } from '@/lib/stores/types';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';

type Props = {
  deal: Deal;
  onClick: () => void;
};

export function DealCard({ deal, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:border-blue-200 active:scale-[0.98] transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-gray-900 truncate flex-1">{deal.dealName}</p>
        {deal.amount > 0 && (
          <span className="text-xs font-medium text-gray-900 tabular-nums shrink-0">{formatYen(deal.amount)}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STAGE_BADGE[deal.stage]}`}>
          {STAGE_LABEL[deal.stage]}
        </span>
        <span className="text-xs text-gray-500 truncate">{deal.clientName}</span>
      </div>
      {deal.memo && (
        <p className="text-xs text-gray-500 mt-1 truncate">{deal.memo}</p>
      )}
    </button>
  );
}
