'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTask, type TaskFormState } from '@/lib/actions/tasks';

type DealOption = { id: string; title: string };

export function TaskNewForm({ deals }: { deals: DealOption[] }) {
  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(createTask, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/tasks');
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1.5">
          タスク名 <span className="text-red-600">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          placeholder="例：A社向け提案書を作成"
        />
        {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
      </div>

      <div>
        <label htmlFor="deal_id" className="block text-sm font-medium text-gray-900 mb-1.5">紐づく案件</label>
        <select
          id="deal_id"
          name="deal_id"
          defaultValue=""
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        >
          <option value="">案件に紐づけない</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-900 mb-1.5">期限</label>
        <input
          id="due_date"
          name="due_date"
          type="date"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      <div>
        <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-900 mb-1.5">見積コスト（円）</label>
        <input
          id="estimated_cost"
          name="estimated_cost"
          type="number"
          min="0"
          defaultValue="0"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
      </div>

      {state.errors?._form && (
        <div className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {state.errors._form.join(', ')}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/tasks" className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium transition-colors">
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
