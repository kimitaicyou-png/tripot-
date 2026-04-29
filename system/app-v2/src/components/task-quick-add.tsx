'use client';

import { useActionState, useRef, useEffect } from 'react';
import { createTask, type TaskFormState } from '@/lib/actions/tasks';

export function TaskQuickAdd({ dealId }: { dealId?: string }) {
  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(createTask, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center gap-2 mt-3">
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}
      <input
        type="text"
        name="title"
        required
        placeholder="タスクを追加…"
        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="date"
        name="due_date"
        className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50"
      >
        {isPending ? '追加中…' : '追加'}
      </button>
    </form>
  );
}
