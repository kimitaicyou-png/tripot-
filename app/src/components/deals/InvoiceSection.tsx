'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Deal, Stage, HistoryEvent } from '@/lib/deals/types';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/deals/constants';
import { logEmailSent } from '@/lib/emailLog';

type InvoiceData = NonNullable<Deal['invoice']>;

function InvoiceProgressBar({ stage }: { stage: Stage }) {
  const steps = [
    { key: 'ordered', label: '受注' },
    { key: 'acceptance', label: '検収' },
    { key: 'invoiced', label: '請求' },
    { key: 'paid', label: '入金済' },
  ];
  const stageOrder: Stage[] = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const currentIdx = stageOrder.indexOf(stage);

  return (
    <div className="flex items-center gap-0 mb-4">
      {steps.map((step, i) => {
        const stepStageIdx = stageOrder.indexOf(step.key as Stage);
        const done = currentIdx >= stepStageIdx;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium mt-0.5 ${done ? 'text-blue-600' : 'text-gray-500'}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mb-3 ${done && currentIdx >= stageOrder.indexOf(steps[i + 1].key as Stage) ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ProductionPhasePanel({ deal, onStageChange }: { deal: Deal; onStageChange: (s: Stage) => void }) {
  const progress = deal.progress ?? 0;
  const completedTasks = Math.round(progress / 10);
  const totalTasks = 10;
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">制作フェーズ</h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STAGE_BADGE[deal.stage]}`}>{STAGE_LABEL[deal.stage]}</span>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">進捗</span>
          <span className="text-xs font-semibold text-gray-900 tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1 tabular-nums">{completedTasks} / {totalTasks} タスク完了</p>
      </div>
      <Link href="/production" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
        📥 制作カードを見る → /production
      </Link>
      {(deal.stage === 'delivered' || deal.stage === 'acceptance') && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-medium text-gray-700">制作完了サマリー</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded p-2"><p className="text-xs text-gray-500">完了タスク</p><p className="text-sm font-semibold text-gray-900 tabular-nums">{completedTasks} / {totalTasks}</p></div>
            <div className="bg-gray-50 rounded p-2"><p className="text-xs text-gray-500">予測粗利率</p><p className="text-sm font-semibold text-gray-900">28%</p></div>
          </div>
          <button onClick={() => setShowInvoiceModal(true)}
            className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">請求書を作成 →</button>
        </div>
      )}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded border border-gray-200 max-w-sm w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">請求書プレビュー</span>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-500 hover:text-gray-900 text-lg leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="text-center mb-4"><h2 className="text-lg font-semibold text-gray-900 tracking-widest">請 求 書</h2></div>
              {[
                ['請求書 No.', `INV-${deal.id}-${today}`],
                ['請求先', deal.clientName],
                ['件名', deal.dealName],
                ['金額', `¥${deal.amount.toLocaleString()}`],
                ['振込先', '三菱UFJ銀行 名古屋支店 普通 1234567 トライポット(カ'],
                ['支払期日', '検収後翌月末'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
                  <span className="text-xs text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={() => setShowInvoiceModal(false)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">キャンセル</button>
              <button onClick={() => { setShowInvoiceModal(false); onStageChange('invoiced'); }} className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">請求書を発行する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function BillingPhasePanel({ deal, onStageChange }: { deal: Deal; onStageChange: (s: Stage) => void }) {
  if (deal.stage === 'invoiced') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded mb-3">
          <div className="px-3 py-2"><p className="text-xs text-gray-500 mb-0.5">請求日</p><p className="text-xs font-semibold text-gray-900">{deal.invoiceDate ?? '—'}</p></div>
          <div className="px-3 py-2"><p className="text-xs text-gray-500 mb-0.5">請求額</p><p className="text-xs font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</p></div>
          <div className="px-3 py-2"><p className="text-xs text-gray-500 mb-0.5">支払期限</p><p className="text-xs font-semibold text-gray-900">{deal.paymentDue ?? '—'}</p></div>
        </div>
        <div className="flex gap-2 mb-2">
          <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 active:scale-[0.98]">Slackで通知</button>
          <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 active:scale-[0.98]">MFクラウド連携</button>
        </div>
        <button onClick={() => onStageChange('accounting')} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors active:scale-[0.98]">経理処理中に変更</button>
      </div>
    );
  }
  if (deal.stage === 'accounting') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200 mb-3"><span className="w-2 h-2 bg-gray-400 rounded-full shrink-0" /><p className="text-sm font-medium text-gray-700">経理処理中</p></div>
        <button onClick={() => onStageChange('paid')} className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">入金確認</button>
      </div>
    );
  }
  if (deal.stage === 'paid') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          <div><p className="text-sm font-semibold text-gray-900">入金確認済み</p>{deal.paidDate && <p className="text-xs text-gray-500">{deal.paidDate}</p>}</div>
        </div>
      </div>
    );
  }
  return null;
}

export function InvoiceSection({ deal, invoice, onInvoiceChange, onStageChange, onAppendHistory }: {
  deal: Deal; invoice: InvoiceData;
  onInvoiceChange: (next: InvoiceData) => void;
  onStageChange: (s: Stage) => void;
  onAppendHistory: (event: Omit<HistoryEvent, 'id' | 'at'>) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [draftText, setDraftText] = useState(invoice.memo ?? '');
  const [generating, setGenerating] = useState(false);

  const buildDraftText = () => {
    const paymentDue = new Date(); paymentDue.setDate(paymentDue.getDate() + 30);
    const dueStr = paymentDue.toISOString().slice(0, 10);
    const amt = deal.amount > 0 ? deal.amount : (deal.monthlyAmount ?? 0);
    const tax = Math.round(amt * 0.1);
    return `請求書\n\n請求先: ${deal.clientName} 御中\n件名: ${deal.dealName}\n\n発行日: ${today}\n支払期限: ${dueStr}（30日以内）\n\n---\n品目: ${deal.dealName}\n金額（税別）: ¥${amt.toLocaleString()}\n消費税（10%）: ¥${tax.toLocaleString()}\n合計（税込）: ¥${(amt + tax).toLocaleString()}\n---\n\n振込先: 三菱UFJ銀行 名古屋支店 普通 1234567 トライポット(カ\n\n何卒よろしくお願いいたします。\n\nトライポット株式会社\n担当: ${deal.assignee}`;
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const text = buildDraftText();
      setDraftText(text);
      onInvoiceChange({ ...invoice, status: 'draft', memo: text, amount: deal.amount > 0 ? deal.amount : (deal.monthlyAmount ?? 0) });
      setGenerating(false);
    }, 1200);
  };

  const handleMarkSent = () => { onInvoiceChange({ ...invoice, status: 'sent', issuedAt: today, memo: draftText }); onStageChange('invoiced'); };
  const handleMarkPaid = () => { onInvoiceChange({ ...invoice, status: 'paid', paidAt: today }); onStageChange('paid'); };

  const handleOpenGmail = () => {
    let to = '';
    try { const raw = localStorage.getItem('coaris_customers'); if (raw) { const arr = JSON.parse(raw) as Array<{ companyName: string; contactEmail: string }>; const hit = arr.find((c) => c.companyName === deal.clientName); if (hit?.contactEmail) to = hit.contactEmail; } } catch {}
    const subject = `【請求書】${deal.dealName}`;
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(draftText)}`;
    logEmailSent({ to, subject, contextType: 'invoice', contextId: deal.id, actor: deal.assignee });
    onAppendHistory({ type: 'invoice_sent', title: `請求書をGmailで送信: ${subject}`, actor: deal.assignee });
    window.open(gmail, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">請求書</p>
      </div>
      <div className="p-5">
        <InvoiceProgressBar stage={deal.stage} />
        {invoice.status === 'none' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">見積書の内容をもとにAIが請求書テキストを生成します。送付後「送付済」にマークしてください。</p>
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
              {generating ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...</span> : 'AIで請求書を作成'}
            </button>
          </div>
        )}
        {invoice.status === 'draft' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1"><span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">下書き</span></div>
            <textarea value={draftText} onChange={(e) => { setDraftText(e.target.value); onInvoiceChange({ ...invoice, memo: e.target.value }); }} rows={12}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={handleOpenGmail} className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all">Gmailで送る</button>
              <button onClick={handleMarkSent} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all">送付済にする</button>
            </div>
          </div>
        )}
        {invoice.status === 'sent' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">請求書送付済み</p>
                {invoice.issuedAt && <p className="text-xs text-gray-500">送付日: {invoice.issuedAt}</p>}
                {invoice.amount && invoice.amount > 0 && <p className="text-xs text-gray-500 tabular-nums">金額: ¥{invoice.amount.toLocaleString()}</p>}
              </div>
            </div>
            <button onClick={handleMarkPaid} className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all">入金確認済みにする</button>
          </div>
        )}
        {invoice.status === 'paid' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">入金済み</p>
                {invoice.paidAt && <p className="text-xs text-gray-500">入金日: {invoice.paidAt}</p>}
                {invoice.amount && invoice.amount > 0 && <p className="text-xs text-gray-700 font-semibold tabular-nums">¥{invoice.amount.toLocaleString()}</p>}
              </div>
            </div>
            <a href="https://biz.moneyforward.com/" target="_blank" rel="noopener noreferrer"
              className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">MFクラウドで詳細を見る →</a>
          </div>
        )}
      </div>
    </div>
  );
}
