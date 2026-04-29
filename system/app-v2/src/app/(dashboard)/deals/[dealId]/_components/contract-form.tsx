'use client';

import { useActionState, useState } from 'react';
import { createDealContract, type ContractFormState } from '@/lib/actions/deal-contracts';

const initialState: ContractFormState = {};

const TYPE_OPTIONS = ['業務委託', '売買', 'NDA', '基本契約', '発注書', 'その他'];

export function ContractForm({ dealId }: { dealId: string }) {
  const action = createDealContract.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 transition-opacity"
      >
        ＋ 契約書を追加
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
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
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">種別</span>
          <select
            name="contract_type"
            defaultValue="業務委託"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">締結日</span>
          <input
            type="date"
            name="signed_date"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">満了日</span>
          <input
            type="date"
            name="expiry_date"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">ファイル URL</span>
          <input
            type="url"
            name="file_url"
            placeholder="https://drive.google.com/..."
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">メモ（任意）</span>
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
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
          className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
