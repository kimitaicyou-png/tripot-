'use client';

import { useState } from 'react';

type BugReport = {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
  reporter: string;
  assignee: string;
  projectName: string;
  createdAt: string;
  resolvedAt?: string;
};

type Props = {
  bugs: BugReport[];
  onChange: (bugs: BugReport[]) => void;
};

const SEVERITY_LABEL: Record<BugReport['severity'], string> = {
  critical: 'クリティカル',
  major:    '重大',
  minor:    '軽微',
  trivial:  '些細',
};

const SEVERITY_BADGE: Record<BugReport['severity'], string> = {
  critical: 'bg-red-50 text-red-600 border border-red-200',
  major:    'bg-blue-50 text-blue-600 border border-blue-200',
  minor:    'bg-gray-100 text-gray-500',
  trivial:  'bg-gray-50 text-gray-500',
};

const SEVERITY_DOT: Record<BugReport['severity'], string> = {
  critical: 'bg-red-600',
  major:    'bg-blue-600',
  minor:    'bg-gray-500',
  trivial:  'bg-gray-400',
};

const STATUS_LABEL: Record<BugReport['status'], string> = {
  open:        '未対応',
  in_progress: '対応中',
  resolved:    '解決済み',
  closed:      'クローズ',
  wont_fix:    '対応しない',
};

const STATUS_BADGE: Record<BugReport['status'], string> = {
  open:        'bg-red-50 text-red-600 border border-red-200',
  in_progress: 'bg-blue-50 text-blue-600 border border-blue-200',
  resolved:    'bg-gray-100 text-gray-700',
  closed:      'bg-gray-900 text-white',
  wont_fix:    'bg-gray-100 text-gray-500',
};

