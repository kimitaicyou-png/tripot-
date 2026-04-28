'use client';

import { useActionState, useState } from 'react';
import { createDeliverable, type DeliverableFormState } from '@/lib/actions/deliverables';

const initialState: DeliverableFormState = {};

export function DeliverableForm({ cardId }: { cardId: string }) {
  const action = createDeliverable.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-bg rounded hover:opacity-90 transition-opacity"
      >
        📁 成果物追加
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">成果物名</span>
          <input
            type="text"
            name="name"
            required
            maxLength={200}
            placeholder="例：初版納品 / デザインカンプ v2"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">バージョン</span>
          <input
            type="number"
            name="version"
            min={1}
            defaultValue={1}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">ファイルURL（任意）</span>
        <input
          type="url"
          name="file_url"
          placeholder="https://drive.google.com/... など"
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">メモ（任意）</span>
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
          placeholder="変更点 / 注意事項 など"
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
          {pending ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
