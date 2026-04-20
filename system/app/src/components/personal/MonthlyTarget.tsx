'use client';

import { useState } from 'react';

export type MonthlyTarget = {
  month: string;
  revenueTarget: number;
  grossProfitTarget: number;
  grossMarginTarget: number;
};

export type MonthlyActual = {
  shotRevenue: number;
  runningRevenue: number;
  totalRevenue: number;
  cost: number;
  grossProfit: number;
  grossMarginRate: number;
};

type Props = {
  target: MonthlyTarget;
  actual: MonthlyActual;
  onTargetChange?: (target: MonthlyTarget) => void;
  editable?: boolean;
};

export const MOCK_TARGET: MonthlyTarget = {
  month: '',
  revenueTarget: 0,
  grossProfitTarget: 0,
  grossMarginTarget: 0,
};

export const MOCK_ACTUAL: MonthlyActual = {
  shotRevenue: 0,
  runningRevenue: 0,
  totalRevenue: 0,
  cost: 0,
  grossProfit: 0,
  grossMarginRate: 0,
};

function formatMan(amount: number): string {
  return `¥${Math.floor(amount / 10000).toLocaleString()}万`;
}

function achievementRate(actual: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((actual / target) * 100);
}

function barColor(rate: number, isMargin?: boolean): string {
  if (isMargin) return 'bg-blue-600';
  if (rate >= 95) return 'bg-blue-600';
  if (rate >= 80) return 'bg-blue-600';
  return 'bg-red-600';
}

function rateTextColor(rate: number): string {
  if (rate >= 95) return 'text-gray-900';
  if (rate >= 80) return 'text-blue-600';
  return 'text-red-600';
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${year}年${parseInt(m, 10)}月`;
}

function CompactView({ target, actual }: { target: MonthlyTarget; actual: MonthlyActual }) {
  const revenueRate = achievementRate(actual.totalRevenue, target.revenueTarget);
  const profitRate = achievementRate(actual.grossProfit, target.grossProfitTarget);
  const marginAchieved = actual.grossMarginRate >= target.grossMarginTarget;
  const revenueGap = target.revenueTarget - actual.totalRevenue;
  const profitGap = target.grossProfitTarget - actual.grossProfit;

  return (
    <div className="border border-gray-200 rounded-lg bg-white px-4 py-4 space-y-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {formatMonthLabel(target.month)}の目標
      </p>

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs text-gray-500 shrink-0">売上</span>
              <span className="text-xs text-gray-500 tabular-nums">{formatMan(target.revenueTarget)}</span>
              <span className="text-gray-500 text-xs">→</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatMan(actual.totalRevenue)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-xs font-semibold tabular-nums ${rateTextColor(revenueRate)}`}>
                {revenueRate}%
              </span>
              {revenueGap > 0 && (
                <span className="text-xs text-gray-500 tabular-nums">残{formatMan(revenueGap)}</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor(revenueRate)}`}
              style={{ width: `${Math.min(revenueRate, 100)}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-xs text-gray-500 shrink-0">粗利</span>
              <span className="text-xs text-gray-500 tabular-nums">{formatMan(target.grossProfitTarget)}</span>
              <span className="text-gray-500 text-xs">→</span>
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatMan(actual.grossProfit)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <span className={`text-xs font-semibold tabular-nums ${rateTextColor(profitRate)}`}>
                {profitRate}%
              </span>
              {profitGap > 0 && (
                <span className="text-xs text-gray-500 tabular-nums">残{formatMan(profitGap)}</span>
              )}
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor(profitRate)}`}
              style={{ width: `${Math.min(profitRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-gray-500">粗利率</span>
            <span className="text-xs text-gray-500 tabular-nums">{target.grossMarginTarget}%</span>
            <span className="text-gray-500 text-xs">→</span>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">{actual.grossMarginRate}%</span>
          </div>
          {marginAchieved ? (
            <span className="text-xs font-semibold text-blue-600">達成 ✓</span>
          ) : (
            <span className="text-xs font-semibold text-red-600">
              {actual.grossMarginRate}% / 目標{target.grossMarginTarget}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


function EditView({ target, onTargetChange }: { target: MonthlyTarget; onTargetChange?: (t: MonthlyTarget) => void }) {
  const [draft, setDraft] = useState<MonthlyTarget>(target);

  const handleSave = () => {
    if (onTargetChange) {
      onTargetChange(draft);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg bg-white px-4 py-4 space-y-4">
      <p className="text-sm font-semibold text-gray-900">目標設定</p>

      <div className="space-y-3">
        <div>
          <label htmlFor="revenueTarget" className="block text-xs font-medium text-gray-700 mb-1">
            売上目標（円）<span className="text-red-600">*</span>
          </label>
          <input
            id="revenueTarget"
            type="number"
            min={0}
            step={10000}
            value={draft.revenueTarget}
            onChange={(e) => setDraft({ ...draft, revenueTarget: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm tabular-nums focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-0.5">{formatMan(draft.revenueTarget)}</p>
        </div>

        <div>
          <label htmlFor="grossProfitTarget" className="block text-xs font-medium text-gray-700 mb-1">
            粗利目標（円）<span className="text-red-600">*</span>
          </label>
          <input
            id="grossProfitTarget"
            type="number"
            min={0}
            step={10000}
            value={draft.grossProfitTarget}
            onChange={(e) => setDraft({ ...draft, grossProfitTarget: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm tabular-nums focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
          <p className="text-xs text-gray-500 mt-0.5">{formatMan(draft.grossProfitTarget)}</p>
        </div>

        <div>
          <label htmlFor="grossMarginTarget" className="block text-xs font-medium text-gray-700 mb-1">
            粗利率目標（%）<span className="text-red-600">*</span>
          </label>
          <input
            id="grossMarginTarget"
            type="number"
            min={0}
            max={100}
            step={1}
            value={draft.grossMarginTarget}
            onChange={(e) => setDraft({ ...draft, grossMarginTarget: Number(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-200 rounded text-sm tabular-nums focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
      >
        保存
      </button>
    </div>
  );
}

export function MonthlyTarget({ target, actual, onTargetChange, editable = false }: Props) {
  if (editable) {
    return <EditView target={target} onTargetChange={onTargetChange} />;
  }
  return <CompactView target={target} actual={actual} />;
}
