'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { logEmailSent } from '@/lib/emailLog';
import { useRouter } from 'next/navigation';
import { type Deal } from '@/components/deals';
import { loadAllDeals } from '@/lib/dealsStore';
import type { CustomerMaster } from '@/components/personal/PhotoDealCapture';

const ACTIVE_STAGES = new Set([
  'proposal', 'estimate_sent', 'negotiation', 'ordered',
  'in_production', 'delivered', 'acceptance', 'invoiced',
  'accounting', 'paid', 'claim', 'claim_resolved',
]);

const LTV_STAGES = new Set(['paid', 'invoiced', 'accounting']);

const QUALIFYING_STAGES = new Set([
  'proposal', 'estimate_sent', 'negotiation', 'ordered',
  'in_production', 'delivered', 'acceptance', 'invoiced',
  'accounting', 'paid', 'claim', 'claim_resolved',
]);

type DerivedCustomer = {
  id: string;
  name: string;
  industry: string;
  ltv: number;
  activeDeals: number;
  lastContact: string;
  deals: Deal[];
  master: CustomerMaster | null;
};

type Toast = { message: string; type: 'success' | 'error'; link?: { label: string; href: string } };

function useAllDeals(): Deal[] {
  const [extra, setExtra] = useState<Deal[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('coaris_attack_to_deals');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setExtra(parsed as Deal[]);
      }
    } catch {
    }
  }, []);

  const [base] = useState(() => typeof window !== 'undefined' ? loadAllDeals() : []);
  return useMemo(() => [...base, ...extra.filter((d) => !base.some((b) => b.id === d.id))], [base, extra]);
}

function useCustomerMasters(): CustomerMaster[] {
  const [masters, setMasters] = useState<CustomerMaster[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('coaris_customers');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMasters(parsed as CustomerMaster[]);
      }
    } catch {
    }
  }, []);

  return masters;
}

