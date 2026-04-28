'use client';

import { useActionState } from 'react';
import { updateTask, type TaskFormState } from '@/lib/actions/tasks';

export function TaskEditForm({
  taskId,
  initial,
}: {
  taskId: string;
  initial: { title: string; due_date: string | null; estimated_cost: number };
}) {
  const action = updateTask.bind(null, taskId);
  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-900 mb-1.5">
          タスク名
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial.title}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-900 mb-1.5">
            期限
          </label>
          <input
            id="due_date"
            name="due_date"
            type="date"
            defaultValue={initial.due_date ?? ''}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="estimated_cost" className="block text-sm font-medium text-gray-900 mb-1.5">
            予定コスト（円）
          </label>
          <input
            id="estimated_cost"
            name="estimated_cost"
            type="number"
            min={0}
            step={1000}
            defaultValue={initial.estimated_cost}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {state.success && <p className="text-xs text-emerald-700">保存しました</p>}
      {state.errors?._form && <p className="text-xs text-red-600">{state.errors._form.join(', ')}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? '保存中…' : '保存する'}
        </button>
      </div>
    </form>
  );
}
