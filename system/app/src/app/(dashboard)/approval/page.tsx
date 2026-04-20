'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import { companies, type Approval, type ApprovalStatus } from '@/lib/mock-data';

function statusBadge(status: ApprovalStatus) {
  const map: Record<ApprovalStatus, { label: string; cls: string }> = {
    reviewing: { label: '審査中', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
    approved: { label: '承認済', cls: 'bg-green-100 text-green-700 border border-green-200' },
    rejected: { label: '差戻し', cls: 'bg-red-100 text-red-700 border border-red-200' },
    pending: { label: '保留', cls: 'bg-yellow-100 text-yellow-700 border border-yellow-200' },
  };
  const { label, cls } = map[status];
  return <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${cls}`}>{label}</span>;
}

function fmtYen(n: number) {
  return `${(n / 10000).toLocaleString('ja-JP')}万円`;
}

const companyMap = Object.fromEntries(companies.map((c) => [c.id, c.shortName]));

type NewApproval = {
  title: string;
  applicant: string;
  companyId: string;
  amount: string;
  purpose: string;
  recoveryPlan: string;
  risk: string;
  approvalCondition: string;
};

const emptyForm: NewApproval = {
  title: '',
  applicant: '',
  companyId: 'deraforce',
  amount: '',
  purpose: '',
  recoveryPlan: '',
  risk: '',
  approvalCondition: '',
};

export default function ApprovalPage() {
  const [approvals, setApprovals] = usePersistedState<Approval[]>('approvals', []);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewApproval>(emptyForm);
  const [formError, setFormError] = useState('');

  const handleAction = (id: string, action: ApprovalStatus) => {
    const labelMap: Record<ApprovalStatus, string> = {
      approved: '承認',
      rejected: '差戻し',
      pending: '保留',
      reviewing: '審査中に戻す',
    };
    const ok = window.confirm(`この起案を「${labelMap[action]}」にしますか？`);
    if (!ok) return;
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: action } : a)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.applicant || !form.amount || !form.purpose) {
      setFormError('件名・起案者・金額・目的は必須です。');
      return;
    }
    const newItem: Approval = {
      id: `apv-${Date.now()}`,
      ...form,
      amount: Number(form.amount.replace(/,/g, '')) * 10000,
      status: 'reviewing',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setApprovals((prev) => [newItem, ...prev]);
    setShowModal(false);
    setForm(emptyForm);
    setFormError('');
  };

  const field = (id: keyof NewApproval, label: string, required = false, type: 'text' | 'number' | 'textarea' | 'select' = 'text') => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          id={id}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
        />
      ) : type === 'select' ? (
        <select
          id={id}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      ) : (
        <input
          id={id}
          type={type}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      )}
    </div>
  );

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">申請</h1>
          <p className="text-xs text-gray-500">{approvals.length}件の申請 ・ 承認は本部が判断します</p>
          <p className="text-xs text-gray-500 mt-1">案件管理・制作管理からの起案を本部に申請します。</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
        >
          + 新規起案
        </button>
      </div>

      <div className="space-y-4">
        {approvals.map((apv) => (
          <div key={apv.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900 leading-snug">{apv.title}</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {apv.createdAt} · {companyMap[apv.companyId] ?? apv.companyId} · {apv.applicant}
                </p>
              </div>
              {statusBadge(apv.status)}
            </div>

            <dl className="grid grid-cols-1 gap-2 text-sm mb-3">
              <div className="flex gap-3">
                <dt className="text-gray-500 w-20 shrink-0">申請金額</dt>
                <dd className="font-semibold text-gray-900">{fmtYen(apv.amount)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">目的</dt>
                <dd className="text-gray-700 text-xs leading-relaxed">{apv.purpose}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">回収見込</dt>
                <dd className="text-gray-700 text-xs leading-relaxed">{apv.recoveryPlan}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">リスク</dt>
                <dd className="text-gray-700 text-xs leading-relaxed">{apv.risk}</dd>
              </div>
              <div>
                <dt className="text-gray-500 mb-0.5">承認条件</dt>
                <dd className="text-gray-700 text-xs leading-relaxed">{apv.approvalCondition}</dd>
              </div>
            </dl>

            {apv.status === 'reviewing' && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">本部の承認待ち</p>
                <button
                  onClick={() => {
                    const ok = window.confirm('この申請を取り下げますか？');
                    if (!ok) return;
                    setApprovals((prev) => prev.filter((a) => a.id !== apv.id));
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-red-600 transition-colors active:scale-[0.98]"
                >
                  申請を取り下げる
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">新規起案</h2>
              <button
                onClick={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}
                className="text-gray-500 hover:text-gray-600 text-xl leading-none"
                aria-label="閉じる"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
              {formError && (
                <div role="alert" aria-live="polite" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              {field('title', '件名', true)}
              {field('applicant', '起案者', true)}
              {field('companyId', '対象会社', true, 'select')}
              {field('amount', '申請金額（万円）', true, 'number')}
              {field('purpose', '目的', true, 'textarea')}
              {field('recoveryPlan', '回収見込', false, 'textarea')}
              {field('risk', 'リスク', false, 'textarea')}
              {field('approvalCondition', '承認条件', false, 'textarea')}
            </form>

            <div className="px-5 py-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSubmit as unknown as React.MouseEventHandler}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                起案する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
