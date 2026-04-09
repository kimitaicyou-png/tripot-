'use client';

import { useState, useRef, useEffect } from 'react';

export type Comment = {
  id: string;
  author: string;
  content: string;
  mentions: string[];
  createdAt: string;
};

type Props = {
  comments: Comment[];
  onChange: (comments: Comment[]) => void;
  currentUser: string;
};

const MEMBERS = ['柏樹 久美子', '犬飼 智之', '和泉 阿委璃', '小野 崇'];

const MEMBER_INITIALS: Record<string, { initial: string; color: string }> = {
  '柏樹 久美子': { initial: '柏', color: 'bg-pink-500' },
  '犬飼 智之': { initial: '犬', color: 'bg-emerald-500' },
  '和泉 阿委璃': { initial: '和', color: 'bg-amber-500' },
  '小野 崇': { initial: '小', color: 'bg-indigo-500' },
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderContent(content: string) {
  const parts = content.split(/(@[\u4E00-\u9FFF\w\s]+?(?=\s|$|@|[^\u4E00-\u9FFF\w\s]))/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="text-blue-600 font-semibold">{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function InternalComments({ comments, onChange, currentUser }: Props) {
  const [draft, setDraft] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mentionCandidates = MEMBERS.filter(
    (m) => m.includes(mentionQuery) && m !== currentUser
  );

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const atMatch = before.match(/@([\u4E00-\u9FFF\w]*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (name: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor);
    const after = draft.slice(cursor);
    const newBefore = before.replace(/@[\u4E00-\u9FFF\w]*$/, `@${name} `);
    setDraft(newBefore + after);
    setMentionOpen(false);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newBefore.length, newBefore.length);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionCandidates.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && mentionCandidates[mentionIndex]) { e.preventDefault(); insertMention(mentionCandidates[mentionIndex]); return; }
      if (e.key === 'Escape') { setMentionOpen(false); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { handleSubmit(); }
  };

  const handleSubmit = () => {
    if (!draft.trim()) return;
    const mentionMatches = [...draft.matchAll(/@([\u4E00-\u9FFF\w\s]+?)(?=\s|$)/g)].map((m) => m[1].trim());
    const newComment: Comment = {
      id: `c${Date.now()}`,
      author: currentUser,
      content: draft.trim(),
      mentions: mentionMatches,
      createdAt: new Date().toISOString(),
    };
    onChange([...comments, newComment]);
    setDraft('');
    setMentionOpen(false);
  };

  useEffect(() => {
    if (!mentionOpen) setMentionQuery('');
  }, [mentionOpen]);

  const info = MEMBER_INITIALS[currentUser] ?? { initial: currentUser[0], color: 'bg-gray-500' };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-sm text-gray-500 py-6 text-center">
            コメントはまだありません。最初のコメントを投稿しましょう。
          </div>
        ) : (
          comments.map((c) => {
            const authorInfo = MEMBER_INITIALS[c.author] ?? { initial: c.author[0], color: 'bg-gray-500' };
            return (
              <div key={c.id} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${authorInfo.color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0 mt-0.5`}>
                  {authorInfo.initial}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">{c.author}</span>
                    <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                  </div>
                  <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    {renderContent(c.content)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-200">
        <div className={`w-8 h-8 rounded-full ${info.color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0 mt-1`}>
          {info.initial}
        </div>
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="コメントを入力... (@名前 でメンション、Cmd+Enter で送信)"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none placeholder-gray-400"
          />

          {mentionOpen && mentionCandidates.length > 0 && (
            <div className="absolute bottom-full left-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-sm z-20 min-w-[160px] overflow-hidden">
              {mentionCandidates.map((name, i) => {
                const mi = MEMBER_INITIALS[name] ?? { initial: name[0], color: 'bg-gray-500' };
                return (
                  <button
                    key={name}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(name); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      i === mentionIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full ${mi.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                      {mi.initial}
                    </div>
                    <span className="font-semibold">{name}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={!draft.trim()}
              className="px-4 py-1.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              送信
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export const MOCK_COMMENTS: Comment[] = [
  {
    id: 'c1',
    author: '柏樹 久美子',
    content: '山田製作所の件、先方の担当者が変わったそうです。@犬飼 智之 引き続き対応お願いします。',
    mentions: ['犬飼 智之'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    author: '犬飼 智之',
    content: '承知しました。来週月曜に再訪問の予定を入れます。',
    mentions: [],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c3',
    author: '和泉 阿委璃',
    content: '提案資料の修正が完了しました。@柏樹 久美子 ご確認をお願いします。',
    mentions: ['柏樹 久美子'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c4',
    author: '小野 崇',
    content: 'システム連携の要件定義が固まりました。見積もりの更新が必要かもしれません。@犬飼 智之 確認してください。',
    mentions: ['犬飼 智之'],
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
];
