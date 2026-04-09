'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Deal } from '@/components/personal/DealsContent';
import type { ExtractedDeal } from '@/app/api/deals/extract/route';
import { addDeal as addDealToStore } from '@/lib/dealsStore';
import type { RecentContact } from '@/components/personal/RecentContactsStrip';

type Stage =
  | 'lead'
  | 'meeting'
  | 'proposal'
  | 'estimate_sent'
  | 'negotiation'
  | 'ordered'
  | 'in_production'
  | 'delivered'
  | 'acceptance'
  | 'invoiced'
  | 'accounting'
  | 'paid'
  | 'lost';

const STAGE_OPTIONS: { value: Stage; label: string }[] = [
  { value: 'lead',          label: 'リード' },
  { value: 'meeting',       label: '商談' },
  { value: 'proposal',      label: '提案' },
  { value: 'estimate_sent', label: '見積提出' },
  { value: 'negotiation',   label: '交渉中' },
  { value: 'ordered',       label: '受注' },
  { value: 'in_production', label: '制作中' },
  { value: 'delivered',     label: '納品' },
  { value: 'acceptance',    label: '検収' },
  { value: 'invoiced',      label: '請求済' },
  { value: 'accounting',    label: '経理処理中' },
  { value: 'paid',          label: '入金済' },
  { value: 'lost',          label: '失注' },
];

const STORAGE_KEY = 'coaris_attack_to_deals';
const CONTACTS_KEY = 'coaris_recent_contacts';
const CUSTOMERS_KEY = 'coaris_customers';

export type CustomerMaster = {
  id: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyWebsite: string;
  fax: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  department: string;
  position: string;
  createdAt: string;
  updatedAt: string;
};

function generateId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function saveDeal(deal: Deal): void {
  addDealToStore(deal);
}

function saveContact(contact: RecentContact): boolean {
  try {
    const raw = localStorage.getItem(CONTACTS_KEY);
    const existing: RecentContact[] = raw ? (JSON.parse(raw) as RecentContact[]) : [];
    if (contact.email) {
      const alreadyExists = existing.some(
        (c) => c.email.toLowerCase() === contact.email.toLowerCase()
      );
      if (alreadyExists) return false;
    }
    localStorage.setItem(CONTACTS_KEY, JSON.stringify([contact, ...existing]));
    return true;
  } catch {
    return false;
  }
}

function saveCustomer(customer: CustomerMaster): boolean {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    const existing: CustomerMaster[] = raw ? (JSON.parse(raw) as CustomerMaster[]) : [];

    const matchIndex = existing.findIndex((c) => {
      const nameMatch = c.companyName.trim() === customer.companyName.trim();
      if (!nameMatch) return false;
      if (customer.contactEmail && c.contactEmail) {
        return c.contactEmail.toLowerCase() === customer.contactEmail.toLowerCase();
      }
      return nameMatch;
    });

    if (matchIndex >= 0) {
      existing[matchIndex] = {
        ...existing[matchIndex],
        ...customer,
        id: existing[matchIndex].id,
        createdAt: existing[matchIndex].createdAt,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(existing));
      return false;
    }

    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify([customer, ...existing]));
    return true;
  } catch {
    return false;
  }
}

type FormValues = {
  dealName: string;
  clientName: string;
  contactName: string;
  memo: string;
  amount: string;
  stage: Stage;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyWebsite: string;
  department: string;
  position: string;
  contactEmail: string;
  contactPhone: string;
  fax: string;
};

const EMPTY_FORM: FormValues = {
  dealName: '',
  clientName: '',
  contactName: '',
  memo: '',
  amount: '',
  stage: 'lead',
  companyName: '',
  companyAddress: '',
  companyPhone: '',
  companyWebsite: '',
  department: '',
  position: '',
  contactEmail: '',
  contactPhone: '',
  fax: '',
};

function toStage(s: string | null | undefined): Stage {
  const valid: Stage[] = ['lead', 'meeting', 'proposal', 'negotiation'];
  return valid.includes(s as Stage) ? (s as Stage) : 'lead';
}

type ToastState = { message: string; type: 'success' | 'error' } | null;

type Props = {
  onClose: () => void;
  onSaved: () => void;
};

