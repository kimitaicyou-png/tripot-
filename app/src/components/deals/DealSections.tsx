'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import type { Deal, Attachment, AttachmentKind, HistoryEvent } from '@/lib/deals/types';
import { HISTORY_TYPE_CONFIG, KIND_ICON, KIND_LABEL, COMM_TYPE_LABEL } from '@/lib/deals/constants';
import { MOCK_COMMS, MOCK_CLAIMS } from '@/lib/deals/mockData';
import { loadAttachments, saveAttachments } from '@/lib/deals/dealOverrides';
import { detectKind, getHostLabel } from '@/lib/deals/attachmentUtils';
import { MOCK_ARTIFACTS, MOCK_GROSS_MARGIN_RATES } from '@/components/personal/DealArtifacts';
import ContractManager from '@/components/personal/ContractManager';
import ProposalVersions from '@/components/personal/ProposalVersions';
import { InternalComments, MOCK_COMMENTS } from '@/components/personal/InternalComments';

export function NeedsSection({ deal }: { deal: Deal }) {
  const comms = MOCK_COMMS[deal.id] ?? [];
  const allNeeds = comms.flatMap((c) => c.needs ?? []);
  if (allNeeds.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">🎯</span>
        <p className="text-sm font-semibold text-gray-900">ニーズ（自動抽出）</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-3">
        {comms.filter((c) => c.needs && c.needs.length > 0).map((c) => (
          <div key={c.id}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">{c.date} · {COMM_TYPE_LABEL[c.type]}</p>
            <div className="flex flex-wrap gap-1.5">
              {(c.needs ?? []).map((need, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <span className="text-red-400 font-semibold">{i + 1}</span>
                  {need}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentsSection({ deal, onOpenProposal, onOpenEstimate }: {
  deal: Deal;
  onOpenProposal: () => void;
  onOpenEstimate: () => void;
}) {
  const artifacts = MOCK_ARTIFACTS[deal.id] ?? { proposal: false, estimate: false, budget: false, requirement: false, schedule: false };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📄</span>
        <p className="text-sm font-semibold text-gray-900">ドキュメント</p>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onOpenProposal}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium active:scale-[0.98] transition-all duration-200">
            提案書を作成 →
          </button>
          <button
            onClick={onOpenEstimate}
            title="金額が未設定でもAIが推定します"
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium active:scale-[0.98] transition-all duration-200">
            見積書を作成 →
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            {([
              ['提案書', artifacts.proposal],
              ['見積書', artifacts.estimate],
              ['予算計画', artifacts.budget],
              ['要件定義', artifacts.requirement],
              ['スケジュール', artifacts.schedule],
            ] as const).map(([label, done]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${done ? 'text-gray-700' : 'text-gray-500'}`}>
                  {done ? '✓' : '○'}
                </span>
                <span className={`text-xs ${done ? 'text-gray-700' : 'text-gray-500'}`}>{label}</span>
              </div>
            ))}
          </div>
          {MOCK_GROSS_MARGIN_RATES[deal.id] !== undefined && (
            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              予測粗利率: <span className="font-semibold text-gray-700">{MOCK_GROSS_MARGIN_RATES[deal.id]}%</span>
            </p>
          )}
        </div>
        <div className="mt-1">
          <ProposalVersions />
        </div>
      </div>
    </div>
  );
}

export function ContractSection({ deal, onContractStatusChange }: {
  deal: Deal;
  onContractStatusChange?: (contractName: string, status: string) => void;
}) {
  const artifacts = MOCK_ARTIFACTS[deal.id];
  const hasProposal = artifacts?.proposal ?? false;
  const hasEstimate = artifacts?.estimate ?? false;
  const isFirstDeal = !['d4', 'd5', 'd9'].includes(deal.id);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📋</span>
        <p className="text-sm font-semibold text-gray-900">契約</p>
      </div>
      <ContractManager
        dealStage={deal.stage}
        isFirstDeal={isFirstDeal}
        hasProposal={hasProposal}
        hasEstimate={hasEstimate}
        clientName={deal.clientName}
        dealName={deal.dealName}
        dealAmount={deal.amount}
        onStatusChange={onContractStatusChange}
      />
    </div>
  );
}

export function ClaimInlineSection({ deal }: { deal: Deal }) {
  const claims = MOCK_CLAIMS[deal.id] ?? [];
  if (claims.length === 0) return null;

  const severityBadge = (s: 'minor' | 'major' | 'critical') => {
    if (s === 'critical') return 'text-red-600 bg-red-50 border border-red-200';
    if (s === 'major') return 'text-blue-600 bg-blue-50 border border-blue-200';
    return 'text-gray-500 bg-gray-100 border border-gray-200';
  };
  const severityLabel = (s: 'minor' | 'major' | 'critical') => {
    if (s === 'critical') return '重大';
    if (s === 'major') return '重要';
    return '軽微';
  };
  const statusDot = (s: 'open' | 'in_progress' | 'resolved') => {
    if (s === 'open') return 'bg-red-500';
    if (s === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-400';
  };
  const statusLabel = (s: 'open' | 'in_progress' | 'resolved') => {
    if (s === 'open') return '未対応';
    if (s === 'in_progress') return '対応中';
    return '解決済';
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">⚠</span>
        <p className="text-sm font-semibold text-gray-900">クレーム</p>
      </div>
      <div className="space-y-2 mb-3">
        {claims.map((c) => (
          <div key={c.id} className="bg-red-50 rounded-xl p-3.5 border border-red-100">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${severityBadge(c.severity)}`}>{severityLabel(c.severity)}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot(c.status)}`} />
                {statusLabel(c.status)}
              </span>
              <span className="text-xs text-gray-500 ml-auto">{c.date}</span>
            </div>
            <p className="text-sm text-gray-900 leading-relaxed">{c.content}</p>
            {c.response && (
              <p className="text-xs text-gray-500 mt-1.5 border-l-2 border-red-200 pl-2">{c.response}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">担当: {c.assignee}</p>
          </div>
        ))}
      </div>
      <button className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-500 active:scale-[0.98] transition-all duration-200">
        + クレームを記録
      </button>
    </div>
  );
}

export function InternalMemoSection({ deal }: { deal: Deal }) {
  const [internalComments, setInternalComments] = usePersistedState('internal_comments', MOCK_COMMENTS);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📝</span>
        <p className="text-sm font-semibold text-gray-900">社内メモ</p>
      </div>
      <InternalComments
        comments={internalComments}
        onChange={setInternalComments}
        currentUser=""
      />
    </div>
  );
}

export function CollapsibleSalesArchive({ deal, onOpenProposal, onOpenEstimate, onContractStatusChange }: {
  deal: Deal;
  onOpenProposal: () => void;
  onOpenEstimate: () => void;
  onContractStatusChange?: (contractName: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📁</span>
          <p className="text-sm font-semibold text-gray-900">ドキュメント・契約</p>
        </div>
        <span className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
          <DocumentsSection
            deal={deal}
            onOpenProposal={onOpenProposal}
            onOpenEstimate={onOpenEstimate}
          />
          <div className="border-t border-gray-100 pt-4">
            <ContractSection deal={deal} onContractStatusChange={onContractStatusChange} />
          </div>
        </div>
      )}
    </div>
  );
}

export function TimelineTab({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-sm text-gray-500">まだ履歴がありません</p>
        <p className="text-xs text-gray-500 mt-1">ステージ変更や契約操作が自動的に記録されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const cfg = HISTORY_TYPE_CONFIG[ev.type] ?? { icon: '•', color: 'bg-gray-50 border-gray-200' };
        const dateStr = new Date(ev.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div key={ev.id} className={`bg-white rounded-xl border p-3.5 flex items-start gap-3 ${cfg.color}`}>
            <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.title}</p>
              {ev.description && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{ev.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 tabular-nums">{dateStr}</span>
                {ev.actor && <span className="text-xs text-gray-500">· {ev.actor}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AttachmentsTab({ deal, onUpdate }: { deal: Deal; onUpdate: (next: Deal) => void }) {
  const [items, setItems] = useState<Attachment[]>(() => {
    const fromDeal = deal.attachments ?? [];
    const fromLS = loadAttachments(deal.id);
    const merged = [...fromLS];
    fromDeal.forEach((a) => { if (!merged.find((m) => m.id === a.id)) merged.push(a); });
    return merged;
  });
  const [showForm, setShowForm] = useState(false);
  const [presetKind, setPresetKind] = useState<AttachmentKind | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [kindInput, setKindInput] = useState<AttachmentKind>('link');

  const openForm = (preset?: AttachmentKind) => {
    setPresetKind(preset ?? null);
    setKindInput(preset ?? 'link');
    setUrlInput('');
    setTitleInput('');
    setShowForm(true);
  };

  const handleUrlChange = (v: string) => {
    setUrlInput(v);
    if (!presetKind) setKindInput(detectKind(v));
  };

  const handleAdd = () => {
    if (!urlInput.trim()) return;
    const newItem: Attachment = {
      id: `att_${Date.now()}`,
      kind: kindInput,
      title: titleInput.trim() || getHostLabel(urlInput),
      url: urlInput.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const next = [newItem, ...items];
    setItems(next);
    saveAttachments(deal.id, next);
    onUpdate({ ...deal, attachments: next });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = items.filter((a) => a.id !== id);
    setItems(next);
    saveAttachments(deal.id, next);
    onUpdate({ ...deal, attachments: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => openForm('figma')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm">
          📐 Figmaを追加
        </button>
        <button
          onClick={() => openForm('google_doc')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm">
          📄 Google Docsを追加
        </button>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm ml-auto">
          + リンクを追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL（必須）</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">タイトル（省略可）</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="デザインカンプ v2"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">種類</label>
            <select
              value={kindInput}
              onChange={(e) => setKindInput(e.target.value as AttachmentKind)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              {(Object.keys(KIND_LABEL) as AttachmentKind[]).map((k) => (
                <option key={k} value={k}>{KIND_ICON[k]} {KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] transition-all">
              追加
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">まだ添付がありません。</p>
          <p className="text-xs text-gray-500 mt-1">Figma や Google Docs のリンクを貼れます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-xl shrink-0">{KIND_ICON[a.kind]}</span>
              <button
                onClick={() => window.open(a.url, '_blank', 'noopener,noreferrer')}
                className="flex-1 min-w-0 text-left active:scale-[0.98] transition-all">
                <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-500 truncate">{getHostLabel(a.url)} · {a.addedAt}</p>
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="shrink-0 p-1.5 text-gray-500 hover:text-red-500 active:scale-[0.98] transition-all rounded-lg hover:bg-red-50">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
