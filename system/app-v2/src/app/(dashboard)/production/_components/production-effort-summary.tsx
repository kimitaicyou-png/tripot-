import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

/**
 * 制作カード工数の予実サマリー（進行中ベース）
 *
 * 隊長思想「行動 → 全社 → PL/CF」の制作レイヤー強化。
 * 工数予算 vs 実績、消化率、遅延 cards 数を 1 画面で可視化。
 *
 * 入力：進行中（cancelled/delivered 除外）の cards 集計
 */

function formatHours(value: number): string {
  return `${value.toLocaleString('ja-JP')}h`;
}

export function ProductionEffortSummary({
  totalEstimated,
  totalActual,
  overdueCount,
  buildingCount,
}: {
  totalEstimated: number;
  totalActual: number;
  overdueCount: number;
  buildingCount: number;
}) {
  const consumptionRate =
    totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;
  const remaining = Math.max(totalEstimated - totalActual, 0);

  const rateColor =
    consumptionRate > 100
      ? 'text-red-700'
      : consumptionRate >= 80
        ? 'text-amber-700'
        : 'text-gray-900';

  const barColor =
    consumptionRate > 100
      ? 'bg-red-500'
      : consumptionRate >= 80
        ? 'bg-amber-500'
        : 'bg-blue-500';

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-2 flex-wrap mb-4">
        <h3 className="text-sm font-semibold text-gray-900">工数の予実（進行中カード）</h3>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          見積 vs 実績
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="overflow-hidden">
          <p className="text-xs text-gray-500 inline-flex items-center gap-1 truncate">
            <Clock className="w-3 h-3" />
            予算工数
          </p>
          <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1 truncate">
            {formatHours(totalEstimated)}
          </p>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs text-gray-500 truncate">実績工数</p>
          <p className="font-semibold text-2xl text-gray-900 tabular-nums mt-1 truncate">
            {formatHours(totalActual)}
          </p>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs text-gray-500 truncate">残工数</p>
          <p
            className={`font-semibold text-2xl tabular-nums mt-1 truncate ${
              remaining === 0 && totalEstimated > 0 ? 'text-emerald-700' : 'text-gray-900'
            }`}
          >
            {formatHours(remaining)}
          </p>
        </div>
        <div className="overflow-hidden">
          <p className="text-xs text-gray-500 inline-flex items-center gap-1 truncate">
            <AlertTriangle className="w-3 h-3" />
            遅延 14d 超
          </p>
          <p
            className={`font-semibold text-2xl tabular-nums mt-1 truncate ${
              overdueCount > 0 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {overdueCount}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-xs">
          <p className="text-gray-500">予算消化率</p>
          <p className={`font-semibold tabular-nums ${rateColor}`}>
            {totalEstimated > 0 ? `${consumptionRate}%` : '— %'}
          </p>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(consumptionRate, 100)}%` }}
          />
        </div>
        {consumptionRate > 100 && (
          <p className="text-xs text-red-700 flex items-center gap-1 mt-2">
            <AlertTriangle className="w-3 h-3" />
            予算超過 {Math.round(consumptionRate - 100)}% — 想定外原価が発生中
          </p>
        )}
        {consumptionRate <= 80 && totalEstimated > 0 && buildingCount > 0 && (
          <p className="text-xs text-emerald-700 flex items-center gap-1 mt-2">
            <CheckCircle2 className="w-3 h-3" />
            予算内で進行中（{buildingCount} 件 building）
          </p>
        )}
      </div>
    </section>
  );
}
