'use client';

import { useActionState, useState } from 'react';
import { Check, Pencil } from 'lucide-react';
import { updateDealExternalCost, type ExternalCostState } from '@/lib/actions/deals';

const initialState: ExternalCostState = {};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export function ExternalCostForm({
  dealId,
  externalCost,
  grossProfit,
  grossProfitRate,
}: {
  dealId: string;
  externalCost: number;
  grossProfit: number;
  grossProfitRate: string | number | null;
}) {
  const action = updateDealExternalCost.bind(null, dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(externalCost));

  const rateNum = grossProfitRate == null ? 0 : Number(grossProfitRate);
  const rateLabel = `${rateNum.toFixed(2)}%`;
  const profitTone =
    rateNum >= 50 ? 'text-emerald-700' : rateNum >= 20 ? 'text-amber-700' : 'text-red-700';

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">粗利の内訳</p>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(String(externalCost));
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 active:scale-[0.98]"
          >
            <Pencil className="w-3 h-3" />
            外注費を編集
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">外注費</p>
          {editing ? (
            <form action={formAction} className="space-y-2">
              <input
                type="text"
                inputMode="numeric"
                name="external_cost"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full font-mono tabular-nums text-xl text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-900"
                disabled={pending}
                aria-label="外注費（円）"
              />
              {state.errors?.external_cost?.[0] && (
                <p className="text-xs text-red-700">{state.errors.external_cost[0]}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-xs text-gray-700 hover:text-gray-900"
                >
                  取消
                </button>
              </div>
            </form>
          ) : (
            <p className="font-semibold text-2xl text-gray-900 tabular-nums tracking-tight">
              {formatYen(externalCost)}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">粗利</p>
          <p className={`font-semibold text-2xl tabular-nums tracking-tight ${profitTone}`}>
            {formatYen(grossProfit)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-1">粗利率</p>
          <p className={`font-semibold text-2xl tabular-nums tracking-tight ${profitTone}`}>
            {rateLabel}
          </p>
        </div>
      </div>

      {state.success && !editing && (
        <p className="text-xs text-emerald-700">外注費を更新しました</p>
      )}
    </section>
  );
}
