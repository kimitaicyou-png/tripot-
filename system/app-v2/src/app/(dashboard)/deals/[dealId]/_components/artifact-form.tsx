'use client';

import { useActionState, useState } from 'react';
import { createDealArtifact, type ArtifactFormState } from '@/lib/actions/deal-artifacts';

const initialState: ArtifactFormState = {};

const TYPE_OPTIONS = ['議事録', '提案書', '仕様書', '納品物', 'スライド', 'その他'];

export function ArtifactForm({ dealId }: { dealId: string }) {
  const action = createDealArtifact.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 transition-opacity"
      >
        ＋ 成果物を追加
      </button>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setOpen(false), 100)}
      className="bg-card border border-border rounded-lg p-5 space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">タイトル</span>
          <input
            type="text"
            name="title"
            required
            maxLength={200}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">種別</span>
          <select
            name="artifact_type"
            defaultValue="議事録"
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">ファイル URL</span>
          <input
            type="url"
            name="file_url"
            placeholder="https://drive.google.com/..."
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-subtle">メモ（任意）</span>
        <textarea
          name="note"
          rows={2}
          maxLength={2000}
          className="w-full px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink resize-y"
        />
      </label>

      {state.errors?._form && (
        <p className="text-sm text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 text-sm text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '登録'}
        </button>
      </div>
    </form>
  );
}
