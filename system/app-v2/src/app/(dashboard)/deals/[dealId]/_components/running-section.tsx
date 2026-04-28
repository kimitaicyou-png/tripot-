'use client';

import { useActionState, useState } from 'react';
import { updateDealRunningMeta, type RunningMetaState } from '@/lib/actions/deals';

const initialState: RunningMetaState = {};

type Props = {
  dealId: string;
  monthlyAmount: number | null;
  nextRenewalDate: string | null;
  autoRenew: boolean;
  renewalCount: number;
  renewalNote: string;
};

function formatYen(v: number | null): string {
  return `¥${(v ?? 0).toLocaleString('ja-JP')}`;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function RunningSection(props: Props) {
  const action = updateDealRunningMeta.bind(null, props.dealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [editing, setEditing] = useState(false);

  const days = daysUntil(props.nextRenewalDate);
  const renewalTone =
    days === null
      ? 'text-muted'
      : days < 0
        ? 'text-red-700'
        : days < 30
          ? 'text-amber-700'
          : 'text-ink';

  if (!editing) {
    return (
      <section className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-subtle">継続案件 管理</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-muted hover:text-ink transition-colors"
          >
            編集
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-subtle">月額</p>
            <p className="font-semibold text-2xl text-ink tabular-nums mt-1">
              {formatYen(props.monthlyAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-subtle">次回更新日</p>
            <p className={`font-mono tabular-nums text-base mt-1 ${renewalTone}`}>
              {props.nextRenewalDate ?? '—'}
            </p>
            {days !== null && (
              <p className={`text-xs mt-0.5 ${renewalTone}`}>
                {days < 0 ? `${Math.abs(days)}日経過` : days === 0 ? '本日' : `あと${days}日`}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-subtle">自動更新</p>
            <p className="text-base text-ink mt-1">{props.autoRenew ? '◯ 有効' : '— 手動'}</p>
          </div>
          <div>
            <p className="text-xs text-subtle">継続回数</p>
            <p className="font-semibold text-2xl text-ink tabular-nums mt-1">{props.renewalCount}</p>
          </div>
        </div>

        {props.renewalNote && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-subtle mb-1">更新メモ</p>
            <p className="text-sm text-ink whitespace-pre-wrap">{props.renewalNote}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-subtle">継続案件 管理（編集中）</p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">次回更新日</span>
          <input
            type="date"
            name="next_renewal_date"
            defaultValue={props.nextRenewalDate ?? ''}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">継続回数（過去）</span>
          <input
            type="number"
            name="renewal_count"
            min={0}
            max={999}
            defaultValue={props.renewalCount}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          />
        </label>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="auto_renew"
          defaultChecked={props.autoRenew}
          className="w-4 h-4"
        />
        <span className="text-sm text-ink">自動更新を有効にする</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-subtle">更新メモ（任意）</span>
        <textarea
          name="renewal_note"
          rows={3}
          maxLength={500}
          defaultValue={props.renewalNote}
          placeholder="更新時の特記事項・条件変更等"
          className="w-full px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink resize-y"
        />
      </label>

      <div className="flex items-center justify-between">
        {state.errors?._form && (
          <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
        )}
        {state.success && <p className="text-xs text-emerald-700">✓ 保存しました</p>}
        <button
          type="submit"
          disabled={pending}
          onClick={() => setTimeout(() => setEditing(false), 200)}
          className="ml-auto px-4 py-1.5 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {pending ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}