function generateId(): string {
  return `bug_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

const EMPTY_DRAFT = {
  title: '',
  description: '',
  severity: 'minor' as BugReport['severity'],
  reporter: '',
  assignee: '',
  projectName: '',
};

const ALL_STATUSES: BugReport['status'][] = ['open', 'in_progress', 'resolved', 'closed', 'wont_fix'];

export default function BugTracker({ bugs, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [filterStatus, setFilterStatus] = useState<BugReport['status'] | 'all'>('all');

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const openCount = bugs.filter((b) => b.status === 'open' || b.status === 'in_progress').length;
  const resolvedThisWeek = bugs.filter(
    (b) => b.resolvedAt && b.resolvedAt >= weekAgo && (b.status === 'resolved' || b.status === 'closed')
  ).length;
  const resolvedBugs = bugs.filter((b) => b.resolvedAt);
  const avgDays =
    resolvedBugs.length > 0
      ? Math.round(
          resolvedBugs.reduce((s, b) => s + daysBetween(b.createdAt, b.resolvedAt!), 0) /
            resolvedBugs.length
        )
      : null;

  const filtered = filterStatus === 'all' ? bugs : bugs.filter((b) => b.status === filterStatus);

  const handleAdd = () => {
    if (!draft.title || !draft.projectName) return;
    onChange([
      ...bugs,
      {
        id: generateId(),
        ...draft,
        status: 'open',
        createdAt: today,
      },
    ]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleStatusChange = (id: string, status: BugReport['status']) => {
    onChange(
      bugs.map((b) =>
        b.id === id
          ? {
              ...b,
              status,
              resolvedAt:
                (status === 'resolved' || status === 'closed') && !b.resolvedAt ? today : b.resolvedAt,
            }
          : b
      )
    );
  };

  const handleDelete = (id: string) => {
    onChange(bugs.filter((b) => b.id !== id));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">バグ・修正依頼</span>
          <span className="text-xs text-gray-500">{bugs.length}件</span>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500">未解決</p>
            <p className="text-sm font-semibold text-red-600 tabular-nums">{openCount}件</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">今週解決</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">{resolvedThisWeek}件</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">平均対応日数</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              {avgDays !== null ? `${avgDays}日` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-2 border-b border-gray-100 flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilterStatus('all')}
          className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
            filterStatus === 'all'
              ? 'bg-gray-900 text-white'
              : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
          }`}
        >
          すべて ({bugs.length})
        </button>
        {ALL_STATUSES.map((s) => {
          const count = bugs.filter((b) => b.status === s).length;
          if (count === 0) return null;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${
                filterStatus === s
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">該当するバグはありません</p>
      )}

      {filtered.length > 0 && (
        <div className="divide-y divide-gray-100">
          {filtered.map((b) => (
            <div key={b.id} className="px-4 py-3 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[b.severity]}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${SEVERITY_BADGE[b.severity]}`}>
                      {SEVERITY_LABEL[b.severity]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{b.description}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{b.projectName}</span>
                    <span className="text-xs text-gray-500">報告: {b.reporter}</span>
                    {b.assignee && <span className="text-xs text-gray-500">担当: {b.assignee}</span>}
                    <span className="text-xs text-gray-500">{b.createdAt.slice(5).replace('-', '/')}</span>
                    {b.resolvedAt && (
                      <span className="text-xs text-gray-500">
                        解決: {b.resolvedAt.slice(5).replace('-', '/')}
                        （{daysBetween(b.createdAt, b.resolvedAt)}日）
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={b.status}
                    onChange={(e) => handleStatusChange(b.id, e.target.value as BugReport['status'])}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[b.status]}`}>
                    {STATUS_LABEL[b.status]}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDelete(b.id)}
                    className="text-gray-500 hover:text-red-600 text-lg leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">タイトル <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="例: ログインボタンが押せない"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-0.5">重要度</label>
              <select
                value={draft.severity}
                onChange={(e) => setDraft({ ...draft, severity: e.target.value as BugReport['severity'] })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="critical">クリティカル</option>
                <option value="major">重大</option>
                <option value="minor">軽微</option>
                <option value="trivial">些細</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">詳細説明</label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="再現手順・期待値・実際の挙動など"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">案件名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.projectName}
                onChange={(e) => setDraft({ ...draft, projectName: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">報告者</label>
              <input
                type="text"
                value={draft.reporter}
                onChange={(e) => setDraft({ ...draft, reporter: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">担当者</label>
              <input
                type="text"
                value={draft.assignee}
                onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.title || !draft.projectName}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              報告を追加
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
            + バグ・修正依頼を報告
          </button>
        </div>
      )}
    </div>
  );
}

export type { BugReport };

export const MOCK_BUG_REPORTS: BugReport[] = [
  {
    id: 'bug1',
    title: 'ログイン後にセッションが即切れる',
    description: 'Chrome最新版でログインするとすぐにセッションがタイムアウトする',
    severity: 'critical',
    status: 'in_progress',
    reporter: '柏樹 久美子',
    assignee: '犬飼 智之',
    projectName: '基幹システム開発',
    createdAt: '2026-04-03',
  },
  {
    id: 'bug2',
    title: '検索結果が50件以上で表示崩れ',
    description: '検索結果が50件を超えるとテーブルのレイアウトが崩れる',
    severity: 'major',
    status: 'open',
    reporter: '和泉 阿委璃',
    assignee: '犬飼 智之',
    projectName: '基幹システム開発',
    createdAt: '2026-04-04',
  },
  {
    id: 'bug3',
    title: 'スマホでボタンが小さすぎる',
    description: 'iPhone SEで操作ボタンが小さく押しにくい',
    severity: 'minor',
    status: 'open',
    reporter: '小野 崇',
    assignee: '',
    projectName: 'ECサイトリニューアル',
    createdAt: '2026-04-05',
  },
  {
    id: 'bug4',
    title: 'フッターのコピーライト年が古い',
    description: '2025年のまま更新されていない',
    severity: 'trivial',
    status: 'resolved',
    reporter: '柏樹 久美子',
    assignee: '和泉 阿委璃',
    projectName: 'ECサイトリニューアル',
    createdAt: '2026-04-01',
    resolvedAt: '2026-04-02',
  },
  {
    id: 'bug5',
    title: 'CSV出力時に文字化けが発生',
    description: 'Excel で開いたときに日本語が文字化けする（UTF-8 BOM未付与）',
    severity: 'major',
    status: 'resolved',
    reporter: '小野 崇',
    assignee: '犬飼 智之',
    projectName: '基幹システム開発',
    createdAt: '2026-03-31',
    resolvedAt: '2026-04-03',
  },
];
