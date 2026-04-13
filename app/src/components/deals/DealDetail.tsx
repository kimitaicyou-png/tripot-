'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import type { Deal, Stage, Slide, HistoryEvent } from '@/lib/deals/types';
import { STAGE_LABEL, STAGE_BADGE, SALES_STAGES, PRODUCTION_STAGES, BILLING_STAGES, CLAIM_NEXT_STAGES } from '@/lib/deals/constants';
import { MOCK_CLAIMS, MOCK_COMMS } from '@/lib/deals/mockData';
import { appendHistory } from '@/lib/deals/dealOverrides';
import { updateDeal } from '@/lib/dealsStore';
import { buildProductionCard, addProductionCard, getProductionCardByDealId } from '@/lib/productionCards';
import NextAction, { MOCK_NEXT_ACTIONS, type NextActionData } from '@/components/personal/NextAction';
import LostDealRecord, { type LostReason, REASON_LABEL } from '@/components/personal/LostDealRecord';
import { ActionSection } from './ActionSection';
import { NeedsSection, CollapsibleSalesArchive, ClaimInlineSection, TimelineTab, AttachmentsTab } from './DealSections';
import { ProposalEditor } from './ProposalEditor';
import { EstimateEditor } from './EstimateEditor';
import { OrderedFlowSection } from './OrderedFlowSection';
import { ProcessTab } from './ProcessTab';
import { InvoiceSection, ProductionPhasePanel, BillingPhasePanel } from './InvoiceSection';

type DealDetailProps = {
  deal: Deal;
  onBack: () => void;
  onStageChange: (id: string, stage: Stage) => void;
  onUpdate?: (deal: Deal) => void;
};

