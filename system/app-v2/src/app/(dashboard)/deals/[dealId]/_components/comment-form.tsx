'use client';

import { useActionState, useRef } from 'react';
import { createDealComment, type CommentFormState } from '@/lib/actions/deal-comments';

const initialState: CommentFormState = {};

export function CommentForm({ dealId }: { dealId: string }) {
  const action = createDealComment.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await formAction(fd);
        formRef.current?.reset();
      }}
      className="bg-card border border-border rounded-lg p-4 space-y-2"
    >
      <textarea
        name="body"
        rows={3}
        required
        maxLength={2000}
        placeholder="案件についての社内コメント（顧客には見せない）"
        className="w-full px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink resize-y"
      />
      <div className="flex items-center justify-between">
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && <p className="text-xs text-emerald-700">✓ 投稿しました</p>}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto px-4 py-1.5 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '投稿中...' : '投稿'}
        </button>
      </div>
    </form>
  );
}
