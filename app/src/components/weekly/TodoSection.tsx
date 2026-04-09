'use client';

import { useState } from 'react';

export type TodoItem = {
  id: string;
  content: string;
  assignee: string;
  deadline: string;
  status: 'pending' | 'completed';
  weeksCarried: number;
  reason?: string;
  insight?: string;
};

type Props = {
  prevTodos: TodoItem[];
  onPrevTodosChange: (todos: TodoItem[]) => void;
  newTodos: TodoItem[];
  onNewTodosChange: (todos: TodoItem[]) => void;
};

export const MOCK_PREV_TODOS: TodoItem[] = [
  { id: 'p1', content: '豊田精工CTO 鈴木氏に技術提案書を送付', assignee: '渡辺', deadline: '2026-04-04', status: 'completed', weeksCarried: 0, insight: '直接電話してから送付したのが効いた' },
  { id: 'p2', content: '教育委員会 中間報告書を提出', assignee: '山本', deadline: '2026-04-03', status: 'completed', weeksCarried: 0 },
  { id: 'p3', content: '新規リード3件にアポ電話', assignee: '柏樹', deadline: '2026-04-05', status: 'pending', weeksCarried: 2, reason: '' },
  { id: 'p4', content: '外注単価の再交渉（粗利改善）', assignee: '柏樹', deadline: '2026-03-28', status: 'pending', weeksCarried: 3, reason: '先方担当者が出張中' },
];

export const MOCK_NEW_TODOS: TodoItem[] = [
  { id: 'n1', content: '中京メディカル 技術検証MTG実施', assignee: '柏樹', deadline: '2026-04-11', status: 'pending', weeksCarried: 0 },
  { id: 'n2', content: '碧会 院長に提案書プレゼン', assignee: '柏樹', deadline: '2026-04-10', status: 'pending', weeksCarried: 0 },
];

function CarryBadge({ weeks }: { weeks: number }) {
  if (weeks === 0) return null;
  if (weeks === 1) {
    return (
      <span className="text-xs text-gray-500 ml-2">持越1週</span>
    );
  }
  if (weeks === 2) {
    return (
      <span className="text-xs font-medium text-amber-600 ml-2">2週放置</span>
    );
  }
  return (
    <span className="text-xs font-medium text-red-600 ml-2">⚠ {weeks}週以上放置中</span>
  );
}

function cardBorderClass(item: TodoItem): string {
  if (item.weeksCarried >= 3) return 'border border-gray-200 border-l-2 border-l-red-500 rounded-lg';
  if (item.weeksCarried === 2) return 'border border-gray-200 border-l-2 border-l-amber-400 rounded-lg';
  return 'border border-gray-200 rounded-lg';
}

