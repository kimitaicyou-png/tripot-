'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/tasks" className="text-muted hover:text-ink text-sm">← タスク一覧</Link>
        <h1 className="text-lg font-semibold text-ink">新規タスク</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <form action={formAction} className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-ink mb-1.5">
              タスク名 <span className="text-red-600">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：A社向け提案書を作成"
            />
            {state.errors?.title && <p className="mt-1 text-xs text-red-600">{state.errors.title.join(', ')}</p>}
          </div>

          <div>
            <label htmlFor="due_date" className="block text-sm font-medium text-ink mb-1.5">期限</label>
            <input
              id="due_date"
              name="due_date"
              type="date"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="estimated_cost" className="block text-sm font-medium text-ink mb-1.5">見積コスト（円）</label>
            <input
              id="estimated_cost"
              name="estimated_cost"
              type="number"
              min="0"
              defaultValue="0"
              className="w-full px-3 py-2 border border-border rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/tasks" className="px-4 py-2 text-muted hover:text-ink text-sm font-medium">キャンセル</Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? '登録中…' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
