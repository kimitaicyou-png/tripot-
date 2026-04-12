'use client';

import { useState } from 'react';
import type { Deal } from '@/lib/deals/types';
import { useMemberNames } from '@/lib/hooks/useMemberNames';

type Props = {
  onClose: () => void;
  onAdd: (deal: Deal) => void;
  existingDeals: Deal[];
};

export function NewDealModal({ onClose, onAdd, existingDeals }: Props) {
  const memberNames = useMemberNames();
  const [clientName, setClientName] = useState('');
  const [dealName, setDealName] = useState('');
  const [industry, setIndustry] = useState('製造業');
  const [amount, setAmount] = useState('');
  const [probability, setProbability] = useState('50');
  const [revenueType, setRevenueType] = useState<'shot' | 'running'>('shot');
  const [assignee, setAssignee] = useState('');
  const [memo, setMemo] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const existingCustomers: { name: string; industry: string }[] = Array.from(
    new Map(existingDeals.map((d) => [d.clientName, { name: d.clientName, industry: d.industry }])).values()
  );

  const suggestions = clientName.trim()
    ? existingCustomers.filter((c) => c.name.toLowerCase().includes(clientName.toLowerCase()))
    : [];

  const isNewCustomer = clientName.trim().length > 0 && !existingCustomers.some((c) => c.name === clientName.trim());

  const handleSelectSuggestion = (customer: { name: string; industry: string }) => {
    setClientName(customer.name);
    setIndustry(customer.industry);
    setShowSuggestions(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="font-semibold text-gray-900">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !dealName.trim()) return;
    const id = `d${Date.now()}`;
    const deal: Deal = {
      id,
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
    };
    onAdd(deal);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">新規案件を追加</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1">クライアント名 <span className="text-red-500">*</span></label>
            <input
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              required
              placeholder="例: 株式会社トヨタ精工"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {suggestions.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(c)}
                      className="w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      {highlightMatch(c.name, clientName)}
                      <span className="ml-2 text-xs text-gray-500">{c.industry}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isNewCustomer && (
              <p className="mt-1 text-xs text-blue-600">新しい顧客として追加されます</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">案件名 <span className="text-red-500">*</span></label>
            <input value={dealName} onChange={(e) => setDealName(e.target.value)} required
              placeholder="例: 生産管理システム開発"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">業種 <span className="text-gray-500 font-normal">（任意）</span></label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              {['製造業', '医療', '金融', '官公庁・教育', '物流', 'IT', '農業', 'その他'].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">案件種別</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="shot" checked={revenueType === 'shot'} onChange={() => setRevenueType('shot')} className="accent-blue-600" />
                <span className="text-sm text-gray-700">スポット案件</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="running" checked={revenueType === 'running'} onChange={() => setRevenueType('running')} className="accent-blue-600" />
                <span className="text-sm text-gray-700">月額継続</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">概算金額（円） <span className="text-gray-500 font-normal">（任意）</span></label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 5000000"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">受注見込み（%） <span className="text-gray-500 font-normal">（任意）</span></label>
            <select value={probability} onChange={(e) => setProbability(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              {['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'].map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">担当者</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              <option value="">選択してください</option>
              {memberNames.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">メモ <span className="text-gray-500 font-normal">（任意）</span></label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
              placeholder="初回ヒアリング内容など"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none" />
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">
            案件を追加
          </button>
        </form>
      </div>
    </div>
  );
}