function deriveCustomers(deals: Deal[], masters: CustomerMaster[]): DerivedCustomer[] {
  const map = new Map<string, DerivedCustomer>();

  for (const deal of deals) {
    if (!QUALIFYING_STAGES.has(deal.stage)) continue;

    const existing = map.get(deal.clientName);
    if (!existing) {
      map.set(deal.clientName, {
        id: deal.clientName,
        name: deal.clientName,
        industry: deal.industry,
        ltv: LTV_STAGES.has(deal.stage) ? deal.amount : 0,
        activeDeals: ACTIVE_STAGES.has(deal.stage) && deal.stage !== 'paid' && deal.stage !== 'lost' ? 1 : 0,
        lastContact: deal.lastDate,
        deals: [deal],
        master: null,
      });
    } else {
      existing.deals.push(deal);
      if (LTV_STAGES.has(deal.stage)) existing.ltv += deal.amount;
      if (ACTIVE_STAGES.has(deal.stage) && deal.stage !== 'paid' && deal.stage !== 'lost') {
        existing.activeDeals += 1;
      }
      if (deal.lastDate > existing.lastContact) existing.lastContact = deal.lastDate;
    }
  }

  for (const master of masters) {
    const key = master.companyName;
    const existing = map.get(key);
    if (existing) {
      existing.master = master;
    } else {
      map.set(key, {
        id: `master-${master.id}`,
        name: master.companyName,
        industry: '—',
        ltv: 0,
        activeDeals: 0,
        lastContact: master.updatedAt.slice(0, 10),
        deals: [],
        master,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.ltv - a.ltv || a.name.localeCompare(b.name));
}

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-sm max-w-sm w-[calc(100%-2rem)]">
      <span className="flex-1">{toast.message}</span>
      {toast.link && (
        <button
          onClick={() => router.push(toast.link!.href)}
          className="shrink-0 text-blue-400 font-semibold active:scale-[0.98]"
        >
          {toast.link.label}
        </button>
      )}
      <button onClick={onClose} className="shrink-0 text-gray-500 active:scale-[0.98]">✕</button>
    </div>
  );
}

type DealFormState = { dealName: string; amount: string; memo: string };

function DealCreateModal({
  customer,
  onClose,
  onCreated,
}: {
  customer: DerivedCustomer;
  onClose: () => void;
  onCreated: () => void;
}) {
  const m = customer.master;
  const [form, setForm] = useState<DealFormState>({
    dealName: `${customer.name} 新規案件`,
    amount: '',
    memo: '',
  });

  const handleSubmit = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    const newDeal: Deal = {
      id: `deal-cust-${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clientName: customer.name,
      dealName: form.dealName.trim() || `${customer.name} 新規案件`,
      industry: customer.industry !== '—' ? customer.industry : '',
      stage: 'lead' as Deal['stage'],
      amount: form.amount ? parseInt(form.amount, 10) : 0,
      probability: 20,
      assignee: '柏樹 久美子',
      lastDate: today,
      memo: form.memo,
      revenueType: 'shot',
    };

    try {
      const raw = localStorage.getItem('coaris_attack_to_deals');
      const arr: Deal[] = raw ? JSON.parse(raw) : [];
      arr.push(newDeal);
      localStorage.setItem('coaris_attack_to_deals', JSON.stringify(arr));
    } catch {
    }

    onCreated();
    onClose();
  }, [form, customer, onClose, onCreated]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl p-5 mb-4 mx-4 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-4">案件化する</h3>

        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">案件名 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.dealName}
              onChange={(e) => setForm((p) => ({ ...p, dealName: e.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">受注予定金額（円）</label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              placeholder="例: 500000"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">メモ</label>
            <textarea
              value={form.memo}
              onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
              rows={3}
              placeholder="状況・経緯など"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
            />
          </div>

          {m && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 space-y-0.5">
              <p>担当者: <span className="text-gray-700">{m.contactName || '—'}</span></p>
              {m.contactEmail && <p>メール: <span className="text-gray-700">{m.contactEmail}</span></p>}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm text-gray-600 border border-gray-200 rounded-lg active:scale-[0.98]"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={!form.dealName.trim()}
            className="flex-1 py-2.5 text-sm text-white bg-blue-600 rounded-lg active:scale-[0.98] disabled:opacity-40"
          >
            登録
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerDetail({
  customer,
  onBack,
}: {
  customer: DerivedCustomer;
  onBack: () => void;
}) {
  const m = customer.master;
  const [showDealModal, setShowDealModal] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((t: Toast) => setToast(t), []);

  const phone = m ? (m.contactPhone || m.companyPhone || '') : '';
  const hasEmail = Boolean(m?.contactEmail);
  const hasPhone = Boolean(phone);
  const hasAddress = Boolean(m?.companyAddress);

  const handleGmail = useCallback(() => {
    if (!m?.contactEmail) return;
    const subject = 'ご提案の件';
    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.contactEmail)}&su=${encodeURIComponent(subject)}`;
    logEmailSent({ to: m.contactEmail, subject, contextType: 'customer', contextId: customer.id });
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [m, customer.id]);

  const handleCopyAddress = useCallback(async () => {
    if (!m?.companyAddress) return;
    try {
      await navigator.clipboard.writeText(m.companyAddress);
      showToast({ message: '住所をコピーしました', type: 'success' });
    } catch {
      showToast({ message: 'コピーに失敗しました', type: 'error' });
    }
  }, [m, showToast]);

  const handleDealCreated = useCallback(() => {
    showToast({
      message: '案件を作成しました',
      type: 'success',
      link: { label: '案件管理を開く', href: '/home/kashiwagi/deals' },
    });
  }, [showToast]);

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 font-medium mb-5 inline-flex items-center gap-1">
        &larr; 戻る
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-4">
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-0.5">{customer.industry}</p>
          <h1 className="text-xl font-semibold text-gray-900">{customer.name}</h1>
          <p className="text-xs text-gray-500 mt-0.5">最終接触: {customer.lastContact}</p>
        </div>

        <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded mt-4">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">案件数</p>
            <p className="text-sm font-semibold text-gray-900">{customer.deals.length}件</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">進行中</p>
            <p className="text-sm font-semibold text-gray-900">{customer.activeDeals}件</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">LTV</p>
            <p className="text-sm font-semibold text-blue-600 tabular-nums">¥{(customer.ltv / 10000).toFixed(0)}万</p>
          </div>
        </div>
      </div>

      {m && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setShowDealModal(true)}
            className="col-span-4 flex items-center justify-center gap-1.5 py-2.5 text-sm text-white bg-blue-600 rounded-lg active:scale-[0.98]"
          >
            <span>📋</span> 案件化する
          </button>

          <button
            onClick={handleGmail}
            disabled={!hasEmail}
            className="col-span-1 flex flex-col items-center justify-center gap-1 py-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="text-base">✉️</span>
            <span>Gmail</span>
          </button>

          {hasPhone ? (
            <a
              href={`tel:${phone}`}
              className="col-span-1 flex flex-col items-center justify-center gap-1 py-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg active:scale-[0.98] text-center"
            >
              <span className="text-base">📞</span>
              <span>電話</span>
            </a>
          ) : (
            <button
              disabled
              className="col-span-1 flex flex-col items-center justify-center gap-1 py-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg opacity-40 cursor-not-allowed"
            >
              <span className="text-base">📞</span>
              <span>電話</span>
            </button>
          )}

          <button
            onClick={handleCopyAddress}
            disabled={!hasAddress}
            className="col-span-2 flex items-center justify-center gap-1.5 py-3 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>📍</span> 住所をコピー
          </button>
        </div>
      )}

      {m && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">会社情報</h2>
          <dl className="space-y-2 text-sm">
            {m.contactName && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">担当者</dt>
                <dd className="text-gray-900">
                  {m.contactName}
                  {m.position && <span className="text-gray-500 ml-1">({m.position})</span>}
                  {m.department && <span className="text-gray-500 ml-1">{m.department}</span>}
                </dd>
              </div>
            )}
            {m.contactEmail && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">メール</dt>
                <dd><a href={`mailto:${m.contactEmail}`} className="text-blue-600 underline break-all">{m.contactEmail}</a></dd>
              </div>
            )}
            {m.contactPhone && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">直通</dt>
                <dd className="text-gray-900">{m.contactPhone}</dd>
              </div>
            )}
            {m.companyPhone && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">代表</dt>
                <dd className="text-gray-900">{m.companyPhone}</dd>
              </div>
            )}
            {m.fax && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">FAX</dt>
                <dd className="text-gray-900">{m.fax}</dd>
              </div>
            )}
            {m.companyAddress && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">住所</dt>
                <dd className="text-gray-900">{m.companyAddress}</dd>
              </div>
            )}
            {m.companyWebsite && (
              <div className="flex gap-2">
                <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">Web</dt>
                <dd><a href={m.companyWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{m.companyWebsite}</a></dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {customer.deals.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">関連案件</h2>
          <div className="space-y-1.5">
            {customer.deals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded text-sm">
                <span className="text-gray-700 font-medium">{deal.dealName}</span>
                <span className="text-xs text-gray-500">{deal.stage}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDealModal && (
        <DealCreateModal
          customer={customer}
          onClose={() => setShowDealModal(false)}
          onCreated={handleDealCreated}
        />
      )}

      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function CustomersPage() {
  const allDeals = useAllDeals();
  const masters = useCustomerMasters();
  const customers = useMemo(() => deriveCustomers(allDeals, masters), [allDeals, masters]);
  const [selected, setSelected] = useState<DerivedCustomer | null>(null);
  const [search, setSearch] = useState('');

  if (selected) {
    return <CustomerDetail customer={selected} onBack={() => setSelected(null)} />;
  }

  const filtered = customers.filter((c) => {
    if (search === '') return true;
    return c.name.includes(search) || c.industry.includes(search);
  });

  const totalLtv = customers.reduce((s, c) => s + c.ltv, 0);

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">顧客一覧</h1>
          <p className="text-xs text-gray-500 mt-0.5">{customers.length}社</p>
        </div>
        <button
          onClick={() => {
            const raw = localStorage.getItem('coaris_customers');
            const arr = raw ? JSON.parse(raw) : [];
            const now = new Date().toISOString();
            arr.push({
              id: `cm_demo_${Date.now()}`,
              companyName: '株式会社テスト商事',
              companyAddress: '〒460-0008 愛知県名古屋市中区栄3-1-1 テストビル5F',
              companyPhone: '052-123-4567',
              companyWebsite: 'https://test-shoji.example.com',
              fax: '052-123-4568',
              contactName: '山田 太郎',
              contactEmail: 'yamada@test-shoji.example.com',
              contactPhone: '090-1234-5678',
              department: '営業部',
              position: '部長',
              createdAt: now,
              updatedAt: now,
            });
            localStorage.setItem('coaris_customers', JSON.stringify(arr));
            location.reload();
          }}
          className="text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 active:scale-[0.98]"
        >
          仮データ追加
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">顧客数</p>
          <p className="text-lg font-semibold text-gray-900 tabular-nums">{customers.length}社</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-0.5">LTV合計</p>
          <p className="text-lg font-semibold text-blue-600 tabular-nums">¥{(totalLtv / 10000).toFixed(0)}万</p>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="会社名・業種で検索"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm font-semibold text-gray-700 mb-1">顧客が見つかりません</p>
          <p className="text-xs text-gray-500">検索条件を変更してください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.industry !== '—' ? c.industry : (c.master?.department ?? '')}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {c.master && (
                    <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
                      名刺
                    </span>
                  )}
                  {c.activeDeals > 0 && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      進行中 {c.activeDeals}件
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {c.deals.length > 0 && <span>案件 {c.deals.length}件</span>}
                <span>最終接触 {c.lastContact}</span>
                {c.ltv > 0 && <span className="text-blue-600 font-semibold tabular-nums">LTV ¥{(c.ltv / 10000).toFixed(0)}万</span>}
                {c.master?.contactEmail && <span className="truncate max-w-[120px]">{c.master.contactEmail}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
