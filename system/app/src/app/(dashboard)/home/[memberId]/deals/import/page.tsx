'use client';

import { useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const STAGE_LABELS: Record<string, string> = {
  lead: 'リード', meeting: '商談', proposal: '提案', estimate_sent: '見積提出',
  negotiation: '交渉中', ordered: '受注', in_production: '制作中', delivered: '納品',
  acceptance: '検収', invoiced: '請求済', accounting: '経理処理中', paid: '入金済', lost: '失注',
};

const STAGE_OPTIONS = Object.entries(STAGE_LABELS).map(([value, label]) => ({ value, label }));

type ExtractedDeal = {
  clientName: string;
  dealName: string;
  amount: number;
  stage: string;
  industry: string;
  memo: string;
  revenueType: string;
  monthlyAmount: number;
  assignee: string;
  sourceFile: string;
  selected: boolean;
};

function yen(n: number) {
  return `¥${n.toLocaleString()}`;
}

export default function ImportPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [deals, setDeals] = useState<ExtractedDeal[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [memberName, setMemberName] = useState('');

  useState(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((d) => {
        const me = (d.members ?? []).find((m: { id: string; name: string }) => m.id === memberId);
        if (me) setMemberName(me.name);
      })
      .catch(() => {});
  });

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setExtracting(true);
    setErrors([]);
    const form = new FormData();
    for (const f of Array.from(files)) {
      form.append('files', f);
    }
    form.append('assignee', memberName);

    try {
      const res = await fetch('/api/deals/bulk-extract', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json();
        setErrors([err.error ?? '抽出に失敗しました']);
        setExtracting(false);
        return;
      }
      const data = await res.json();
      const extracted: ExtractedDeal[] = (data.deals ?? []).map((d: Record<string, unknown>) => ({
        clientName: String(d.clientName ?? ''),
        dealName: String(d.dealName ?? ''),
        amount: Number(d.amount) || 0,
        stage: String(d.stage ?? 'lead'),
        industry: String(d.industry ?? 'その他'),
        memo: String(d.memo ?? ''),
        revenueType: String(d.revenueType ?? 'shot'),
        monthlyAmount: Number(d.monthlyAmount) || 0,
        assignee: String(d.assignee ?? memberName),
        sourceFile: String(d.sourceFile ?? ''),
        selected: true,
      }));
      setDeals((prev) => [...prev, ...extracted]);
      if (data.errors?.length > 0) setErrors((prev) => [...prev, ...data.errors]);
    } catch {
      setErrors(['ネットワークエラー']);
    } finally {
      setExtracting(false);
    }
  }, [memberName]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  async function handleSave() {
    const selected = deals.filter((d) => d.selected);
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/deals/bulk-extract', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deals: selected }),
      });
      if (res.ok) {
        const data = await res.json();
        setDone(true);
        setTimeout(() => router.push(`/home/${memberId}/deals`), 1500);
      }
    } catch {} finally {
      setSaving(false);
    }
  }

  const selectedCount = deals.filter((d) => d.selected).length;
  const totalAmount = deals.filter((d) => d.selected).reduce((s, d) => s + d.amount, 0);

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">取込完了</h2>
        <p className="text-sm text-gray-500">{selectedCount}件の案件をDBに保存しました</p>
        <p className="text-sm text-gray-500 mt-1">案件一覧に移動します...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/home/${memberId}/deals`} className="text-sm font-semibold text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg active:scale-[0.98] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          案件一覧
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">過去データ取込</h1>
          <p className="text-xs text-gray-500">なんでもドロップ → AIが読み取り → 案件に自動変換</p>
        </div>
      </div>

      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          dragging ? 'border-blue-500 bg-blue-50' :
          extracting ? 'border-blue-300 bg-blue-50/50' :
          'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !extracting && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.csv,.tsv,.xlsx,.xls,.txt"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
          }}
        />
        {extracting ? (
          <>
            <div className="text-3xl mb-3 animate-pulse">🤖</div>
            <p className="text-sm font-semibold text-blue-600">AIが読み取り中...</p>
            <p className="text-xs text-blue-500 mt-1">請求書・見積書・メモ・CSV を解析しています</p>
          </>
        ) : (
          <>
            <div className="text-3xl mb-3">📎</div>
            <p className="text-sm font-semibold text-gray-700">ファイルをドロップ（複数OK）</p>
            <p className="text-xs text-gray-500 mt-1">請求書PDF / 見積書画像 / CSV / メモ写真 / なんでも</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['📄 PDF', '🖼 画像', '📊 CSV', '📝 テキスト'].map((t) => (
                <span key={t} className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{t}</span>
              ))}
            </div>
          </>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
          {errors.map((e, i) => (
            <p key={i} className="text-xs text-amber-800">⚠ {e}</p>
          ))}
        </div>
      )}

      {deals.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              抽出結果 <span className="text-blue-600">{deals.length}件</span>
              {selectedCount !== deals.length && <span className="text-gray-500 ml-1">（{selectedCount}件選択中）</span>}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeals((prev) => prev.map((d) => ({ ...d, selected: true })))}
                className="text-xs text-blue-600 font-semibold"
              >
                全選択
              </button>
              <button
                onClick={() => setDeals((prev) => prev.map((d) => ({ ...d, selected: false })))}
                className="text-xs text-gray-500 font-semibold"
              >
                全解除
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {deals.map((deal, idx) => (
              <div
                key={idx}
                className={`bg-white border rounded-xl p-4 transition-all ${deal.selected ? 'border-blue-200 shadow-sm' : 'border-gray-200 opacity-60'}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={deal.selected}
                    onChange={() => setDeals((prev) => prev.map((d, i) => i === idx ? { ...d, selected: !d.selected } : d))}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        value={deal.clientName}
                        onChange={(e) => setDeals((prev) => prev.map((d, i) => i === idx ? { ...d, clientName: e.target.value } : d))}
                        className="text-sm font-semibold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none flex-1 min-w-0"
                        placeholder="顧客名"
                      />
                      <select
                        value={deal.stage}
                        onChange={(e) => setDeals((prev) => prev.map((d, i) => i === idx ? { ...d, stage: e.target.value } : d))}
                        className="text-xs font-semibold px-2 py-1 rounded-full border border-gray-200 bg-gray-50"
                      >
                        {STAGE_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <input
                      value={deal.dealName}
                      onChange={(e) => setDeals((prev) => prev.map((d, i) => i === idx ? { ...d, dealName: e.target.value } : d))}
                      className="text-xs text-gray-600 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none w-full mb-1"
                      placeholder="案件名"
                    />
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="font-semibold text-gray-900 tabular-nums">{yen(deal.amount)}</span>
                      <span>{deal.industry}</span>
                      <span className="text-gray-400">← {deal.sourceFile}</span>
                    </div>
                    {deal.memo && <p className="text-xs text-gray-500 mt-1">{deal.memo}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedCount}件 / {yen(totalAmount)}</p>
              <p className="text-xs text-gray-500">担当: {memberName || memberId}</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || selectedCount === 0}
              className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 active:scale-[0.98] transition-all text-sm"
            >
              {saving ? '保存中...' : `${selectedCount}件をDBに取込`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
