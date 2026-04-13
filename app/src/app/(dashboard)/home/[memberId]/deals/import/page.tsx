'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { addDeal as addDealToStore } from '@/lib/dealsStore';
import type { Deal } from '@/components/deals';

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

function generateId(): string {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function loadExisting(): Deal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

async function saveDeals(deals: Deal[]): Promise<void> {
  for (const d of deals) await addDealToStore(d);
}

type FormValues = {
  dealName: string;
  clientName: string;
  stage: Stage;
  amount: string;
  nextAction: string;
};

const EMPTY_FORM: FormValues = {
  dealName: '',
  clientName: '',
  stage: 'lead',
  amount: '',
  nextAction: '',
};

type CsvRow = {
  dealName: string;
  clientName: string;
  stage: Stage;
  amount: number;
  nextAction: string;
};

const CSV_HEADERS = ['案件名', '顧客名', 'ステージ', '受注予定金額', '次回アクション'];

const CSV_TEMPLATE_ROWS = [
  ['SaaS開発支援', '株式会社サンプル', '提案', '3500000', '来週月曜に提案書を送付'],
  ['保守契約更新', '田中商事', '交渉中', '0', '4/15に担当者と電話'],
];

function buildCsvBlob(): Blob {
  const rows = [CSV_HEADERS, ...CSV_TEMPLATE_ROWS];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  return new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const result: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
    const stageLabelMatch = STAGE_OPTIONS.find((s) => s.label === (cols[2] ?? ''));
    const stage: Stage = stageLabelMatch?.value ?? 'lead';
    result.push({
      dealName: cols[0] ?? '',
      clientName: cols[1] ?? '',
      stage,
      amount: Number((cols[3] ?? '').replace(/[^0-9]/g, '')) || 0,
      nextAction: cols[4] ?? '',
    });
  }
  return result.filter((r) => r.dealName !== '' || r.clientName !== '');
}

function formToDeal(v: FormValues): Deal {
  return {
    id: generateId(),
    dealName: v.dealName.trim(),
    clientName: v.clientName.trim(),
    stage: v.stage,
    amount: Number(v.amount.replace(/[^0-9]/g, '')) || 0,
    probability: 50,
    assignee: '',
    lastDate: new Date().toISOString().slice(0, 10),
    memo: v.nextAction.trim(),
    revenueType: 'shot',
    industry: 'その他',
  };
}

function csvRowToDeal(row: CsvRow): Deal {
  return {
    id: generateId(),
    dealName: row.dealName,
    clientName: row.clientName,
    stage: row.stage,
    amount: row.amount,
    probability: 50,
    assignee: '',
    lastDate: new Date().toISOString().slice(0, 10),
    memo: row.nextAction,
    revenueType: 'shot',
    industry: 'その他',
  };
}

type Mode = 'manual' | 'csv';

