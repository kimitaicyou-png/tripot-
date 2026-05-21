import Link from 'next/link';
import { Briefcase } from 'lucide-react';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';

/**
 * 案件パイプライン Kanban view（Server Component）
 *
 * 隊長指摘 (2026-05-20)「動線が多いと迷う」+「会議準備ゼロ」思想への対応。
 * リスト形式だと 9 stage × 縦に長く、stage 全体の俯瞰が難しい。
 * 横スクロールの列レイアウトで「どこに何件あるか」を一目で把握できるようにする。
 *
 * 各列：stage 名 + cashflowWeight + 件数 + 合計金額（CF 加重）
 * 各カード：タイトル + 顧客 + 金額 + 担当 + 粗利率
 * カードクリックで案件詳細へ。ドラッグ&ドロップは次フェーズ（まず表示のみ）。
 *
 * 失注（lost）は CF 加重 0 のため別扱い、デフォルトでは末尾に小さく表示。
 */

type DealItem = {
  id: string;
  title: string;
  stage: string;
  amount: number | null;
  monthly_amount: number | null;
  revenue_type: string;
  assignee_name: string | null;
  customer_name: string | null;
  updated_at: Date;
  gross_profit: number | null;
  gross_profit_rate: string | number | null;
};

function formatYen(value: number | null | undefined): string {
  if (!value) return '¥0';
  return `¥${value.toLocaleString('ja-JP')}`;
}

function formatShortYen(value: number | null | undefined): string {
  if (!value) return '¥0';
  if (value >= 10_000_000) return `¥${(value / 10_000_000).toFixed(1)}千万`;
  if (value >= 10_000) return `¥${Math.round(value / 10_000)}万`;
  return `¥${value.toLocaleString('ja-JP')}`;
}

export function DealsKanban({ deals }: { deals: DealItem[] }) {
  const allStages = TRIPOT_CONFIG.stages;

  // lost を除いた 8 段が主軸
  const mainStages = allStages.filter((s) => s.key !== 'lost');
  const lostDeals = deals.filter((d) => d.stage === 'lost');

  return (
    <div className="space-y-6">
      {/* 横スクロール Kanban */}
      <div className="overflow-x-auto -mx-6 px-6 pb-4">
        <div className="flex gap-3 min-w-max">
          {mainStages.map((stageDef) => {
            const items = deals.filter((d) => d.stage === stageDef.key);
            const total = items.reduce((s, d) => s + (d.amount ?? 0), 0);
            const cashflowWeighted = Math.round(total * stageDef.cashflowWeight);
            const cashflowPercent = Math.round(stageDef.cashflowWeight * 100);

            return (
              <section
                key={stageDef.key}
                className="w-72 shrink-0 bg-gray-50 border border-gray-200 rounded-xl"
              >
                {/* 列ヘッダー */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white rounded-t-xl">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${stageDef.badgeClass}`}
                    >
                      {stageDef.label}
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-gray-500">
                      CF {cashflowPercent}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono tabular-nums text-gray-700">
                      {items.length} 件
                    </span>
                    <span className="font-mono tabular-nums text-gray-900 font-semibold">
                      {formatShortYen(total)}
                    </span>
                  </div>
                  {cashflowWeighted > 0 && cashflowWeighted !== total && (
                    <p className="text-[10px] font-mono tabular-nums text-gray-500 mt-0.5">
                      加重 {formatShortYen(cashflowWeighted)}
                    </p>
                  )}
                </div>

                {/* カード列 */}
                <div className="p-2 space-y-2 min-h-[80px] max-h-[640px] overflow-y-auto">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-6">
                      （0 件）
                    </p>
                  ) : (
                    items.map((d) => {
                      const rate =
                        d.gross_profit_rate == null
                          ? null
                          : Number(d.gross_profit_rate);
                      return (
                        <Link
                          key={d.id}
                          href={`/deals/${d.id}`}
                          className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-400 active:scale-[0.99] transition-all duration-150"
                        >
                          <p className="text-sm text-gray-900 font-medium leading-tight line-clamp-2">
                            {d.title}
                          </p>
                          {d.customer_name && (
                            <p className="text-[11px] text-gray-600 mt-1.5 truncate">
                              {d.customer_name}
                            </p>
                          )}
                          <div className="flex items-baseline justify-between gap-2 mt-2">
                            <span className="font-mono tabular-nums text-sm text-gray-900 font-semibold">
                              {formatShortYen(d.amount)}
                            </span>
                            {rate !== null && (d.amount ?? 0) > 0 && (
                              <span
                                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                                  rate >= 50
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : rate >= 20
                                      ? 'bg-amber-50 text-amber-700'
                                      : 'bg-red-50 text-red-700'
                                }`}
                                title={`粗利 ${formatYen(d.gross_profit)} / 粗利率 ${rate.toFixed(2)}%`}
                              >
                                {rate.toFixed(0)}%
                              </span>
                            )}
                          </div>
                          {d.revenue_type !== 'spot' && d.monthly_amount ? (
                            <p className="text-[10px] text-amber-700 font-mono tabular-nums mt-0.5">
                              月 {formatShortYen(d.monthly_amount)}
                            </p>
                          ) : null}
                          {d.assignee_name && (
                            <p className="text-[10px] text-gray-500 mt-1.5 truncate">
                              {d.assignee_name}
                            </p>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* 失注は別扱い・末尾 */}
      {lostDeals.length > 0 && (
        <details className="bg-white border border-gray-200 rounded-xl">
          <summary className="cursor-pointer list-none px-5 py-3 hover:bg-gray-50 active:scale-[0.998] rounded-xl">
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="w-4 h-4 text-red-700" />
              <span className="text-gray-900 font-medium">失注</span>
              <span className="font-mono tabular-nums text-xs text-gray-500">
                {lostDeals.length} 件
              </span>
              <span className="text-xs text-gray-500 ml-auto">クリックで表示</span>
            </div>
          </summary>
          <div className="px-5 pb-5 pt-2 border-t border-gray-100 space-y-2">
            {lostDeals.map((d) => (
              <Link
                key={d.id}
                href={`/deals/${d.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-400"
              >
                <p className="text-sm text-gray-900 font-medium">{d.title}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {d.customer_name ?? '—'} · {formatYen(d.amount)}
                </p>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
