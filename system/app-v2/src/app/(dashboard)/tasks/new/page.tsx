'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createTask, type TaskFormState } from '@/lib/actions/tasks';

export default function TaskNewPage() {
  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(createTask, {});
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      router.push('/tasks');
    }
  }, [state.success, router]);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/tasks" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"><ArrowLeft className="w-3.5 h-3.5" />タスク一覧</Link>
        <h1 className="text-lg font-semibold text-gray-900">新規タスク</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：A社向け提案書を作成"
            />
            {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-gray-900 mb-1.5">期限</label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/tasks" className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium">キャンセル</Link>
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
