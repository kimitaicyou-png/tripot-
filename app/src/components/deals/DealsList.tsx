'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { loadAllDeals, saveAllDeals } from '@/lib/dealsStore';
import Link from 'next/link';
import { KanbanBoard, type KanbanColumn, type KanbanCard } from '@/components/ui/KanbanBoard';
import NextAction, { MOCK_NEXT_ACTIONS } from '@/components/personal/NextAction';
import type { Deal, Stage, Filter } from '@/lib/deals/types';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/deals/constants';
import { MOCK_CLAIMS, MOCK_COMMS } from '@/lib/deals/mockData';
import { NewDealModal } from './NewDealModal';
import { DealDetail } from './DealDetail';
import { ChartBarIcon, ListBulletIcon, SectionHeader } from './icons';

function dealToCard(deal: Deal): KanbanCard {
  return {
    id: deal.id, title: deal.dealName, subtitle: deal.clientName,
    amount: deal.revenueType === 'running' ? (deal.monthlyAmount ?? 0) * 12 : deal.amount,
    progress: deal.progress, assignee: deal.assignee, risk: undefined,
    claim: deal.stage === 'claim', badge: deal.revenueType === 'running' ? '継続' : undefined,
  };
}

export function DealsList() {
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get('deal');
  const [deals, setDeals] = useState<Deal[]>(() => { if (typeof window === 'undefined') return []; return loadAllDeals(); });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(() => {
    if (!initialDealId || typeof window === 'undefined') return null;
    return loadAllDeals().find((d) => d.id === initialDealId) ?? null;
  });
  const urlFilter = (searchParams?.get('filter') as Filter) ?? 'active';
  const urlView = (searchParams?.get('view') as 'list' | 'pipeline') ?? 'list';
  const [filter, setFilterState] = useState<Filter>(urlFilter);
  const [view, setViewState] = useState<'list' | 'pipeline'>(urlView);
  const syncUrl = useCallback((nextFilter: Filter, nextView: 'list' | 'pipeline') => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('filter', nextFilter); params.set('view', nextView);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  useEffect(() => { saveAllDeals(deals); }, [deals]);
  const setFilter = (f: Filter) => { setFilterState(f); syncUrl(f, view); };
  const setView = (v: 'list' | 'pipeline') => { setViewState(v); syncUrl(filter, v); };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearSelection = () => setSelectedIds(new Set());
  const bulkUpdateStage = (stage: Stage) => { setDeals((prev) => prev.map((d) => selectedIds.has(d.id) ? { ...d, stage } : d)); clearSelection(); };
  const [newDealOpen, setNewDealOpen] = useState(false);

  const handleStageChange = (id: string, stage: Stage) => {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, stage } : d));
    setSelectedDeal((prev) => prev?.id === id ? { ...prev, stage } : prev);
  };

  const filtered = deals.filter((d) => {
    if (filter === 'active') return ['lead', 'meeting', 'proposal'].includes(d.stage);
    if (filter === 'claim') return ['claim', 'claim_resolved'].includes(d.stage);
    if (filter === 'estimate') return ['estimate_sent', 'negotiation'].includes(d.stage);
    if (filter === 'ordered') return d.stage === 'ordered';
    if (filter === 'production') return ['in_production', 'delivered', 'acceptance'].includes(d.stage);
    if (filter === 'handed_off') return d.process?.committedToProduction === true;
    if (filter === 'billing') return ['invoiced', 'accounting', 'paid'].includes(d.stage);
    if (filter === 'running') return d.revenueType === 'running';
    return true;
  });

  const activePipeline = deals.filter((d) => ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation'].includes(d.stage));
  const inProduction = deals.filter((d) => ['in_production', 'delivered', 'acceptance'].includes(d.stage));
  const ordered = deals.filter((d) => d.stage === 'ordered');
  const dealsWithClaims = new Set(Object.entries(MOCK_CLAIMS).filter(([, claims]) => claims.some((c) => c.status !== 'resolved')).map(([id]) => id));

  if (selectedDeal) {
    return <DealDetail deal={selectedDeal} onBack={() => setSelectedDeal(null)} onStageChange={handleStageChange} />;
  }

  return (
    <div className={`${view === 'pipeline' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto px-4 py-5`}>
      <SectionHeader icon={<ChartBarIcon />} label="パイプラインサマリー" />
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border border-gray-200 rounded-lg mb-5 bg-white">
        <div className="px-3 py-3 text-center"><p className="text-2xl font-semibold text-gray-900 tabular-nums">{activePipeline.length}</p><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">営業中</p></div>
        <div className="px-3 py-3 text-center"><p className="text-2xl font-semibold text-blue-600 tabular-nums">{ordered.length}</p><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">受注</p></div>
        <div className="px-3 py-3 text-center"><p className="text-2xl font-semibold text-blue-600 tabular-nums">{inProduction.length}</p><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">制作中</p></div>
        <div className="px-3 py-3 text-center"><p className="text-base font-semibold text-gray-900 tabular-nums">¥{(activePipeline.reduce((s, d) => s + d.amount, 0) / 10000).toFixed(0)}万</p><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">見込</p></div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={<ListBulletIcon />} label="案件一覧" />
        <div className="flex border-b border-gray-200 text-xs">
          <button onClick={() => setView('list')} className={`px-3 py-1.5 font-medium transition-colors ${view === 'list' ? 'text-gray-900 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>リスト</button>
          <button onClick={() => setView('pipeline')} className={`px-3 py-1.5 font-medium transition-colors ${view === 'pipeline' ? 'text-gray-900 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>パイプライン</button>
        </div>
      </div>

      {view === 'list' && (
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
          {([['active', '商談中'], ['estimate', '見積中'], ['ordered', '受注'], ['production', '制作中'], ['handed_off', '制作引き渡し済'], ['billing', '請求・入金'], ['running', '継続'], ['claim', 'クレーム'], ['all', '全て']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${filter === k ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
      )}

      {view === 'list' && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">案件がありません</p>
              <p className="text-xs text-gray-500">下のボタンから新規案件を追加してください</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 overflow-hidden">
              {selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{selectedIds.size}件選択中</span>
                  <div className="flex items-center gap-2">
                    <select onChange={(e) => { if (e.target.value) { bulkUpdateStage(e.target.value as Stage); e.currentTarget.value = ''; } }}
                      className="text-sm font-semibold text-gray-900 rounded px-2 py-1 bg-white">
                      <option value="">ステージを一括変更...</option>
                      {(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'paid', 'lost'] as Stage[]).map((s) => (
                        <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                      ))}
                    </select>
                    <button onClick={clearSelection} className="text-xs font-semibold text-white/90 hover:text-white">解除</button>
                  </div>
                </div>
              )}
              {filtered.map((deal) => (
                <div key={deal.id} className={`flex items-stretch ${deal.stage === 'claim' ? 'border-l-4 border-l-red-500 bg-red-50/30' : deal.stage === 'lost' ? 'border-l-4 border-l-gray-300 bg-gray-50/50 opacity-60' : 'border-l-4 border-l-transparent'}`}>
                  <label className="flex items-center pl-3 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(deal.id)} onChange={() => toggleSelected(deal.id)} className="w-4 h-4 accent-blue-600 cursor-pointer" />
                  </label>
                  <button onClick={() => setSelectedDeal(deal)} className="flex-1 px-4 py-3.5 text-left transition-colors group hover:bg-gray-50 active:scale-[0.98]">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 mt-0.5 ${STAGE_BADGE[deal.stage]}`}>{STAGE_LABEL[deal.stage]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900 truncate">{deal.dealName}</p>
                          {dealsWithClaims.has(deal.id) && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">クレーム</span>}
                          {(MOCK_COMMS[deal.id]?.flatMap((c) => c.needs ?? []).length ?? 0) > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">ニーズ{MOCK_COMMS[deal.id]?.flatMap((c) => c.needs ?? []).length ?? 0}件</span>
                          )}
                          {deal.stage === 'paid' && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500 shrink-0">完了</span>}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{deal.clientName}</p>
                        {(['in_production', 'delivered', 'acceptance'] as Stage[]).includes(deal.stage) && deal.progress !== undefined && (
                          <div className="mt-1.5">
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${deal.progress}%` }} /></div>
                            <div className="flex items-center justify-between mt-0.5">
                              <Link href="/production" onClick={(e) => e.stopPropagation()} className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">📥 制作カードを見る →</Link>
                              <span className="text-[11px] text-gray-500 tabular-nums">{deal.progress}%</span>
                            </div>
                          </div>
                        )}
                        {!(['in_production', 'delivered', 'acceptance'] as Stage[]).includes(deal.stage) && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[11px] font-semibold tabular-nums ${deal.probability >= 80 ? 'text-blue-600' : deal.probability >= 60 ? 'text-gray-700' : 'text-gray-500'}`}>{deal.probability}%</span>
                            <span className="text-[11px] text-gray-500 tabular-nums">{deal.lastDate.slice(5)}</span>
                          </div>
                        )}
                        <div className="mt-1"><NextAction action={MOCK_NEXT_ACTIONS[deal.id] ?? null} onChange={() => {}} compact /></div>
                      </div>
                      <div className="text-right shrink-0">
                        {deal.revenueType === 'shot' && deal.amount > 0 && <p className="text-base font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</p>}
                        {deal.revenueType === 'running' && deal.monthlyAmount && (
                          <div>
                            <p className="text-base font-semibold text-blue-600 tabular-nums">¥{(deal.monthlyAmount / 10000).toFixed(0)}万<span className="text-xs font-medium">/月</span></p>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">継続</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'pipeline' && (() => {
        const kanbanColumns: KanbanColumn[] = [
          { id: 'meeting', label: '商談', cards: deals.filter((d) => ['lead', 'meeting'].includes(d.stage)).map(dealToCard) },
          { id: 'estimate', label: '見積', cards: deals.filter((d) => ['proposal', 'estimate_sent', 'negotiation'].includes(d.stage)).map(dealToCard) },
          { id: 'ordered', label: '受注', cards: deals.filter((d) => d.stage === 'ordered').map(dealToCard) },
          { id: 'production', label: '制作中', cards: deals.filter((d) => ['in_production', 'delivered', 'acceptance'].includes(d.stage)).map(dealToCard) },
          { id: 'billing', label: '請求', cards: deals.filter((d) => ['invoiced', 'accounting'].includes(d.stage)).map(dealToCard) },
          { id: 'paid', label: '入金', cards: deals.filter((d) => d.stage === 'paid').map(dealToCard) },
        ];
        return (<div className="-mx-4 px-4 overflow-x-auto"><KanbanBoard columns={kanbanColumns} onCardClick={(cardId) => { const deal = deals.find((d) => d.id === cardId); if (deal) setSelectedDeal(deal); }} /></div>);
      })()}

      <button onClick={() => setNewDealOpen(true)} className="w-full mt-3 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">+ 新規案件を追加</button>
      {newDealOpen && <NewDealModal onClose={() => setNewDealOpen(false)} onAdd={(deal) => { setDeals((prev) => [...prev, deal]); setNewDealOpen(false); }} existingDeals={deals} />}
    </div>
  );
}