export function DealDetail({ deal: initialDeal, onBack, onStageChange, onUpdate }: DealDetailProps) {
  const [deal, setDeal] = useState(initialDeal);
  const [modal, setModal] = useState<'proposal' | 'estimate' | 'estimate-from-proposal' | 'lost' | null>(null);
  const [proposalSlides, setProposalSlides] = useState<Slide[]>([]);
  const [nextActions, setNextActions] = usePersistedState<Record<string, NextActionData | null>>('deal_next_actions', MOCK_NEXT_ACTIONS as Record<string, NextActionData | null>);
  const [lostReason, setLostReason] = useState<LostReason | undefined>(undefined);
  const [invoice, setInvoice] = useState<NonNullable<Deal['invoice']>>(initialDeal.invoice ?? { status: 'none' });
  const [detailTab, setDetailTab] = useState<'main' | 'timeline' | 'attachments' | 'process'>('main');

  const handleStageChange = (stage: Stage) => {
    const prevStage = deal.stage;
    setDeal((prev) => ({ ...prev, stage }));
    onStageChange(deal.id, stage);
    appendHistory(deal.id, { type: 'stage_change', title: `ステージ変更: ${STAGE_LABEL[prevStage]} → ${STAGE_LABEL[stage]}`, actor: deal.assignee }, setDeal);
  };

  const isSalesPhase = SALES_STAGES.includes(deal.stage);
  const isLost = deal.stage === 'lost';
  const isProductionPhase = PRODUCTION_STAGES.includes(deal.stage);
  const isBillingPhase = BILLING_STAGES.includes(deal.stage);
  const isClaimPhase = deal.stage === 'claim' || deal.stage === 'claim_resolved';
  const isPostOrder = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'].includes(deal.stage);

  const visibleSalesStages = SALES_STAGES.filter((s) => {
    if (CLAIM_NEXT_STAGES[deal.stage]) return false;
    if (s === ('claim' as Stage)) return false;
    return true;
  });

  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-5 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-5">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1">← 戻る</button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setDetailTab('main')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${detailTab === 'main' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>案件詳細</button>
            <button onClick={() => setDetailTab('timeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              🕐 履歴{(deal.history ?? []).length > 0 && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">{(deal.history ?? []).length}</span>}
            </button>
            <button onClick={() => setDetailTab('attachments')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'attachments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              📎 添付{(deal.attachments ?? []).length > 0 && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">{(deal.attachments ?? []).length}</span>}
            </button>
            {isPostOrder && (
              <button onClick={() => setDetailTab('process')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'process' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🔧 工程・アサイン{deal.process?.committedToProduction && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">投入済</span>}
              </button>
            )}
          </div>
        </div>

        {detailTab === 'main' && (
          <>
            <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 mb-0.5">{deal.clientName}</p>
                  <h1 className="text-xl font-semibold text-gray-900 leading-snug">{deal.dealName}</h1>
                </div>
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ml-3 shrink-0 ${STAGE_BADGE[deal.stage]}`}>{STAGE_LABEL[deal.stage]}</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-4 text-base text-gray-600">
                {(deal.revenueType === 'shot' || deal.revenueType === 'both') && deal.amount > 0 && <span className="font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</span>}
                {(deal.revenueType === 'running' || deal.revenueType === 'both') && deal.monthlyAmount && <span className="font-semibold text-blue-600 tabular-nums">¥{(deal.monthlyAmount / 10000).toFixed(0)}万/月</span>}
                <span className="text-gray-600">{deal.industry}</span>
                <span className="text-gray-600">{deal.assignee}</span>
                <span className="text-gray-600 tabular-nums">確度 {deal.probability}%</span>
              </div>
              <textarea value={deal.memo} onChange={(e) => setDeal((prev) => ({ ...prev, memo: e.target.value }))} placeholder="一言メモ（クリックで編集）" rows={2}
                className="w-full text-sm text-gray-700 mb-4 leading-relaxed bg-transparent border-0 rounded px-0 -mx-0 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:px-2 focus:-mx-2 transition-all resize-none placeholder:text-gray-600" />

              {(() => {
                let stageOptions: { value: string; label: string }[] = [];
                if (isSalesPhase) stageOptions = visibleSalesStages.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
                else if (isProductionPhase) stageOptions = PRODUCTION_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
                else if (isBillingPhase) stageOptions = BILLING_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
                else if (isClaimPhase) {
                  stageOptions = (['claim', 'claim_resolved'] as Stage[]).map((s) => ({ value: s, label: STAGE_LABEL[s] }));
                  if (deal.stage === 'claim_resolved') { stageOptions.push({ value: 'invoiced', label: STAGE_LABEL.invoiced }); stageOptions.push({ value: 'paid', label: STAGE_LABEL.paid }); }
                }
                return (<div className="mb-1"><NextAction action={nextActions[deal.id] ?? null} onChange={(action) => setNextActions((prev) => ({ ...prev, [deal.id]: action ?? null }))} currentStage={deal.stage} stageOptions={stageOptions} onStageChange={(s) => handleStageChange(s as Stage)} /></div>);
              })()}

              {deal.stage === 'claim_resolved' && (
                <div className="border-t border-gray-100 pt-3 mt-4">
                  <button onClick={() => handleStageChange('invoiced')} className="w-full py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200">請求済にする</button>
                  <button onClick={() => handleStageChange('paid')} className="block w-full text-center mt-2 text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">既に入金済みの場合はこちら →</button>
                </div>
              )}

              {(isSalesPhase || isLost) && (
                <div className="border-t border-gray-100 pt-3 mt-4">
                  {isLost ? (
                    <div className="space-y-2">
                      {lostReason && (
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs font-semibold text-gray-600 mb-0.5">{REASON_LABEL[lostReason.reason]}</p>
                          {lostReason.competitor && <p className="text-xs text-gray-500">競合: {lostReason.competitor}</p>}
                          <p className="text-xs text-gray-500">{lostReason.detail}</p>
                          <p className="text-xs text-gray-500 mt-1">{lostReason.recordedAt}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => setModal('lost')} className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-[0.98] transition-all">失注理由を{lostReason ? '編集' : '記録'}</button>
                        <button onClick={() => { handleStageChange('lead'); setLostReason(undefined); }} className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 active:scale-[0.98] transition-all">リードに戻す</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleStageChange('claim')} className="text-xs text-red-600 hover:text-red-800 font-medium">クレーム発生</button>
                      <span className="text-xs text-gray-500">/</span>
                      <button onClick={() => setModal('lost')} className="text-xs text-gray-500 hover:text-gray-700 font-medium">失注として記録</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isPostOrder && !deal.process?.committedToProduction && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-900">制作カード未作成</p>
                    <p className="text-xs text-blue-700 mt-0.5">ワンクリックで制作ダッシュボードに登録できます</p>
                  </div>
                  <button
                    onClick={async () => {
                      const card = buildProductionCard({
                        dealId: deal.id, dealName: deal.dealName, clientName: deal.clientName,
                        amount: deal.amount, pmId: '', pmName: deal.assignee,
                        teamMemberIds: [], externalPartnerIds: [],
                        requirement: '', proposalSummary: `${deal.dealName} / ${deal.clientName}`,
                        quoteTotal: deal.amount, budget: deal.amount, handedOffBy: deal.assignee,
                      });
                      card.phase = 'kickoff';
                      card.tasks = [{ id: `t_${card.id}_0`, title: 'キックオフMTG', status: 'todo' as const, assigneeId: '' }];
                      await addProductionCard(card);
                      const proc = { requirementsGenerated: false, wbsGenerated: false, ...deal.process, committedToProduction: true, committedAt: new Date().toISOString(), handoffCardId: card.id };
                      await updateDeal(deal.id, { process: proc });
                      setDeal((prev) => ({ ...prev, process: proc } as Deal));
                    }}
                    className="px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
                  >
                    制作カードを作成
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <ActionSection deal={deal} isProductionContext={isProductionPhase || deal.stage === 'ordered'} />
            </div>

            {(MOCK_COMMS[deal.id] ?? []).flatMap((c) => c.needs ?? []).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mt-4"><NeedsSection deal={deal} /></div>
            )}

            <CollapsibleSalesArchive deal={deal}
              onOpenProposal={() => setModal('proposal')}
              onOpenEstimate={() => setModal('estimate')}
              onContractStatusChange={(contractName, status) => {
                const labelMap: Record<string, string> = { sent: '送付済み', signed: '締結済み', draft: '下書き', expired: '期限切れ' };
                const typeMap: Record<string, 'contract_sent' | 'contract_signed' | 'note'> = { sent: 'contract_sent', signed: 'contract_signed', draft: 'note', expired: 'note' };
                appendHistory(deal.id, { type: typeMap[status] ?? 'note', title: `契約書ステータス変更: ${contractName} → ${labelMap[status] ?? status}`, actor: deal.assignee }, setDeal);
              }}
            />

            {(MOCK_CLAIMS[deal.id] ?? []).length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mt-4"><ClaimInlineSection deal={deal} /></div>
            )}

            {deal.stage === 'ordered' && <div className="mt-5"><OrderedFlowSection deal={deal} onSendToProduction={() => handleStageChange('in_production')} /></div>}
            {isProductionPhase && <div className="mt-5"><ProductionPhasePanel deal={deal} onStageChange={handleStageChange} /></div>}
            {isBillingPhase && <div className="mt-5"><BillingPhasePanel deal={deal} onStageChange={handleStageChange} /></div>}
            {(isBillingPhase || deal.stage === 'acceptance') && (
              <div className="mt-4">
                <InvoiceSection deal={deal} invoice={invoice}
                  onInvoiceChange={(next) => { setInvoice(next); setDeal((prev) => ({ ...prev, invoice: next })); }}
                  onStageChange={handleStageChange}
                  onAppendHistory={(event) => appendHistory(deal.id, event, setDeal)} />
              </div>
            )}
            <div className="sticky bottom-0 bg-white border-t-2 border-blue-100 rounded-b-2xl px-5 py-5 mt-5 flex items-center gap-3 shadow-sm">
              <select
                value={deal.stage}
                onChange={(e) => handleStageChange(e.target.value as Stage)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-base font-semibold text-gray-900 bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
              >
                {(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid', 'claim', 'claim_resolved', 'lost'] as Stage[]).map((s) => (
                  <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                ))}
              </select>
              <button
                onClick={async () => {
                  await updateDeal(deal.id, { ...deal });
                  if (onUpdate) onUpdate(deal);
                  appendHistory(deal.id, { type: 'note', title: '案件情報を保存', actor: deal.assignee }, setDeal);
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                保存
              </button>
            </div>
            <div className="h-4" />
          </>
        )}

        {detailTab === 'timeline' && <TimelineTab events={deal.history ?? []} />}
        {detailTab === 'attachments' && <AttachmentsTab deal={deal} onUpdate={(next) => setDeal(next)} />}
        {detailTab === 'process' && isPostOrder && (
          <ProcessTab deal={deal}
            onUpdate={(next) => {
              setDeal(next);
              const LS_KEY = 'coaris_deals_override';
              const overrides = (() => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) as Record<string, Partial<Deal>> : {}; } catch { return {}; } })();
              overrides[next.id] = { ...overrides[next.id], process: next.process };
              localStorage.setItem(LS_KEY, JSON.stringify(overrides));
            }}
            onAppendHistory={(event) => appendHistory(deal.id, event, setDeal)} />
        )}
      </div>

      {modal === 'proposal' && <ProposalEditor deal={deal} onClose={() => setModal(null)} onCreateEstimate={(sl) => { setProposalSlides(sl); setModal('estimate-from-proposal'); }} onAutoAdvance={(_id, s) => handleStageChange(s)} />}
      {modal === 'estimate' && <EstimateEditor deal={deal} onClose={() => setModal(null)} onAutoAdvance={(_id, s) => handleStageChange(s)} />}
      {modal === 'estimate-from-proposal' && <EstimateEditor deal={deal} slides={proposalSlides} onClose={() => setModal(null)} onAutoAdvance={(_id, s) => handleStageChange(s)} />}
      {modal === 'lost' && <LostDealRecord dealId={deal.id} dealName={deal.dealName} existingReason={lostReason} onConfirm={(reason) => { setLostReason(reason); handleStageChange('lost'); setModal(null); }} onCancel={() => setModal(null)} />}
    </>
  );
}
