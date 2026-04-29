'use client';

import { useActionState, useState } from 'react';
import { createLeave, type LeaveFormState } from '@/lib/actions/leaves';

const LEAVE_TYPE_OPTIONS = ['有給', '夏季休暇', '年末年始', '慶弔', '特別休暇', '欠勤', 'その他'] as const;

const initialState: LeaveFormState = {};

export function LeaveForm({ members }: { members: Array<{ id: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createLeave, initialState);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 transition-opacity"
      >
        ＋ 休暇を追加
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">メンバー</span>
          <select
            name="member_id"
            required
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          >
            <option value="">選択してください</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">種別</span>
          <select
            name="leave_type"
            required
            defaultValue="有給"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          >
            {LEAVE_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">開始日</span>
          <input
            type="date"
            name="start_date"
            required
            defaultValue={today}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">終了日</span>
          <input
            type="date"
            name="end_date"
            required
            defaultValue={today}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">メモ（任意）</span>
        <input
          type="text"
          name="note"
          maxLength={500}
          placeholder="（任意）"
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        />
      </label>

      {state.errors?._form && (
        <p className="text-sm text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded hover:text-gray-900 hover:border-gray-900 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
