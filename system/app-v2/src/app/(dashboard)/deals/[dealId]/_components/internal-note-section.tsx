'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { updateDealInternalNote, type InternalNoteState } from '@/lib/actions/deals';

const initialState: InternalNoteState = {};

export function InternalNoteSection({
  dealId,
  initialNote,
  updatedAt,
}: {
  dealId: string;
  initialNote: string;
  updatedAt?: string | null;
}) {
  const action = updateDealInternalNote.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [editing, setEditing] = useState(initialNote.length === 0);
  const [draft, setDraft] = useState(initialNote);

  if (!editing && draft.length > 0) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-gray-500">内部メモ（社内限定）</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            編集
          </button>
        </div>
        <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{draft}</p>
        {updatedAt && (
          <p className="text-xs font-mono text-gray-500">
            最終更新 {new Date(updatedAt).toLocaleString('ja-JP')}
          </p>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">内部メモ（社内限定）</p>
        {draft.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setDraft(initialNote);
              setEditing(false);
            }}
            className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            キャンセル
          </button>
        )}
      </div>
      <textarea
        name="internal_note"
        rows={5}
        maxLength={4000}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="社内限定の覚え書き（顧客には見せない）。意思決定の経緯、注意点、社内交渉メモ等"
        className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 resize-y"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{draft.length} / 4000</p>
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && <p className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="w-3 h-3" />保存しました</p>}
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          onClick={() => setTimeout(() => setEditing(false), 200)}
        >
          {pending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
