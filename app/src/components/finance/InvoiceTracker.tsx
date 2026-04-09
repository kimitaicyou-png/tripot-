'use client';

import { useState } from 'react';

export type InvoiceStatus = {
  id: string;
  dealName: string;
  clientName: string;
  invoiceNo: string;
  amount: number;
  issuedDate: string;
  sentDate?: string;
  sentMethod?: 'email' | 'postal' | 'slack';
  dueDate: string;
  paidDate?: string;
  status: 'draft' | 'sent' | 'overdue' | 'paid';
  daysOverdue?: number;
};

type Props = {
  invoices: InvoiceStatus[];
  onChange: (invoices: InvoiceStatus[]) => void;
};

const STATUS_CONFIG: Record<InvoiceStatus['status'], { label: string; bg: string; text: string; border: string }> = {
  draft: { label: '未送付', bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  sent: { label: '送付済', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  overdue: { label: '期日超過', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  paid: { label: '入金済', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const SENT_METHOD_LABEL: Record<NonNullable<InvoiceStatus['sentMethod']>, string> = {
  email: 'メール',
  postal: '郵送',
  slack: 'Slack',
};

function formatAmount(n: number): string {
  return `¥${n.toLocaleString()}`;
}

function formatDate(s: string): string {
  const d = new Date(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

type ConfirmDialogProps = {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialog({ message, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-gray-700 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            キャンセル
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            確認
          </button>
        </div>
      </div>
    </div>
  );
}

export function InvoiceTracker({ invoices, onChange }: Props) {
  const [confirm, setConfirm] = useState<{ type: 'send' | 'paid'; id: string } | null>(null);

  const unsent = invoices.filter((inv) => inv.status === 'draft');
  const overdue = invoices.filter((inv) => inv.status === 'overdue');

  const handleMarkSent = (id: string) => {
    onChange(invoices.map((inv) =>
      inv.id === id
        ? { ...inv, status: 'sent' as const, sentDate: new Date().toISOString().slice(0, 10), sentMethod: 'email' }
        : inv
    ));
    setConfirm(null);
  };

  const handleMarkPaid = (id: string) => {
    onChange(invoices.map((inv) =>
      inv.id === id
        ? { ...inv, status: 'paid' as const, paidDate: new Date().toISOString().slice(0, 10) }
        : inv
    ));
    setConfirm(null);
  };

  return (
    <div className="space-y-4">
      {unsent.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-semibold text-amber-700">
              未送付の請求書が {unsent.length} 件あります
            </span>
          </div>
        </div>
      )}

      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-semibold text-red-600">
              支払期日超過が {overdue.length} 件あります
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {overdue.map((inv) => (
              <div key={inv.id} className="text-xs text-red-600">
                {inv.invoiceNo} {inv.clientName} — {inv.daysOverdue}日超過
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">請求番号</th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">顧客 / 案件</th>
              <th className="text-right pb-2 pr-4 text-xs font-semibold text-gray-500">金額</th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">発行日</th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">支払期日</th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">送付方法</th>
              <th className="text-left pb-2 pr-4 text-xs font-semibold text-gray-500">ステータス</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => {
              const cfg = STATUS_CONFIG[inv.status];
              return (
                <tr key={inv.id} className={`${inv.status === 'overdue' ? 'bg-red-50/40' : ''}`}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">{inv.invoiceNo}</td>
                  <td className="py-3 pr-4">
                    <div className="font-semibold text-gray-900 truncate max-w-[180px]">{inv.clientName}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[180px]">{inv.dealName}</div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-gray-900">{formatAmount(inv.amount)}</td>
                  <td className="py-3 pr-4 text-gray-600">{formatDate(inv.issuedDate)}</td>
                  <td className={`py-3 pr-4 font-semibold ${inv.status === 'overdue' ? 'text-red-600' : 'text-gray-600'}`}>
                    {formatDate(inv.dueDate)}
                    {inv.daysOverdue && inv.daysOverdue > 0 && (
                      <span className="ml-1 text-xs text-red-500">({inv.daysOverdue}日超)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 text-xs">
                    {inv.sentMethod ? SENT_METHOD_LABEL[inv.sentMethod] : '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      {inv.status === 'draft' && (
                        <button
                          onClick={() => setConfirm({ type: 'send', id: inv.id })}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap"
                        >
                          送付済にする
                        </button>
                      )}
                      {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <button
                          onClick={() => setConfirm({ type: 'paid', id: inv.id })}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                        >
                          入金確認
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sm:hidden space-y-3">
        {invoices.map((inv) => {
          const cfg = STATUS_CONFIG[inv.status];
          return (
            <div key={inv.id} className={`bg-white border rounded-lg p-4 ${inv.status === 'overdue' ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{inv.clientName}</div>
                  <div className="text-xs text-gray-500">{inv.invoiceNo} · {inv.dealName}</div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded border shrink-0 ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-900">{formatAmount(inv.amount)}</span>
                <span className={`text-xs ${inv.status === 'overdue' ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                  期日: {formatDate(inv.dueDate)}
                  {inv.daysOverdue && inv.daysOverdue > 0 && ` (${inv.daysOverdue}日超)`}
                </span>
              </div>
              <div className="flex gap-2 mt-3">
                {inv.status === 'draft' && (
                  <button
                    onClick={() => setConfirm({ type: 'send', id: inv.id })}
                    className="flex-1 py-2 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    送付済にする
                  </button>
                )}
                {(inv.status === 'sent' || inv.status === 'overdue') && (
                  <button
                    onClick={() => setConfirm({ type: 'paid', id: inv.id })}
                    className="flex-1 py-2 text-xs font-semibold text-emerald-600 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    入金確認
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirm && (
        <ConfirmDialog
          message={
            confirm.type === 'send'
              ? '送付済みとして記録しますか？'
              : '入金を確認しましたか？入金済みとして記録します。'
          }
          onConfirm={() => {
            if (confirm.type === 'send') handleMarkSent(confirm.id);
            else handleMarkPaid(confirm.id);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

export const MOCK_INVOICES: InvoiceStatus[] = [
  {
    id: 'inv1',
    dealName: '山田製作所 DX支援',
    clientName: '株式会社山田製作所',
    invoiceNo: 'INV-0041',
    amount: 800000,
    issuedDate: '2026-03-25',
    dueDate: '2026-04-30',
    status: 'draft',
  },
  {
    id: 'inv2',
    dealName: 'ナゴヤフーズ Lark Base導入',
    clientName: 'ナゴヤフーズ株式会社',
    invoiceNo: 'INV-0039',
    amount: 1800000,
    issuedDate: '2026-03-10',
    sentDate: '2026-03-11',
    sentMethod: 'email',
    dueDate: '2026-03-31',
    status: 'overdue',
    daysOverdue: 5,
  },
  {
    id: 'inv3',
    dealName: '東海商事 業務改善',
    clientName: '東海商事株式会社',
    invoiceNo: 'INV-0037',
    amount: 2500000,
    issuedDate: '2026-02-28',
    sentDate: '2026-03-01',
    sentMethod: 'postal',
    dueDate: '2026-03-31',
    paidDate: '2026-03-28',
    status: 'paid',
  },
  {
    id: 'inv4',
    dealName: 'マルヨシ工業 AI見える化 中間',
    clientName: 'マルヨシ工業株式会社',
    invoiceNo: 'INV-0043',
    amount: 2050000,
    issuedDate: '2026-04-01',
    sentDate: '2026-04-02',
    sentMethod: 'email',
    dueDate: '2026-04-30',
    status: 'sent',
  },
  {
    id: 'inv5',
    dealName: 'セントラル物流 DXロードマップ',
    clientName: 'セントラル物流株式会社',
    invoiceNo: 'INV-0035',
    amount: 450000,
    issuedDate: '2026-02-15',
    dueDate: '2026-03-15',
    status: 'draft',
  },
];
