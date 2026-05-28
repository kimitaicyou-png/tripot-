'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createDeal, type DealFormState } from '@/lib/actions/deals';

const STAGE_OPTIONS = [
  { value: 'prospect', label: '見込み' },
  { value: 'proposing', label: '提案中' },
  { value: 'ordered', label: '受注' },
  { value: 'in_production', label: '制作中' },
];

const REVENUE_TYPE_OPTIONS = [
  { value: 'spot', label: '単発（一括）' },
  { value: 'running', label: '継続（月額）' },
  { value: 'both', label: '両方' },
];

type CustomerOption = { id: string; name: string };

function toHalfWidth(v: string): string {
  return v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

export function DealNewForm({ customers }: { customers: CustomerOption[] }) {
  const [state, formAction, isPending] = useActionState<DealFormState, FormData>(createDeal, {});

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1.5">
          案件名 <span className="text-red-600">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="例：株式会社A社向け 新サービス開発"
        />
        {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
      </div>

      <div>
        <label htmlFor="customer_id" className="block text-sm font-medium text-gray-900 mb-1.5">顧客</label>
        <select
          id="customer_id"
          name="customer_id"
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        >
          <option value="">顧客を選択（任意）</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.errors?.customer_id && (
          <p className="mt-1 text-xs text-red-600">{state.errors.customer_id.join(', ')}</p>
        )}
      </div>

      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-gray-900 mb-1.5">ステージ</label>
        <select
          id="stage"
          name="stage"
          defaultValue="prospect"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        >
          {STAGE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-900 mb-1.5">受注金額（円）</label>
          <input
            id="amount"
            name="amount"
            inputMode="numeric"
            defaultValue="0"
            onBlur={(e) => {
              e.currentTarget.value = toHalfWidth(e.currentTarget.value);
            }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>
        <div>
          <label htmlFor="revenue_type" className="block text-sm font-medium text-gray-900 mb-1.5">収益タイプ</label>
          <select
            id="revenue_type"
            name="revenue_type"
            defaultValue="spot"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          >
            {REVENUE_TYPE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="monthly_amount" className="block text-sm font-medium text-gray-900 mb-1.5">
          月額（収益タイプが継続/両方の場合）
        </label>
        <input
          id="monthly_amount"
          name="monthly_amount"
          inputMode="numeric"
          defaultValue="0"
          onBlur={(e) => {
            e.currentTarget.value = toHalfWidth(e.currentTarget.value);
          }}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      <div>
        <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-900 mb-1.5">受注予定日</label>
        <input
          id="expected_close_date"
          name="expected_close_date"
          type="date"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      {state.errors?._form && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.errors._form.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/deals"
          className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? '登録中…' : '登録する'}
        </button>
      </div>
    </form>
  );
}
