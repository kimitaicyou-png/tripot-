'use client';

import { useActionState, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { createReview, type ReviewFormState } from '@/lib/actions/reviews';

const initialState: ReviewFormState = {};

const STATUS_OPTIONS = [
  { value: 'pending', label: 'pending（保留）' },
  { value: 'approved', label: 'approved（承認）' },
  { value: 'rejected', label: 'rejected（差戻）' },
  { value: 'revision', label: 'revision（修正依頼）' },
];

type DeliverableOption = { id: string; name: string; version: number };

export function ReviewForm({
  cardId,
  deliverables,
}: {
  cardId: string;
  deliverables: DeliverableOption[];
}) {
  const action = createReview.bind(null, cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 transition-opacity"
      >
        <CheckCircle2 className="w-4 h-4" />
        レビュー追加
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">対象成果物（任意）</span>
        <select
          name="deliverable_id"
          defaultValue=""
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        >
          <option value="">指定しない（カード全体へのレビュー）</option>
          {deliverables.map((d) => (
            <option key={d.id} value={d.id}>{d.name} v{d.version}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">ステータス</span>
        <select
          name="status"
          defaultValue="approved"
          className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">フィードバック（任意）</span>
        <textarea
          name="feedback"
          rows={3}
          maxLength={4000}
          placeholder="修正点 / 良かった点 / 確認事項 など"
          className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 resize-y"
        />
      </label>

      {state.errors?._form && (
        <p className="text-sm text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded hover:text-gray-900 hover:border-gray-900 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
