'use client';

import { useActionState, useState } from 'react';
import { Check } from 'lucide-react';
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
      ? 'text-gray-700'
      : days < 0
        ? 'text-red-700'
        : days < 30
          ? 'text-amber-700'
          : 'text-gray-900';

  if (!editing) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-gray-500">継続案件 管理</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
          >
            編集
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">月額</p>
            <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1">
              {formatYen(props.monthlyAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">次回更新日</p>
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
            <p className="text-xs text-gray-500">自動更新</p>
            <p className="text-base text-gray-900 mt-1">{props.autoRenew ? '◯ 有効' : '— 手動'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">継続回数</p>
            <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1">{props.renewalCount}</p>
          </div>
        </div>

        {props.renewalNote && (
          <div className="pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">更新メモ</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{props.renewalNote}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">継続案件 管理（編集中）</p>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-gray-700 hover:text-gray-900 transition-colors"
        >
          キャンセル
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">次回更新日</span>
          <input
            type="date"
            name="next_renewal_date"
            defaultValue={props.nextRenewalDate ?? ''}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-gray-500">継続回数（過去）</span>
          <input
            type="number"
            name="renewal_count"
            min={0}
            max={999}
            defaultValue={props.renewalCount}
            className="px-3 py-2 text-sm bg-bg border border-gray-200 rounded focus:outline-none focus:border-gray-900"
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
        <span className="text-sm text-gray-900">自動更新を有効にする</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-widest font-medium text-gray-500">更新メモ（任意）</span>
        <textarea
          name="renewal_note"
          rows={3}
          maxLength={500}
          defaultValue={props.renewalNote}
          placeholder="更新時の特記事項・条件変更等"
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
