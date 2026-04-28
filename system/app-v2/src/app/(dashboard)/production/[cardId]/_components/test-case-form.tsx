'use client';

import { useActionState, useRef } from 'react';
import { createTestCase, type TestCaseFormState } from '@/lib/actions/test-cases';

const initialState: TestCaseFormState = {};

export function TestCaseForm({ cardId }: { cardId: string }) {
  const action = createTestCase.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-2"
    >
      <input
        type="text"
        name="title"
        required
        maxLength={200}
        placeholder="テストケース名（例：ログイン後にダッシュボードにリダイレクト）"
        className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
      />
      <textarea
        name="expected"
        rows={2}
        maxLength={2000}
        placeholder="期待される結果（任意）"
        className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 resize-y"
      />
      <div className="flex items-center justify-between">
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && <p className="text-xs text-emerald-700">✓ 追加</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto px-4 py-1.5 text-sm font-medium bg-gray-900 text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '追加中...' : '＋ 追加'}
        </button>
      </div>
    </form>
  );
}
