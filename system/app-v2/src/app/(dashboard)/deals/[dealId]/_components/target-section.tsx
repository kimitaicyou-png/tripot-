'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
import { updateDealTargetMeta, type TargetMetaState } from '@/lib/actions/deals';

const initialState: TargetMetaState = {};

type Props = {
  dealId: string;
  currentAmount: number | null;
  currentExpectedClose: string | null;
  targetRevenue: number;
  targetGp: number;
  targetCloseDate: string | null;
  winReason: string;
};

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

function progress(current: number, target: number): { pct: number; label: string } {
  if (target === 0) return { pct: 0, label: '目標未設定' };
  const pct = Math.round((current / target) * 100);
  return { pct, label: `${pct}%` };
}

export function TargetSection(props: Props) {
  const action = updateDealTargetMeta.bind(null, props.dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [editing, setEditing] = useState(false);

  const hasTarget = props.targetRevenue > 0 || props.targetGp > 0 || props.targetCloseDate !== null;
  const revenueProgress = progress(props.currentAmount ?? 0, props.targetRevenue);

  if (!editing && !hasTarget) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-gray-500">目標 KPI</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            設定する
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-3">
          この案件の売上目標 / 粗利目標 / 受注目標日を設定すると、進捗率が表示されます
        </p>
      </section>
    );
  }

  if (!editing) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-gray-500">目標 KPI</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            編集
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">売上目標</p>
            <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1">
              {formatYen(props.targetRevenue)}
            </p>
            {props.targetRevenue > 0 && (
              <>
                <div className="h-1 bg-bg rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full ${revenueProgress.pct >= 100 ? 'bg-emerald-500' : 'bg-gray-900'}`}
                    style={{ width: `${Math.min(100, revenueProgress.pct)}%` }}
                  />
                </div>
                <p className={`text-xs font-mono mt-1 ${revenueProgress.pct >= 100 ? 'text-emerald-700' : 'text-gray-700'}`}>
                  進捗 {revenueProgress.label}
                </p>
              </>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">粗利目標</p>
            <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1">
              {formatYen(props.targetGp)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">受注目標日</p>
            <p className="font-mono tabular-nums text-base text-gray-900 mt-1">
              {props.targetCloseDate ?? '—'}
            </p>
            {props.currentExpectedClose && props.targetCloseDate && (
              <p className="text-xs text-gray-500 mt-0.5">
                予定 {props.currentExpectedClose}
              </p>
            )}
          </div>
        </div>

        {props.winReason && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">勝ち筋（What we will win on）</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">{props.winReason}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">目標 KPI（編集中）</p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
        >
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">売上目標（円）</span>
          <input
            type="number"
            name="target_revenue"
            min={0}
            defaultValue={props.targetRevenue}
            placeholder="0"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">粗利目標（円）</span>
          <input
            type="number"
            name="target_gp"
            min={0}
            defaultValue={props.targetGp}
            placeholder="0"
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 font-mono tabular-nums"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">受注目標日</span>
          <input
            type="date"
            name="target_close_date"
            defaultValue={props.targetCloseDate ?? ''}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">勝ち筋（任意）</span>
        <textarea
          name="win_reason"
          rows={3}
          maxLength={500}
          defaultValue={props.winReason}
          placeholder="この案件で勝つために何が決め手か"
          className="w-full px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900 resize-y"
        />
      </label>

      <div className="flex items-center justify-between">
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && <p className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="w-3 h-3" />保存しました</p>}
        <button
          type="submit"
          disabled={pending}
          onClick={() => setTimeout(() => setEditing(false), 200)}
          className="ml-auto px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
