'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductionCard, deleteProductionCard, type ProductionFormState } from '@/lib/actions/production';

const initialState: ProductionFormState = {};

type Props = {
  cardId: string;
  title: string;
  estimatedCost: number;
  actualCost: number;
};

export function ProductionEditForm(props: Props) {
  const router = useRouter();
  const action = updateProductionCard.bind(null, props.cardId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [editing, setEditing] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    startDelete(async () => {
      await deleteProductionCard(props.cardId);
      router.push('/production');
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
        >
          ✎ 編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deletePending}
          className={`px-3 py-1.5 text-xs border rounded transition-colors disabled:opacity-40 ${
            confirming
              ? 'text-red-700 border-red-700 hover:bg-red-50'
              : 'text-muted border-border hover:text-red-700 hover:border-red-700'
          }`}
        >
          {deletePending ? '...' : confirming ? '本当に削除' : '削除'}
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={() => setTimeout(() => setEditing(false), 200)}
      className="bg-card border border-border rounded-lg p-5 space-y-4"
    >
      <p className="text-xs uppercase tracking-widest text-subtle">制作カード 編集</p>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-subtle">タイトル</span>
        <input
          type="text"
          name="title"
          required
          maxLength={200}
          defaultValue={props.title}
          className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">見積コスト（円）</span>
          <input
            type="number"
            name="estimated_cost"
            min={0}
            defaultValue={props.estimatedCost}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink font-mono tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">実績コスト（円）</span>
          <input
            type="number"
            name="actual_cost"
            min={0}
            defaultValue={props.actualCost}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink font-mono tabular-nums"
          />
        </label>
      </div>

      {state.errors?._form && (
        <p className="text-sm text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-4 py-2 text-sm text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
