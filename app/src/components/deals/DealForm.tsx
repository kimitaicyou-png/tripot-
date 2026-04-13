'use client';

import { useState } from 'react';
import type { Deal } from '@/lib/stores/types';
import { useMemberNames } from '@/lib/hooks/useMemberNames';

type Props = {
  onSubmit: (deal: Deal) => void;
  onClose: () => void;
};

const INDUSTRIES = ['IT', '製造業', '医療', '教育', '金融', '物流', '農業', '福祉', '建設', '食品', '商社', '不動産', '官公庁・教育', 'その他'];

export function DealForm({ onSubmit, onClose }: Props) {
  const memberNames = useMemberNames();
  const [clientName, setClientName] = useState('');
  const [dealName, setDealName] = useState('');
  const [industry, setIndustry] = useState('IT');
  const [amount, setAmount] = useState('');
  const [probability, setProbability] = useState('50');
  const [assignee, setAssignee] = useState('');
  const [revenueType, setRevenueType] = useState<'shot' | 'running' | 'both'>('shot');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !dealName.trim()) return;
    onSubmit({
      id: `d${Date.now()}`,
      clientName: clientName.trim(),
      dealName: dealName.trim(),
      industry,
      stage: 'lead',
      amount: Number(amount) || 0,
      probability: Number(probability) || 50,
      assignee,
      lastDate: new Date().toISOString().slice(0, 10),
      memo,
      revenueType,
      ...(revenueType === 'running' || revenueType === 'both' ? { monthlyAmount: Number(monthlyAmount) || 0 } : {}),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full my-8 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">新規案件を追加</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none active:scale-[0.98]">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">クライアント名 <span className="text-red-500">*</span></label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="例: 株式会社トヨタ精工" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">案件名 <span className="text-red-500">*</span></label>
            <input value={dealName} onChange={(e) => setDealName(e.target.value)} required placeholder="例: コーポレートサイトリニューアル" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">業界</label>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">売上種別</label>
              <select value={revenueType} onChange={(e) => setRevenueType(e.target.value as 'shot' | 'running' | 'both')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                <option value="shot">単発</option>
                <option value="running">月額</option>
                <option value="both">スポット+継続</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{revenueType === 'both' ? 'スポット金額（円）' : '金額（円）'}</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">確度（%）</label>
              <input type="number" value={probability} onChange={(e) => setProbability(e.target.value)} min="0" max="100" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          {(revenueType === 'running' || revenueType === 'both') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">月額金額（円）</label>
            <input type="number" value={monthlyAmount} onChange={(e) => setMonthlyAmount(e.target.value)} placeholder="例: 100000" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">担当者</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
              <option value="">選択してください</option>
              {memberNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">メモ</label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} placeholder="初回ヒアリング内容など" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all duration-150">
            案件を追加
          </button>
        </form>
      </div>
    </div>
  );
}