export default function DealsImportPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;

  const [mode, setMode] = useState<Mode>('manual');

  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [savedCount, setSavedCount] = useState(0);
  const [formError, setFormError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvError, setCsvError] = useState('');
  const [csvImported, setCsvImported] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fieldRefs = useRef<Array<HTMLInputElement | HTMLSelectElement | null>>([]);

  const handleFormChange = useCallback(
    (field: keyof FormValues, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setFormError('');
    },
    []
  );

  const handleSaveAndNext = useCallback(async () => {
    if (!form.dealName.trim()) { setFormError('案件名は必須です'); return; }
    if (!form.clientName.trim()) { setFormError('顧客名は必須です'); return; }
    const deal = formToDeal(form);
    await saveDeals([deal]);
    setSavedCount((n) => n + 1);
    setForm(EMPTY_FORM);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
  }, [form]);

  const handleFieldKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = fieldRefs.current[index + 1];
      if (next) {
        next.focus();
      } else {
        handleSaveAndNext();
      }
    },
    [handleSaveAndNext]
  );

  const handleSaveAndFinish = useCallback(async () => {
    if (!form.dealName.trim() && !form.clientName.trim()) {
      router.push(`/home/${memberId}/deals`);
      return;
    }
    if (!form.dealName.trim()) { setFormError('案件名は必須です'); return; }
    if (!form.clientName.trim()) { setFormError('顧客名は必須です'); return; }
    const deal = formToDeal(form);
    await saveDeals([deal]);
    router.push(`/home/${memberId}/deals`);
  }, [form, memberId, router]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvError('');
    setCsvImported(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setCsvError('有効なデータが見つかりませんでした。テンプレートを確認してください。');
        setCsvRows([]);
      } else {
        setCsvRows(rows);
      }
    };
    reader.readAsText(file, 'utf-8');
  }, []);

  const handleCsvImport = useCallback(async () => {
    const deals = csvRows.map(csvRowToDeal);
    await saveDeals(deals);
    setCsvImported(true);
  }, [csvRows]);

  const handleDownloadTemplate = useCallback(() => {
    const blob = buildCsvBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '案件インポートテンプレート.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-5">
      <div className="flex items-center gap-2 mb-5">
        <Link
          href={`/home/${memberId}/deals`}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← 案件管理に戻る
        </Link>
        <span className="text-gray-500">/</span>
        <p className="text-sm font-semibold text-gray-900">案件インポート</p>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors active:scale-[0.98] ${
            mode === 'manual'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          手動連続入力
        </button>
        <button
          onClick={() => setMode('csv')}
          className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors active:scale-[0.98] ${
            mode === 'csv'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          CSVインポート
        </button>
      </div>

      {mode === 'manual' && (
        <div>
          {savedCount > 0 && (
            <div className={`mb-4 flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${justSaved ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-700'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0 text-blue-600">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <span>
                <span className="font-semibold text-blue-700">{savedCount}件</span>
                {justSaved ? ' 保存しました。続けて入力できます。' : ' 登録済み'}
              </span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">案件 #{savedCount + 1}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  案件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  ref={(el) => { fieldRefs.current[0] = el; }}
                  value={form.dealName}
                  onChange={(e) => handleFormChange('dealName', e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 0)}
                  placeholder="例: ECサイト開発"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  顧客名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  ref={(el) => { fieldRefs.current[1] = el; }}
                  value={form.clientName}
                  onChange={(e) => handleFormChange('clientName', e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 1)}
                  placeholder="例: 株式会社サンプル"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  ステージ <span className="text-red-500">*</span>
                </label>
                <select
                  ref={(el) => { fieldRefs.current[2] = el; }}
                  value={form.stage}
                  onChange={(e) => handleFormChange('stage', e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 2)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {STAGE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  受注予定金額（円）
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  ref={(el) => { fieldRefs.current[3] = el; }}
                  value={form.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 3)}
                  placeholder="例: 3500000"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  次回アクション
                </label>
                <input
                  type="text"
                  ref={(el) => { fieldRefs.current[4] = el; }}
                  value={form.nextAction}
                  onChange={(e) => handleFormChange('nextAction', e.target.value)}
                  onKeyDown={(e) => handleFieldKeyDown(e, 4)}
                  placeholder="例: 来週月曜に提案書を送付"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-semibold">{formError}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSaveAndNext}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
            >
              保存して次へ
            </button>
            <button
              onClick={handleSaveAndFinish}
              className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors active:scale-[0.98]"
            >
              {form.dealName.trim() || form.clientName.trim() ? '保存して完了' : '完了（登録なし）'}
            </button>
          </div>
        </div>
      )}

      {mode === 'csv' && (
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">CSVファイルを選択</p>
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors active:scale-[0.98]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                </svg>
                テンプレートDL
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-3">
              列順: 案件名 / 顧客名 / ステージ / 受注予定金額 / 次回アクション
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-gray-200 rounded-lg text-center hover:border-blue-300 hover:bg-blue-50/30 transition-colors active:scale-[0.98]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-gray-500 mx-auto mb-2">
                <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <p className="text-sm font-semibold text-gray-500">
                {csvFileName ? csvFileName : 'CSVファイルを選択'}
              </p>
              <p className="text-xs text-gray-500 mt-1">クリックしてファイルを選択</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />

            {csvError && (
              <p className="text-xs text-red-600 font-semibold mt-2">{csvError}</p>
            )}
          </div>

          {csvRows.length > 0 && !csvImported && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">{csvRows.length}件のデータが見つかりました</p>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500">#</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500">案件名</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500">顧客名</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500">ステージ</th>
                        <th className="px-3 py-2.5 text-right font-semibold text-gray-500">金額</th>
                        <th className="px-3 py-2.5 text-left font-semibold text-gray-500">次回アクション</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {csvRows.map((row, i) => {
                        const stageLabel = STAGE_OPTIONS.find((s) => s.value === row.stage)?.label ?? row.stage;
                        return (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2.5 text-gray-500 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-2.5 font-semibold text-gray-900 max-w-[120px] truncate">{row.dealName || <span className="text-red-500">未入力</span>}</td>
                            <td className="px-3 py-2.5 text-gray-600 max-w-[100px] truncate">{row.clientName || <span className="text-gray-500">-</span>}</td>
                            <td className="px-3 py-2.5 text-gray-600">{stageLabel}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                              {row.amount > 0 ? `¥${(row.amount / 10000).toFixed(0)}万` : '-'}
                            </td>
                            <td className="px-3 py-2.5 text-gray-500 max-w-[150px] truncate">{row.nextAction || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                onClick={handleCsvImport}
                className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
              >
                全{csvRows.length}件を登録
              </button>
            </div>
          )}

          {csvImported && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-blue-600 mx-auto mb-3">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              <p className="text-sm font-semibold text-gray-900 mb-1">{csvRows.length}件の案件を登録しました</p>
              <p className="text-xs text-gray-500 mb-4">案件管理画面で確認できます</p>
              <Link
                href={`/home/${memberId}/deals`}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
              >
                案件管理を開く
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
