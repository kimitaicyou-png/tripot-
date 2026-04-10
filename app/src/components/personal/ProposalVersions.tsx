'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

type ProposalVersion = {
  id: string;
  version: number;
  title: string;
  sentToClient: boolean;
  sentDate?: string;
  createdAt: string;
  note?: string;
};

const MOCK_VERSIONS: ProposalVersion[] = [
  {
    id: 'pv1',
    version: 1,
    title: 'SaaSプラットフォーム開発 提案書 v1',
    sentToClient: false,
    createdAt: '2026-03-20',
    note: '初稿。技術スタック3案を提示。',
  },
  {
    id: 'pv2',
    version: 2,
    title: 'SaaSプラットフォーム開発 提案書 v2',
    sentToClient: true,
    sentDate: '2026-03-28',
    createdAt: '2026-03-27',
    note: '先方フィードバック反映。コスト削減案を追加。セキュリティ要件を強化。',
  },
  {
    id: 'pv3',
    version: 3,
    title: 'SaaSプラットフォーム開発 提案書 v3',
    sentToClient: true,
    sentDate: '2026-04-04',
    createdAt: '2026-04-03',
    note: 'CTO指摘事項を修正。インフラ構成を詳細化。最終版。',
  },
];

function AddVersionModal({ nextVersion, onClose }: { nextVersion: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">v{nextVersion} を追加</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              タイトル <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              defaultValue={`提案書 v${nextVersion}`}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">変更メモ</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
              placeholder="前バージョンからの変更点"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            追加する
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProposalVersions({ onViewProposal }: { onViewProposal?: (id: string) => void }) {
  const [versions, setVersions] = usePersistedState<ProposalVersion[]>('proposal_versions', MOCK_VERSIONS);
  const [showAddModal, setShowAddModal] = useState(false);

  const latestVersion = versions.reduce((max, v) => (v.version > max ? v.version : max), 0);

  const toggleSent = (id: string) => {
    setVersions((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              sentToClient: !v.sentToClient,
              sentDate: !v.sentToClient ? new Date().toISOString().slice(0, 10) : undefined,
            }
          : v
      )
    );
  };

  return (
    <div>
      {versions.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm font-semibold text-gray-700 mb-1">提案書がありません</p>
          <p className="text-xs text-gray-500 mb-3">最初のバージョンを作成してください</p>
        </div>
      ) : (
        <div className="space-y-2 mb-3">
          {[...versions].reverse().map((v) => {
            const isLatest = v.version === latestVersion;
            return (
              <div
                key={v.id}
                className={`border rounded-lg p-3 ${isLatest ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-500 shrink-0">v{v.version}</span>
                    <span className="text-sm font-semibold text-gray-900 truncate">{v.title}</span>
                    {isLatest && (
                      <span className="text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold shrink-0">最新</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xs text-gray-500">作成: {v.createdAt}</span>
                  {v.sentToClient && v.sentDate && (
                    <span className="text-xs text-gray-500">送付: {v.sentDate}</span>
                  )}
                </div>

                {v.note && <p className="text-xs text-gray-500 mb-2">{v.note}</p>}

                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleSent(v.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
                      v.sentToClient
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {v.sentToClient ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        顧客に送付済み
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                        </svg>
                        未送付
                      </>
                    )}
                  </button>

                  {isLatest && (
                    <button
                      className="text-xs text-blue-600 hover:underline font-semibold"
                      onClick={() => onViewProposal?.(v.id)}
                    >
                      表示 &rarr;
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-2 border border-dashed border-gray-200 rounded text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + v{latestVersion + 1} を追加
      </button>

      {showAddModal && (
        <AddVersionModal nextVersion={latestVersion + 1} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
