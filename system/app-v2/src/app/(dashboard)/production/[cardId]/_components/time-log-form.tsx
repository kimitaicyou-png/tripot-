'use client';

import { useActionState, useRef } from 'react';
import { Plus, Check } from 'lucide-react';
import { createTimeLog, type TimeLogFormState } from '@/lib/actions/time-logs';

const initialState: TimeLogFormState = {};

function todayLocal(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function TimeLogForm({ cardId }: { cardId: string }) {
  const action = createTimeLog.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">日付</span>
          <input
            type="date"
            name="occurred_on"
            required
            defaultValue={todayLocal()}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">時間（分）</span>
          <input
            type="number"
            name="minutes"
            min={1}
            max={1440}
            step={15}
            required
            placeholder="例：60（=1時間）"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">メモ（任意）</span>
          <input
            type="text"
            name="note"
            maxLength={500}
            placeholder="例：要件定義MTG / バグ調査"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && (
          <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <Check className="w-3 h-3" />
            記録しました
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1 ml-auto px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          {pending ? '記録中…' : '工数を記録'}
        </button>
      </div>
    </form>
  );
}
