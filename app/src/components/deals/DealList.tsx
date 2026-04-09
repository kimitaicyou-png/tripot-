'use client';

import { useState } from 'react';
import type { Deal, Stage } from '@/lib/stores/types';
import { STAGE_LABEL } from '@/lib/constants/stages';
import { DealCard } from './DealCard';
import { DealForm } from './DealForm';
import { EmptyState } from '@/components/ui/EmptyState';

type Filter = 'all' | 'active' | 'ordered' | 'billing' | 'lost';

const FILTER_LABEL: Record<Filter, string> = {
  all: '全件',
  active: '営業中',
  ordered: '受注済み',
  billing: '請求・入金',
  lost: '失注',
};

const ACTIVE_STAGES = new Set<Stage>(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation']);
const ORDERED_STAGES = new Set<Stage>(['ordered', 'in_production', 'delivered', 'acceptance']);
const BILLING_STAGES = new Set<Stage>(['invoiced', 'accounting', 'paid']);

function filterDeals(deals: Deal[], filter: Filter): Deal[] {
  switch (filter) {
    case 'active': return deals.filter((d) => ACTIVE_STAGES.has(d.stage));
    case 'ordered': return deals.filter((d) => ORDERED_STAGES.has(d.stage));
    case 'billing': return deals.filter((d) => BILLING_STAGES.has(d.stage));
    case 'lost': return deals.filter((d) => d.stage === 'lost');
    default: return deals;
  }
}

type Props = {
  deals: Deal[];
  onAdd: (deal: Deal) => void;
  onSelect: (deal: Deal) => void;
};

export function DealList({ deals, onAdd, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [showForm, setShowForm] = useState(false);

  const filtered = filterDeals(deals, filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => {
            const count = filterDeals(deals, f).length;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-medium rounded-full px-3 py-1.5 border active:scale-[0.98] transition-colors ${
                  filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {FILTER_LABEL[f]} ({count})
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all duration-150"
        >
          + 案件を追加
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="案件がありません"
          description={filter === 'all' ? '新しい案件を追加してください' : `${FILTER_LABEL[filter]}の案件はありません`}
          action={
            filter === 'all' ? (
              <button onClick={() => setShowForm(true)} className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-[0.98]">
                案件を追加
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((deal) => (
            <DealCard key={deal.id} deal={deal} onClick={() => onSelect(deal)} />
          ))}
        </div>
      )}

      {showForm && (
        <DealForm
          onSubmit={(deal) => { onAdd(deal); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
