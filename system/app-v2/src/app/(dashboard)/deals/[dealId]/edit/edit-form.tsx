'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { updateDeal, type DealFormState } from '@/lib/actions/deals';

const STAGE_OPTIONS = [
  { value: 'prospect', label: '見込み' },
  { value: 'proposing', label: '提案中' },
  { value: 'ordered', label: '受注' },
  { value: 'in_production', label: '制作中' },
  { value: 'delivered', label: '納品済' },
  { value: 'acceptance', label: '検収' },
  { value: 'invoiced', label: '請求済' },
  { value: 'paid', label: '入金済' },
  { value: 'lost', label: '失注' },
];

const REVENUE_TYPE_OPTIONS = [
  { value: 'spot', label: '単発（一括）' },
  { value: 'running', label: '継続（月額）' },
  { value: 'both', label: '両方' },
];

type Initial = {
  title: string;
  stage: string;
  amount: number;
  monthly_amount: number;
  revenue_type: string;
  expected_close_date: string | null;
};

export function DealEditForm({ dealId, initial }: { dealId: string; initial: Initial }) {
  const action = updateDeal.bind(null, dealId);
  const [state, formAction, isPending] = useActionState<DealFormState, FormData>(action, {});

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1.5">案件名</label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={initial.title}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
      </div>

      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-gray-900 mb-1.5">ステージ</label>
        <select
          id="stage"
          name="stage"
          defaultValue={initial.stage}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            type="number"
            min="0"
            defaultValue={initial.amount}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="revenue_type" className="block text-sm font-medium text-gray-900 mb-1.5">収益タイプ</label>
          <select
            id="revenue_type"
            name="revenue_type"
            defaultValue={initial.revenue_type}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REVENUE_TYPE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="monthly_amount" className="block text-sm font-medium text-gray-900 mb-1.5">月額</label>
        <input
          id="monthly_amount"
          name="monthly_amount"
          type="number"
          min="0"
          defaultValue={initial.monthly_amount}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-900 mb-1.5">受注予定日</label>
        <input
          id="expected_close_date"
          name="expected_close_date"
          type="date"
          defaultValue={initial.expected_close_date ?? ''}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state.success && (
        <div className="px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          更新しました
        </div>
      )}
      {state.errors?._form && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.errors._form.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/deals/${dealId}`}
          className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? '更新中…' : '更新する'}
        </button>
      </div>
    </form>
  );
}
