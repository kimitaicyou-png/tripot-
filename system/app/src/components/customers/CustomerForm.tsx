'use client';

import { useState } from 'react';
import type { Customer } from '@/lib/stores/types';

type Props = {
  initial?: Partial<Customer>;
  onSave: (customer: Customer) => void;
  onCancel: () => void;
};

export function CustomerForm({ initial, onSave, onCancel }: Props) {
  const [companyName, setCompanyName] = useState(initial?.companyName ?? '');
  const [contactName, setContactName] = useState(initial?.contactName ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [source, setSource] = useState(initial?.source ?? '');

  const handleSubmit = () => {
    if (!companyName.trim()) return;
    onSave({
      id: initial?.id ?? `cust_${Date.now()}`,
      companyName: companyName.trim(),
      contactName: contactName.trim() || undefined,
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      industry: industry.trim() || undefined,
      source: source.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">企業名 *</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="株式会社サンプル" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">担当者名</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="山田 太郎" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">業種</label>
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="製造業" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">メール</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@example.com" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">電話</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="052-000-0000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-700 mb-1 block">流入元</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="紹介 / Web問い合わせ / 展示会 等" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]">キャンセル</button>
        <button type="button" onClick={handleSubmit} disabled={!companyName.trim()} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
      </div>
    </div>
  );
}
