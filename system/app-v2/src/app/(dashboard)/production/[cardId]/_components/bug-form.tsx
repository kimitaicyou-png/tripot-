'use client';

import { useActionState, useState } from 'react';
import { Bug } from 'lucide-react';
import { createBug, type BugFormState } from '@/lib/actions/bugs';

const initialState: BugFormState = {};

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'low（軽微）' },
  { value: 'medium', label: 'medium（中）' },
  { value: 'high', label: 'high（重要）' },
  { value: 'critical', label: 'critical（致命）' },
];

export function BugForm({ cardId }: { cardId: string }) {
  const action = createBug.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-bg rounded hover:opacity-90 transition-opacity"
      >
        <Bug className="w-4 h-4" />
        バグ報告
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">タイトル</span>
        <input
          type="text"
          name="title"
          required
          maxLength={200}
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">重要度</span>
        <select
          name="severity"
          defaultValue="medium"
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        >
          {SEVERITY_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">詳細（任意）</span>
        <textarea
          name="description"
          rows={3}
          maxLength={4000}
          placeholder="再現手順 / 期待動作 / 実動作 など"
          className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 resize-y"
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
          className="px-5 py-2 text-sm font-medium bg-gray-900 text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '報告中...' : '報告'}
        </button>
      </div>
    </form>
  );
}
