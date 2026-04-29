'use client';

import { useActionState, useState } from 'react';
import { Package } from 'lucide-react';
import { createPurchaseOrder, type PurchaseOrderFormState } from '@/lib/actions/purchase-orders';

const initialState: PurchaseOrderFormState = {};

type VendorOption = { id: string; name: string };

export function PurchaseOrderForm({
  cardId,
  vendors,
}: {
  cardId: string;
  vendors: VendorOption[];
}) {
  const action = createPurchaseOrder.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (vendors.length === 0) {
    return (
      <span className="text-xs text-gray-500">外注先マスタが未登録です</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 transition-opacity"
      >
        <Package className="w-4 h-4" />
        発注追加
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
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">外注先</span>
        <select
          name="vendor_id"
          required
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        >
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">発注タイトル</span>
        <input
          type="text"
          name="title"
          required
          maxLength={200}
          placeholder="例：UI実装外注 / グラフィック納品"
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">発注金額（円）</span>
          <input
            type="number"
            name="amount"
            min={0}
            defaultValue={0}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">発注日（任意）</span>
          <input
            type="date"
            name="issued_on"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
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
          {pending ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
