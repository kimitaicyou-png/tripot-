'use client';

import { useTransition } from 'react';
import { toggleTaskStatus } from '@/lib/actions/tasks';

export function TaskCheckbox({ taskId, done }: { taskId: string; done: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleTaskStatus(taskId))}
      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all active:scale-[0.9] shrink-0 ${
        done
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'bg-white border-border hover:border-ink-mid'
      } ${pending ? 'opacity-50' : ''}`}
      aria-label={done ? '未完了に戻す' : '完了にする'}
    >
      {done && (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}
