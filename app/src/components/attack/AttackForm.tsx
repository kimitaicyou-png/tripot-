'use client';

import { useState } from 'react';
import type { AttackTarget } from '@/lib/stores/attackStore';

type Props = {
  initial?: Partial<AttackTarget>;
  onSave: (target: AttackTarget) => void;
  onCancel: () => void;
};

const STATUS_OPTIONS: { id: AttackTarget['status']; label: string }[] = [
  { id: 'new', label: '新規' },
  { id: 'contacted', label: '接触済' },
  { id: 'meeting', label: '商談中' },
  { id: 'dealt', label: '案件化' },
  { id: 'declined', label: '辞退' },
];

export function AttackForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [position, setPosition] = useState(initial?.position ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [industry, setIndustry] = useState(initial?.industry ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [exchangedDate, setExchangedDate] = useState(initial?.exchangedDate ?? new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [priority, setPriority] = useState(initial?.priority ?? 50);
  const [status, setStatus] = useState<AttackTarget['status']>(initial?.status ?? 'new');

  const handleSubmit = () => {
    if (!name.trim() || !company.trim()) return;
    onSave({
      id: initial?.id ?? `atk_${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      position: position.trim(),
      department: department.trim(),
      industry: industry.trim(),
      email: email.trim(),
      phone: phone.trim(),
      exchangedDate,
      memo: memo.trim(),
      priority,
      status,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">担当者名 *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="山田 太郎" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">企業名 *</label>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="株式会社サンプル" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">役職</label>
          <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="部長" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">部署</label>
          <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="情報システム部" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">業種</label>
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="製造業" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">名刺交換日</label>
          <input type="date" value={exchangedDate} onChange={(e) => setExchangedDate(e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">メール</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="yamada@example.com" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">電話</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="052-000-0000" className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">ステータス</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as AttackTarget['status'])} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white">
            {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">優先度 ({priority})</label>
          <input type="range" min={0} max={100} value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full accent-blue-600" />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 mb-1 block">メモ</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="先方の課題・興味関心..." className="w-full min-h-[60px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y text-gray-900" />
      </div>

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="text-sm px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]">キャンセル</button>
        <button type="button" onClick={handleSubmit} disabled={!name.trim() || !company.trim()} className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed">保存</button>
      </div>
    </div>
  );
}
