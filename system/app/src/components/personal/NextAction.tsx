'use client';

import { useState } from 'react';
import { useMemberNames } from '@/lib/hooks/useMemberNames';

type NextActionData = {
  date: string;
  time?: string;
  content: string;
  assignee: string;
  nextStage?: string;
};

type StageOption = { value: string; label: string };

type Props = {
  action: NextActionData | null;
  onChange: (action: NextActionData | null) => void;
  compact?: boolean;
  currentStage?: string;
  stageOptions?: StageOption[];
  onStageChange?: (stage: string) => void;
};

const TODAY = '2026-04-05';

function isOverdue(date: string): boolean {
  return date < TODAY;
}

function formatDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${parseInt(month)}/${parseInt(day)}`;
}

export default function NextAction({ action, onChange, compact = false, currentStage, stageOptions, onStageChange }: Props) {
  const memberNames = useMemberNames();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NextActionData>(
    action ?? { date: '', time: '', content: '', assignee: '', nextStage: currentStage }
  );

  if (compact) {
    if (!action) {
      return (
        <span className="text-xs text-red-600 font-semibold">⚠ 次回アクション未設定</span>
      );
    }
    const overdue = isOverdue(action.date);
    return (
      <span className={`text-xs font-semibold ${overdue ? 'text-red-600' : 'text-gray-700'}`}>
        {overdue ? '🔴 期限切れ' : '📅 次回'}: {formatDate(action.date)}{action.time ? ` ${action.time}` : ''} {action.content}
      </span>
    );
  }

  const handleSave = () => {
    if (!draft.content || !draft.date) return;
    onChange(draft);
    if (draft.nextStage && draft.nextStage !== currentStage && onStageChange) {
      onStageChange(draft.nextStage);
    }
    setEditing(false);
  };

  const handleClear = () => {
    onChange(null);
    setDraft({ date: '', time: '', content: '', assignee: '' });
    setEditing(false);
  };

  const handleCalendar = () => {
    if (!draft.content || !draft.date) return;
    const dateStr = draft.date.replace(/-/g, '');
    const timeStr = draft.time ? draft.time.replace(':', '') + '00' : '090000';
    const endTime = draft.time
      ? `${draft.date.replace(/-/g, '')}T${String(parseInt(draft.time.split(':')[0]) + 1).padStart(2, '0')}${draft.time.split(':')[1]}00`
      : `${dateStr}T100000`;
    const start = `${dateStr}T${timeStr}`;
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(draft.content)}&dates=${start}/${endTime}&details=${encodeURIComponent(`担当: ${draft.assignee}`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500">📅 次回アクション</p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(action ?? { date: '', time: '', content: '', assignee: '' });
              setEditing(true);
            }}
            className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
          >
            {action ? '編集' : '設定'}
          </button>
        )}
      </div>

      {!editing && !action && (
        <p className="text-xs text-red-600 font-semibold">⚠ 次回アクション未設定</p>
      )}

      {!editing && action && (
        <div className="space-y-1 text-sm">
          {isOverdue(action.date) && (
            <p className="text-xs text-red-600 font-semibold">🔴 期限切れ</p>
          )}
          <p className="text-gray-900 font-semibold">{action.content}</p>
          <p className="text-gray-500 text-xs">
            {formatDate(action.date)}{action.time ? ` ${action.time}` : ''} &nbsp;|&nbsp; {action.assignee}
          </p>
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">内容</label>
            <input
              type="text"
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="例: 最終見積りを提出"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">日付</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs text-gray-500 mb-0.5">時間</label>
              <input
                type="time"
                value={draft.time ?? ''}
                onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">担当</label>
            <select
              value={draft.assignee}
              onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">選択してください</option>
              {memberNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          {stageOptions && stageOptions.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">この行動の後ステージを</label>
              <select
                value={draft.nextStage ?? currentStage ?? ''}
                onChange={(e) => setDraft({ ...draft, nextStage: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {stageOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value === currentStage ? `${opt.label}（そのまま）` : `→ ${opt.label}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleCalendar}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded text-gray-600 hover:bg-gray-50"
            >
              Googleカレンダーに登録
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.content || !draft.date}
              className="flex-1 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              保存
            </button>
            {action && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded hover:bg-red-50"
              >
                削除
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { NextActionData };

export const MOCK_NEXT_ACTIONS: Record<string, NextActionData> = {};
