'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type MfBilling = {
  id: string;
  title: string;
  partner_name: string;
  billing_date: string;
  due_date: string;
  total_amount: number;
  total_amount_with_tax: number;
  status: string;
  memo: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  sent: '送付済',
  paid: '入金済',
  overdue: '期限超過',
};

export default function MfSettingsPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [invoices, setInvoices] = useState<MfBilling[]>([]);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; total: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/mf/invoices?page=1&per_page=1');
      if (res.ok) {
        setConnected(true);
        loadInvoices();
      } else {
        const data = await res.json();
        setConnected(!data.needsAuth);
      }
    } catch {
      setConnected(false);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/mf/invoices?page=1&per_page=100');
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data ?? []);
      }
    } catch {}
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === invoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((i) => i.id)));
    }
  };

  const handleImport = async () => {
    const selected = invoices.filter((i) => selectedIds.has(i.id));
    if (selected.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch('/api/mf/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billings: selected }),
      });
      const data = await res.json();
      setImportResult(data);
      setSelectedIds(new Set());
    } catch {}
    setImporting(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings?tab=company" className="text-gray-500 hover:text-gray-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <p className="text-sm font-semibold text-gray-900">MFクラウド連携</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">MFクラウド請求書</p>
            <p className="text-xs text-gray-500 mt-0.5">請求書データを案件として取り込む</p>
          </div>
          {connected === true && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">連携中</span>
          )}
        </div>

        {connected === false && (
          <a
            href="/api/mf/authorize"
            className="block w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl text-center hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            MFクラウドと連携する
          </a>
        )}

        {connected === null && (
          <p className="text-sm text-gray-500 text-center py-3">接続確認中...</p>
        )}
      </div>

      {connected && (
        <>
          {importResult && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4">
              <p className="text-sm font-semibold text-emerald-800">
                {importResult.imported}件を案件として取り込みました
                {importResult.skipped > 0 && `（${importResult.skipped}件はスキップ）`}
              </p>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">請求書一覧</p>
                <p className="text-xs text-gray-500 mt-0.5">{invoices.length}件</p>
              </div>
              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all disabled:opacity-40"
                  >
                    {importing ? '取込中...' : `${selectedIds.size}件を案件に取込`}
                  </button>
                )}
                <button
                  onClick={selectAll}
                  className="text-xs font-semibold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-[0.98]"
                >
                  {selectedIds.size === invoices.length ? '全解除' : '全選択'}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center">
                <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-xs text-gray-500 mt-2">読み込み中...</p>
              </div>
            ) : invoices.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-gray-500">請求書データがありません</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {invoices.map((inv) => (
                  <button
                    key={inv.id}
                    onClick={() => toggleSelect(inv.id)}
                    className={`w-full text-left px-5 py-3 flex items-center gap-3 transition-colors ${
                      selectedIds.has(inv.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                      selectedIds.has(inv.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {selectedIds.has(inv.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inv.title || `${inv.partner_name} 請求書`}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-500">{inv.partner_name}</span>
                        <span className="text-xs text-gray-500">{inv.billing_date}</span>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                          inv.status === 'overdue' ? 'bg-red-50 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {STATUS_LABEL[inv.status] ?? inv.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                      ¥{(inv.total_amount_with_tax ?? inv.total_amount ?? 0).toLocaleString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
