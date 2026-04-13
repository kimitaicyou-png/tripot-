'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { type Deal } from '@/components/deals';
import { loadAllDeals, updateDeal, fetchDeals } from '@/lib/dealsStore';

type StageOption = 'no_change' | 'meeting' | 'proposal' | 'negotiation' | 'ordered';

const STAGE_OPTIONS: { value: StageOption; label: string }[] = [
  { value: 'no_change', label: '変更しない' },
  { value: 'meeting', label: 'meeting（商談中）' },
  { value: 'proposal', label: 'proposal（提案済み）' },
  { value: 'negotiation', label: 'negotiation（交渉中）' },
  { value: 'ordered', label: 'ordered（受注）' },
];

type ModalType = 'revenue' | 'meeting' | null;

export function TodayProgressCTA() {
  const router = useRouter();
  const params = useParams();
  const memberId = params?.memberId as string | undefined;

  const [deals, setDeals] = useState<Deal[]>([]);
  const [modal, setModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [selectedDealId, setSelectedDealId] = useState('');
  const [revenueAmount, setRevenueAmount] = useState('');
  const [meetingMemo, setMeetingMemo] = useState('');
  const [meetingStage, setMeetingStage] = useState<StageOption>('no_change');

  useEffect(() => {
    setDeals(loadAllDeals());
    fetchDeals().then((fresh) => setDeals(fresh));
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const activeDeals = deals.filter((d) =>
    ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered'].includes(d.stage)
  );

  const handleRevenueSubmit = async () => {
    const deal = deals.find((d) => d.id === selectedDealId);
    if (!deal) return;
    const amount = parseInt(revenueAmount.replace(/,/g, ''), 10);
    if (isNaN(amount) || amount <= 0) return;
    const patch: Partial<Deal> = {
      stage: 'ordered',
      amount,
      lastDate: new Date().toISOString().slice(0, 10),
    };
    await updateDeal(deal.id, patch);
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, ...patch } : d));
    setModal(null);
    setSelectedDealId('');
    setRevenueAmount('');
    showToast(`「${deal.dealName}」を受注に更新しました`);
  };

  const handleMeetingSubmit = async () => {
    const deal = deals.find((d) => d.id === selectedDealId);
    if (!deal) return;
    const patch: Partial<Deal> = {
      memo: meetingMemo || deal.memo,
      lastDate: new Date().toISOString().slice(0, 10),
      ...(meetingStage !== 'no_change' ? { stage: meetingStage } : {}),
    };
    await updateDeal(deal.id, patch);
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, ...patch } : d));
    setModal(null);
    setSelectedDealId('');
    setMeetingMemo('');
    setMeetingStage('no_change');
    const stageLabel = meetingStage !== 'no_change'
      ? `（ステージ → ${STAGE_OPTIONS.find((o) => o.value === meetingStage)?.label ?? meetingStage}）`
      : '';
    showToast(`「${deal.dealName}」の進捗を記録しました${stageLabel}`);
  };

  const openModal = (type: ModalType) => {
    const fresh = loadAllDeals();
    setDeals(fresh);
    const freshActive = fresh.filter((d) =>
      ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered'].includes(d.stage)
    );
    setSelectedDealId(freshActive[0]?.id ?? '');
    setMeetingStage('no_change');
    setModal(type);
  };

  const closeModal = () => {
    setModal(null);
    setSelectedDealId('');
    setRevenueAmount('');
    setMeetingMemo('');
    setMeetingStage('no_change');
  };

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm">
          {toast}
        </div>
      )}

      <div className="bg-blue-600 rounded-2xl p-5 w-full active:scale-[0.98] transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-blue-200 uppercase tracking-widest">TODAY</p>
            <h2 className="text-lg font-semibold text-white mt-0.5">今日の進捗を入れる</h2>
          </div>
          <span className="text-2xl">📋</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => openModal('revenue')}
            className="flex flex-col items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-[0.98] rounded-xl px-2 py-3 transition-all text-white"
          >
            <span className="text-xl">📈</span>
            <span className="text-xs font-semibold leading-tight text-center">売上を<br />獲得した</span>
          </button>
          <button
            onClick={() => openModal('meeting')}
            className="flex flex-col items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-[0.98] rounded-xl px-2 py-3 transition-all text-white"
          >
            <span className="text-xl">📞</span>
            <span className="text-xs font-semibold leading-tight text-center">商談した</span>
          </button>
          <button
            onClick={() => router.push(memberId ? `/home/${memberId}/deals` : '/deals')}
            className="flex flex-col items-center gap-1.5 bg-white/15 hover:bg-white/25 active:scale-[0.98] rounded-xl px-2 py-3 transition-all text-white"
          >
            <span className="text-xl">✏️</span>
            <span className="text-xs font-semibold leading-tight text-center">案件を<br />更新</span>
          </button>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-40 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {modal === 'revenue' && (
              <>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">📈 売上獲得を記録</h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl leading-none active:scale-[0.98]">×</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label htmlFor="revenue-deal" className="block text-sm font-semibold text-gray-700 mb-1">
                      案件 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="revenue-deal"
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">案件を選択</option>
                      {activeDeals.map((d) => (
                        <option key={d.id} value={d.id}>{d.clientName} — {d.dealName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="revenue-amount" className="block text-sm font-semibold text-gray-700 mb-1">
                      受注金額（円） <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="revenue-amount"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      value={revenueAmount}
                      onChange={(e) => setRevenueAmount(e.target.value)}
                      placeholder="例: 3500000"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {revenueAmount && !isNaN(parseInt(revenueAmount)) && (
                      <p className="text-xs text-gray-500 mt-1">
                        ¥{parseInt(revenueAmount).toLocaleString()}（{Math.round(parseInt(revenueAmount) / 10000)}万円）
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">ステージが「受注」に更新されます。</p>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={handleRevenueSubmit}
                    disabled={!selectedDealId || !revenueAmount}
                    className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    受注として記録する
                  </button>
                </div>
              </>
            )}

            {modal === 'meeting' && (
              <>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-gray-900">📞 商談進捗を記録</h3>
                  <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 text-xl leading-none active:scale-[0.98]">×</button>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <label htmlFor="meeting-deal" className="block text-sm font-semibold text-gray-700 mb-1">
                      案件 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="meeting-deal"
                      value={selectedDealId}
                      onChange={(e) => setSelectedDealId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">案件を選択</option>
                      {activeDeals.map((d) => (
                        <option key={d.id} value={d.id}>{d.clientName} — {d.dealName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="meeting-memo" className="block text-sm font-semibold text-gray-700 mb-1">
                      進捗メモ
                    </label>
                    <textarea
                      id="meeting-memo"
                      value={meetingMemo}
                      onChange={(e) => setMeetingMemo(e.target.value)}
                      rows={3}
                      placeholder="今日の商談で話したこと、次のアクションなど"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
                    <p className="text-sm font-semibold text-gray-700">ステージを進める？</p>
                    {STAGE_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="meeting-stage"
                          value={opt.value}
                          checked={meetingStage === opt.value}
                          onChange={() => setMeetingStage(opt.value)}
                          className="w-4 h-4 accent-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <button
                    onClick={handleMeetingSubmit}
                    disabled={!selectedDealId}
                    className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    記録する
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