export default function PhotoDealCapture({ onClose, onSaved }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string>('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [formReady, setFormReady] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const [extractFailed, setExtractFailed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [companyOpen, setCompanyOpen] = useState(true);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const resetToCapture = useCallback(() => {
    setPreviewUrl(null);
    setImageBase64(null);
    setForm(EMPTY_FORM);
    setFormReady(false);
    setFormError('');
    setExtractFailed(false);
    setCompanyOpen(true);
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setMediaType(file.type || 'image/jpeg');
    setFormReady(false);
    setForm(EMPTY_FORM);
    setFormError('');
    setExtractFailed(false);
    setCompanyOpen(true);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setImageBase64(base64 ?? null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!imageBase64) return;
    setLoading(true);
    setFormError('');
    setExtractFailed(false);

    try {
      const res = await fetch('/api/deals/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, mediaType }),
      });

      const json = await res.json() as { data?: ExtractedDeal; error?: string };

      if (!res.ok || json.error) {
        setExtractFailed(true);
        showToast('読み取り失敗。リトライするか手動入力してください', 'error');
        setFormReady(true);
        return;
      }

      const d = json.data!;
      setForm({
        dealName: d.title ?? '',
        clientName: d.customerName ?? d.companyName ?? '',
        contactName: d.contactName ?? '',
        memo: d.memo ?? '',
        amount: d.estimatedAmount != null ? String(d.estimatedAmount) : '',
        stage: toStage(d.stage),
        companyName: d.companyName ?? d.customerName ?? '',
        companyAddress: d.companyAddress ?? '',
        companyPhone: d.companyPhone ?? '',
        companyWebsite: d.companyWebsite ?? '',
        department: d.department ?? '',
        position: d.position ?? '',
        contactEmail: d.contactEmail ?? '',
        contactPhone: d.contactPhone ?? '',
        fax: d.fax ?? '',
      });

      setFormReady(true);
    } catch {
      setExtractFailed(true);
      showToast('読み取り失敗。リトライするか手動入力してください', 'error');
      setFormReady(true);
    } finally {
      setLoading(false);
    }
  }, [imageBase64, mediaType, showToast]);

  const performSave = useCallback((currentForm: FormValues): { contactAdded: boolean; customerAdded: boolean | null } => {
    if (!currentForm.dealName.trim()) { setFormError('案件名は必須です'); return { contactAdded: false, customerAdded: null }; }
    if (!currentForm.clientName.trim()) { setFormError('顧客名は必須です'); return { contactAdded: false, customerAdded: null }; }

    const deal: Deal = {
      id: generateId(),
      dealName: currentForm.dealName.trim(),
      clientName: currentForm.clientName.trim(),
      stage: currentForm.stage,
      amount: Number(currentForm.amount.replace(/[^0-9]/g, '')) || 0,
      probability: 50,
      assignee: '',
      lastDate: new Date().toISOString().slice(0, 10),
      memo: currentForm.memo.trim(),
      revenueType: 'shot',
      industry: 'その他',
    };

    saveDeal(deal);

    let contactAdded = false;
    if (currentForm.contactName || currentForm.clientName) {
      const contact: RecentContact = {
        id: `rc-photo-${Date.now()}`,
        name: currentForm.contactName.trim() || currentForm.clientName.trim(),
        company: currentForm.companyName.trim() || currentForm.clientName.trim(),
        title: currentForm.position.trim(),
        email: currentForm.contactEmail.trim(),
        exchangedAt: new Date().toISOString().slice(0, 10),
      };
      contactAdded = saveContact(contact);
    }

    let customerAdded: boolean | null = null;
    const nameForCustomer = (currentForm.companyName || currentForm.clientName).trim();
    if (nameForCustomer) {
      const customer: CustomerMaster = {
        id: `cust-photo-${Date.now()}`,
        companyName: nameForCustomer,
        companyAddress: currentForm.companyAddress.trim(),
        companyPhone: currentForm.companyPhone.trim(),
        companyWebsite: currentForm.companyWebsite.trim(),
        fax: currentForm.fax.trim(),
        contactName: currentForm.contactName.trim(),
        contactEmail: currentForm.contactEmail.trim(),
        contactPhone: currentForm.contactPhone.trim(),
        department: currentForm.department.trim(),
        position: currentForm.position.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      customerAdded = saveCustomer(customer);
    }

    return { contactAdded, customerAdded };
  }, []);

  const handleSave = useCallback(() => {
    const { contactAdded, customerAdded } = performSave(form);
    if (formError) return;

    const parts = ['案件'];
    if (contactAdded) parts.push('連絡先');
    if (customerAdded !== null) parts.push('顧客');
    showToast(`${parts.join(' + ')} を登録しました`, 'success');
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1200);
  }, [form, performSave, formError, showToast, onSaved, onClose]);

  const handleSaveAndNext = useCallback(() => {
    const { contactAdded, customerAdded } = performSave(form);
    if (formError) return;

    setSessionCount((n) => n + 1);
    onSaved();

    const parts = ['案件'];
    if (contactAdded) parts.push('連絡先');
    if (customerAdded !== null) parts.push('顧客');
    showToast(`${parts.join(' + ')} を登録しました`, 'success');

    resetToCapture();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [form, performSave, formError, onSaved, showToast, resetToCapture]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-sm max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-gray-900">写メで案件登録</p>
            {sessionCount > 0 && (
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                今セッション: {sessionCount}件登録済
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {!previewUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-gray-200 rounded-xl text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors active:scale-[0.98]"
            >
              <div className="text-3xl mb-2">📷</div>
              <p className="text-sm font-semibold text-gray-600">名刺・メモ・スクショを選択</p>
              <p className="text-xs text-gray-500 mt-1">タップしてカメラまたはアルバムを開く</p>
            </button>
          ) : (
            <div className="relative">
              <img
                src={previewUrl}
                alt="選択した画像"
                className="w-full max-h-48 object-contain rounded-xl border border-gray-100 bg-gray-50"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2 px-2.5 py-1 bg-white/90 rounded-lg text-xs font-semibold text-gray-600 shadow-sm hover:bg-white transition-colors active:scale-[0.98]"
              >
                変更
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {previewUrl && !formReady && (
            <button
              onClick={handleExtract}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  読み取り中...
                </span>
              ) : '読み取る'}
            </button>
          )}

          {extractFailed && formReady && (
            <div className="flex gap-2">
              <button
                onClick={handleExtract}
                disabled={loading}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98] disabled:opacity-60"
              >
                もう一度読み取る
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors active:scale-[0.98]"
              >
                別の画像に変える
              </button>
            </div>
          )}

          {formReady && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">抽出結果を確認・編集</p>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  案件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.dealName}
                  onChange={(e) => { setForm((p) => ({ ...p, dealName: e.target.value })); setFormError(''); }}
                  placeholder="例: Webサイトリニューアル"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => { setForm((p) => ({ ...p, clientName: e.target.value })); setFormError(''); }}
                  placeholder="例: 株式会社サンプル"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">担当者名</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
                  placeholder="例: 山田 太郎"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">ステージ</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm((p) => ({ ...p, stage: e.target.value as Stage }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">受注予定金額（円）</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                  placeholder="例: 3500000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">メモ</label>
                <textarea
                  value={form.memo}
                  onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
                  rows={3}
                  placeholder="案件概要・要望など"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500 resize-none"
                />
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCompanyOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors active:scale-[0.98]"
                >
                  <span className="text-xs font-semibold text-gray-700">会社情報（顧客マスタに登録）</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 text-gray-500 transition-transform ${companyOpen ? 'rotate-180' : ''}`}
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {companyOpen && (
                  <div className="px-4 py-3 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">会社名（正式名称）</label>
                      <input
                        type="text"
                        value={form.companyName}
                        onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
                        placeholder="例: 株式会社コアリスホールディングス"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">部署</label>
                        <input
                          type="text"
                          value={form.department}
                          onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}
                          placeholder="例: 営業部"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">役職</label>
                        <input
                          type="text"
                          value={form.position}
                          onChange={(e) => setForm((p) => ({ ...p, position: e.target.value }))}
                          placeholder="例: 部長"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">担当者メール</label>
                      <input
                        type="email"
                        value={form.contactEmail}
                        onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
                        placeholder="例: yamada@example.co.jp"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">担当者直通</label>
                        <input
                          type="tel"
                          value={form.contactPhone}
                          onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
                          placeholder="例: 090-0000-0000"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">代表電話</label>
                        <input
                          type="tel"
                          value={form.companyPhone}
                          onChange={(e) => setForm((p) => ({ ...p, companyPhone: e.target.value }))}
                          placeholder="例: 052-000-0000"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">住所</label>
                      <input
                        type="text"
                        value={form.companyAddress}
                        onChange={(e) => setForm((p) => ({ ...p, companyAddress: e.target.value }))}
                        placeholder="例: 〒460-0007 愛知県名古屋市中区新栄1丁目2-5"
                        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">WebサイトURL</label>
                        <input
                          type="url"
                          value={form.companyWebsite}
                          onChange={(e) => setForm((p) => ({ ...p, companyWebsite: e.target.value }))}
                          placeholder="例: https://example.co.jp"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">FAX</label>
                        <input
                          type="tel"
                          value={form.fax}
                          onChange={(e) => setForm((p) => ({ ...p, fax: e.target.value }))}
                          placeholder="例: 052-000-0001"
                          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-semibold">{formError}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSaveAndNext}
                  className="flex-1 py-3 bg-white border border-blue-200 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50 transition-colors active:scale-[0.98]"
                >
                  登録してもう1枚
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
                >
                  この内容で登録
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm text-white transition-all ${
            toast.type === 'success' ? 'bg-blue-600' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
