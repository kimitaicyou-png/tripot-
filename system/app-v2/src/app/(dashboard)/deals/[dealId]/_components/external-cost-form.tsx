'use client';

import { useActionState, useState } from 'react';
import { Check, Pencil, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { updateDealExternalCost, type ExternalCostState } from '@/lib/actions/deals';
import { formatYen } from '@/lib/format';
import { toast } from '@/components/ui/toaster';

const initialState: ExternalCostState = {};

type BudgetItem = {
  name: string;
  revenue: number;
  budget_cost: number;
  cost_label: string;
  gross_profit: number;
};

type BudgetResult = {
  items: BudgetItem[];
  total_revenue: number;
  total_budget_cost: number;
  total_gross_profit: number;
  gross_profit_rate: number;
  notes: string | null;
  suggested_external_cost: number;
  generated_at: string;
};

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

  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState<BudgetResult | null>(null);
  const [aiExpanded, setAiExpanded] = useState(true);

  const rateNum = grossProfitRate == null ? 0 : Number(grossProfitRate);
  const rateLabel = `${rateNum.toFixed(2)}%`;
  const profitTone =
    rateNum >= 50 ? 'text-emerald-700' : rateNum >= 20 ? 'text-amber-700' : 'text-red-700';

  async function handleAiEstimate() {
    if (aiRunning) return;
    setAiRunning(true);
    try {
      const res = await fetch('/api/ai/generate-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.error === 'no_estimate'
            ? json.message ?? '見積がまだ作成されていません'
            : json?.error === 'empty_estimate'
              ? '見積の明細が空です'
              : json?.error === 'ai_error'
                ? `AI エラー: ${json.message ?? '通信失敗'}`
                : json?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('原価の推定に失敗', { description: msg });
        return;
      }
      setAiResult(json as BudgetResult);
      setAiExpanded(true);
      toast.success('原価を推定しました', {
        description: `推定原価 ${formatYen((json as BudgetResult).total_budget_cost)} / 粗利率 ${(json as BudgetResult).gross_profit_rate.toFixed(1)}%`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('原価の推定に失敗', { description: msg });
    } finally {
      setAiRunning(false);
    }
  }

  function applySuggested() {
    if (!aiResult) return;
    setDraft(String(aiResult.suggested_external_cost));
    setEditing(true);
    toast.success('AI 推定値を編集欄に投入しました', {
      description: '「保存」ボタンで外注費を更新してください',
    });
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs uppercase tracking-widest text-gray-500">粗利の内訳</p>
        <div className="flex items-center gap-2">
          {!editing && (
            <>
              <button
                type="button"
                onClick={handleAiEstimate}
                disabled={aiRunning}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    推定中…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    AI で原価を推定
                  </>
                )}
              </button>
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
            </>
          )}
        </div>
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

      {/* AI 推定結果 */}
      {aiResult && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setAiExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors duration-150"
          >
            <span className="inline-flex items-center gap-2 text-xs text-gray-700">
              <Sparkles className="w-3.5 h-3.5" />
              AI 推定原価：
              <span className="font-mono tabular-nums text-gray-900 font-semibold">
                {formatYen(aiResult.total_budget_cost)}
              </span>
              <span className="text-gray-500">／粗利率</span>
              <span className="font-mono tabular-nums text-gray-900 font-semibold">
                {aiResult.gross_profit_rate.toFixed(1)}%
              </span>
            </span>
            {aiExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>

          {aiExpanded && (
            <div className="px-4 py-3 space-y-3">
              <ul className="divide-y divide-gray-100">
                {aiResult.items.map((item, idx) => (
                  <li
                    key={idx}
                    className="py-2 flex items-baseline justify-between gap-3 flex-wrap"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 font-medium">{item.name}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{item.cost_label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-500">
                        売上{' '}
                        <span className="font-mono tabular-nums text-gray-700">
                          {formatYen(item.revenue)}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500">
                        原価{' '}
                        <span className="font-mono tabular-nums text-gray-900 font-semibold">
                          {formatYen(item.budget_cost)}
                        </span>
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {aiResult.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-amber-900 leading-relaxed">{aiResult.notes}</p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-gray-700">
                  推奨外注費{' '}
                  <span className="font-mono tabular-nums text-gray-900 font-semibold">
                    {formatYen(aiResult.suggested_external_cost)}
                  </span>{' '}
                  をこの案件の外注費に投入できます
                </p>
                <button
                  type="button"
                  onClick={applySuggested}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98]"
                >
                  <Check className="w-3 h-3" />
                  この値で外注費を更新
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
