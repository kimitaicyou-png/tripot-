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

export default function DealNewPage() {
  const [state, formAction, isPending] = useActionState<DealFormState, FormData>(createDeal, {});

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/deals" className="text-gray-700 hover:text-gray-900 text-sm">
          ← 案件一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">新規案件</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：株式会社A社向け 新サービス開発"
            />
            {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
          </div>

          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-gray-900 mb-1.5">ステージ</label>
            <select
              id="stage"
              name="stage"
              defaultValue="prospect"
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
                defaultValue="0"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="revenue_type" className="block text-sm font-medium text-gray-900 mb-1.5">収益タイプ</label>
              <select
                id="revenue_type"
                name="revenue_type"
                defaultValue="spot"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              type="number"
              min="0"
              defaultValue="0"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="expected_close_date" className="block text-sm font-medium text-gray-900 mb-1.5">受注予定日</label>
            <input
              id="expected_close_date"
              name="expected_close_date"
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? '登録中…' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