function PrevTodoCard({
  item,
  onChange,
  onCarryOver,
}: {
  item: TodoItem;
  onChange: (updated: TodoItem) => void;
  onCarryOver: (item: TodoItem) => void;
}) {
  return (
    <div className={`p-4 ${cardBorderClass(item)}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() =>
            onChange({ ...item, status: item.status === 'completed' ? 'pending' : 'completed' })
          }
          aria-label={item.status === 'completed' ? '未完了に戻す' : '完了にする'}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            item.status === 'completed'
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 bg-white hover:border-blue-400'
          }`}
        >
          {item.status === 'completed' && (
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`text-sm font-medium text-gray-900 ${
                item.status === 'completed' ? 'line-through text-gray-500' : ''
              }`}
            >
              {item.content}
            </span>
            <CarryBadge weeks={item.weeksCarried} />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500">
            <span>担当: {item.assignee}</span>
            <span>期限: {item.deadline}</span>
          </div>

          <div className="mt-2">
            {item.status === 'completed' ? (
              <input
                type="text"
                value={item.insight ?? ''}
                onChange={(e) => onChange({ ...item, insight: e.target.value })}
                placeholder="何が効いた？（任意）"
                className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder:text-gray-500"
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={item.reason ?? ''}
                  onChange={(e) => onChange({ ...item, reason: e.target.value })}
                  placeholder="なぜできなかった？（任意）"
                  className="w-full text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => onCarryOver(item)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  → 来週に持ち越す
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewTodoCard({
  item,
  onChange,
  onRemove,
}: {
  item: TodoItem;
  onChange: (updated: TodoItem) => void;
  onRemove: () => void;
}) {
  return (
    <div className={`p-4 ${cardBorderClass(item)}`}>
      {item.weeksCarried > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <CarryBadge weeks={item.weeksCarried} />
          <span className="text-xs text-gray-500">（前週から持ち越し）</span>
        </div>
      )}
      <div className="space-y-2">
        <input
          type="text"
          value={item.content}
          onChange={(e) => onChange({ ...item, content: e.target.value })}
          placeholder="例: 豊田精工の最終見積もりを提出して受注を確定させる"
          className="w-full text-sm font-medium px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 placeholder:text-gray-500"
        />
        <div className="flex gap-2">
          <input
            type="text"
            value={item.assignee}
            onChange={(e) => onChange({ ...item, assignee: e.target.value })}
            placeholder="担当"
            className="w-24 text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700 placeholder:text-gray-500"
          />
          <input
            type="date"
            value={item.deadline}
            onChange={(e) => onChange({ ...item, deadline: e.target.value })}
            className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-700"
          />
          <button
            type="button"
            onClick={onRemove}
            aria-label="削除"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function TodoSection({ prevTodos, onPrevTodosChange, newTodos, onNewTodosChange }: Props) {
  const [nextId, setNextId] = useState(100);

  function updatePrev(updated: TodoItem) {
    onPrevTodosChange(prevTodos.map((t) => (t.id === updated.id ? updated : t)));
  }

  function carryOver(item: TodoItem) {
    const carried: TodoItem = {
      ...item,
      id: `carry-${item.id}`,
      weeksCarried: item.weeksCarried + 1,
      status: 'pending',
    };
    const carriedIds = new Set(newTodos.map((t) => t.id));
    if (!carriedIds.has(carried.id)) {
      onNewTodosChange([carried, ...newTodos]);
    }
  }

  function updateNew(updated: TodoItem) {
    onNewTodosChange(newTodos.map((t) => (t.id === updated.id ? updated : t)));
  }

  function removeNew(id: string) {
    onNewTodosChange(newTodos.filter((t) => t.id !== id));
  }

  function addNew() {
    const newItem: TodoItem = {
      id: `new-${nextId}`,
      content: '',
      assignee: '',
      deadline: '',
      status: 'pending',
      weeksCarried: 0,
    };
    setNextId((n) => n + 1);
    onNewTodosChange([...newTodos, newItem]);
  }

  const carriedItems = newTodos.filter((t) => t.weeksCarried > 0);
  const freshItems = newTodos.filter((t) => t.weeksCarried === 0);
  const orderedNew = [...carriedItems, ...freshItems];

  const tooMany = newTodos.length > 5;

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-1">
          <h2 className="text-base font-semibold text-gray-900">前回の最重要アクション</h2>
          <p className="text-xs text-gray-500 mt-0.5">数字を動かすために先週やるべき、最もインパクトのある行動</p>
        </div>

        {prevTodos.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">前週のToDoはありません。</p>
        ) : (
          <div className="space-y-3 mt-3">
            {prevTodos.map((item) => (
              <PrevTodoCard
                key={item.id}
                item={item}
                onChange={updatePrev}
                onCarryOver={carryOver}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-1">
          <h2 className="text-base font-semibold text-gray-900">来週の最重要アクション</h2>
          <p className="text-xs text-gray-500 mt-0.5">数字を動かすために今週やるべき、最もインパクトのある行動</p>
        </div>

        {tooMany && (
          <div className="mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg" role="alert" aria-live="polite">
            <p className="text-sm text-red-600 font-medium">増やす＝何もやらない。インパクトのある行動に絞ろう</p>
          </div>
        )}

        {orderedNew.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">来週のToDoはまだありません。</p>
        ) : (
          <div className="space-y-3 mt-3">
            {orderedNew.map((item) => (
              <NewTodoCard
                key={item.id}
                item={item}
                onChange={updateNew}
                onRemove={() => removeNew(item.id)}
              />
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={addNew}
          className="mt-3 w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          + アクションを追加
        </button>
      </section>
    </div>
  );
}
