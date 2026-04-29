'use client';

import { useActionState, useState } from 'react';
import { createProductionCard, type ProductionFormState } from '@/lib/actions/production';

const initialState: ProductionFormState = {};

export function ProductionCreateForm({
  deals,
}: {
  deals: Array<{ id: string; title: string }>;
}) {
  const [state, formAction, pending] = useActionState(createProductionCard, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 transition-opacity"
      >
        ＋ 制作カード追加
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">紐付け案件（任意）</span>
          <select
            name="deal_id"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          >
            <option value="">— なし —</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">見積コスト（円）</span>
          <input
            type="number"
            name="estimated_cost"
            min={0}
            defaultValue={0}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>
      </div>

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
