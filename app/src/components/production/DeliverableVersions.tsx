'use client';

import { useState } from 'react';

type DeliverableVersion = {
  id: string;
  deliverableName: string;
  version: number;
  status: 'draft' | 'internal_review' | 'client_review' | 'approved' | 'delivered';
  fileUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
  clientDelivered: boolean;
  clientDeliveredAt?: string;
  note?: string;
};

type Props = {
  versions: DeliverableVersion[];
  onChange: (versions: DeliverableVersion[]) => void;
};

const STATUS_LABEL: Record<DeliverableVersion['status'], string> = {
  draft:           '下書き',
  internal_review: '社内レビュー中',
  client_review:   '顧客確認中',
  approved:        '承認済み',
  delivered:       '納品済み',
};

const STATUS_BADGE: Record<DeliverableVersion['status'], string> = {
  draft:           'bg-gray-100 text-gray-600',
  internal_review: 'bg-blue-50 text-blue-600 border border-blue-200',
  client_review:   'bg-blue-100 text-blue-800 border border-blue-300',
  approved:        'bg-gray-100 text-gray-700 border border-gray-300',
  delivered:       'bg-gray-900 text-white',
};

const NEXT_STATUS: Partial<Record<DeliverableVersion['status'], DeliverableVersion['status']>> = {
  draft:           'internal_review',
  internal_review: 'client_review',
  client_review:   'approved',
  approved:        'delivered',
};

const NEXT_STATUS_LABEL: Partial<Record<DeliverableVersion['status'], string>> = {
  draft:           '社内レビューへ',
  internal_review: '顧客確認へ',
  client_review:   '承認済みにする',
  approved:        '納品済みにする',
};

function generateId(): string {
  return `dv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY_DRAFT = {
  deliverableName: '',
  uploadedBy: '',
  note: '',
};

const ALL_NAMES_FROM = (versions: DeliverableVersion[]) =>
  Array.from(new Set(versions.map((v) => v.deliverableName)));

export default function DeliverableVersions({ versions, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().slice(0, 10);

  const deliverableNames = ALL_NAMES_FROM(versions);
  const grouped = deliverableNames.map((name) => ({
    name,
    versions: versions
      .filter((v) => v.deliverableName === name)
      .sort((a, b) => b.version - a.version),
  }));

  const toggleExpand = (name: string) => {
    setExpandedNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleAdd = () => {
    if (!draft.deliverableName || !draft.uploadedBy) return;
    const existingVersions = versions.filter((v) => v.deliverableName === draft.deliverableName);
    const nextVersion = existingVersions.length > 0
      ? Math.max(...existingVersions.map((v) => v.version)) + 1
      : 1;
    onChange([
      ...versions,
      {
        id: generateId(),
        deliverableName: draft.deliverableName,
        version: nextVersion,
        status: 'draft',
        uploadedBy: draft.uploadedBy,
        uploadedAt: today,
        clientDelivered: false,
        note: draft.note || undefined,
      },
    ]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleStatusAdvance = (id: string) => {
    onChange(
      versions.map((v) =>
        v.id === id && NEXT_STATUS[v.status]
          ? {
              ...v,
              status: NEXT_STATUS[v.status]!,
              clientDelivered: NEXT_STATUS[v.status] === 'delivered' ? true : v.clientDelivered,
              clientDeliveredAt:
                NEXT_STATUS[v.status] === 'delivered' ? today : v.clientDeliveredAt,
            }
          : v
      )
    );
  };

  const handleDelete = (id: string) => {
    onChange(versions.filter((v) => v.id !== id));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">納品物バージョン管理</span>
        <span className="text-xs text-gray-500">
          {deliverableNames.length}種 / 計{versions.length}版
        </span>
      </div>

      {grouped.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">納品物はまだありません</p>
      )}

      {grouped.map(({ name, versions: vList }) => {
        const latest = vList[0];
        const isExpanded = expandedNames.has(name);
        return (
          <div key={name} className="border-b border-gray-100 last:border-b-0">
            <div
              className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer"
              onClick={() => toggleExpand(name)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{name}</p>
                  <span className="text-xs text-gray-500">v{latest.version}</span>
                  {latest.clientDelivered && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-900 text-white">
                      顧客納品済み
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[latest.status]}`}>
                    {STATUS_LABEL[latest.status]}
                  </span>
                  <span className="text-xs text-gray-500">{latest.uploadedBy}</span>
                  <span className="text-xs text-gray-500">{latest.uploadedAt.slice(5).replace('-', '/')}</span>
                  {latest.note && (
                    <span className="text-xs text-gray-500 truncate max-w-[200px]">{latest.note}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {NEXT_STATUS[latest.status] && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStatusAdvance(latest.id); }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap"
                  >
                    {NEXT_STATUS_LABEL[latest.status]}
                  </button>
                )}
                <span className="text-xs text-gray-500">{isExpanded ? '▲' : '▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-gray-100 bg-gray-50">
                {vList.map((v) => (
                  <div key={v.id} className="px-6 py-2.5 flex items-center gap-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-100">
                    <div className="w-10 shrink-0">
                      <span className="text-xs font-semibold text-gray-500">v{v.version}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[v.status]}`}>
                          {STATUS_LABEL[v.status]}
                        </span>
                        <span className="text-xs text-gray-500">{v.uploadedBy}</span>
                        <span className="text-xs text-gray-500">{v.uploadedAt.slice(5).replace('-', '/')}</span>
                        {v.clientDeliveredAt && (
                          <span className="text-xs text-gray-500">
                            顧客納品: {v.clientDeliveredAt.slice(5).replace('-', '/')}
                          </span>
                        )}
                        {v.note && (
                          <span className="text-xs text-gray-500 truncate">{v.note}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {NEXT_STATUS[v.status] && (
                        <button
                          type="button"
                          onClick={() => handleStatusAdvance(v.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          {NEXT_STATUS_LABEL[v.status]}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(v.id)}
                        className="text-gray-500 hover:text-red-600 text-lg leading-none"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">納品物名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.deliverableName}
                onChange={(e) => setDraft({ ...draft, deliverableName: e.target.value })}
                placeholder="例: UIデザインカンプ（既存名で入力すると新バージョン追加）"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              {draft.deliverableName && deliverableNames.includes(draft.deliverableName) && (
                <p className="text-xs text-blue-600 mt-0.5">
                  既存納品物に新バージョンを追加します（v{
                    Math.max(...versions.filter((v) => v.deliverableName === draft.deliverableName).map((v) => v.version)) + 1
                  }）
                </p>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">担当者 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.uploadedBy}
                onChange={(e) => setDraft({ ...draft, uploadedBy: e.target.value })}
                placeholder="担当者名"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">備考</label>
            <input
              type="text"
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="例: クライアントフィードバック反映版"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.deliverableName || !draft.uploadedBy}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              版を追加
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}
              className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            + 版を追加
          </button>
        </div>
      )}
    </div>
  );
}

export type { DeliverableVersion };

export const MOCK_DELIVERABLE_VERSIONS: DeliverableVersion[] = [];
