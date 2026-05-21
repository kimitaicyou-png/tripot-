/**
 * 年間 P/L 予実サマリー（売上 / 粗利 / 営業利益）
 *
 * 隊長思想「行動 → 全社 → PL/CF」の budget 年間レイヤー強化。
 * 既存の月別売上 vs 予算テーブルに加え、PL の 3 行（売上・粗利・営業利益）の
 * 年間サマリーを 1 セクションで提供する。
 *
 * 販管費は MoneyForward 接続前は手動入力（OpexInputForm）の合計、
 * MF 接続後は actual_opex に置換予定。
 */

import { formatYen, formatMan } from '@/lib/format';

function rateColor(rate: number): string {
  if (rate >= 100) return 'text-emerald-700';
  if (rate >= 80) return 'text-gray-900';
  return 'text-red-700';
}

function barColor(rate: number): string {
  if (rate >= 100) return 'bg-emerald-500';
  if (rate >= 80) return 'bg-blue-500';
  return 'bg-amber-500';
}

type Row = {
  label: string;
  target: number;
  actual: number;
  hint?: string;
};

function PLRow({ label, target, actual, hint }: Row) {
  const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
  const diff = actual - target;
  return (
    <div className="grid grid-cols-12 gap-2 items-center py-3 border-b border-gray-100 last:border-0">
      <div className="col-span-12 md:col-span-3">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        {hint && <p className="text-[10px] text-gray-500 truncate mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-4 md:col-span-2 text-right md:text-left">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">目標</p>
        <p
          className="font-mono tabular-nums text-sm text-gray-900 truncate"
          title={formatYen(target)}
        >
          {formatMan(target)}
        </p>
      </div>
      <div className="col-span-4 md:col-span-2 text-right md:text-left">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">実績</p>
        <p
          className="font-mono tabular-nums text-sm text-gray-900 truncate"
          title={formatYen(actual)}
        >
          {formatMan(actual)}
        </p>
      </div>
      <div className="col-span-4 md:col-span-1 text-right md:text-left">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">差</p>
        <p
          className={`font-mono tabular-nums text-sm truncate ${
            diff >= 0 ? 'text-emerald-700' : 'text-red-700'
          }`}
          title={formatYen(diff)}
        >
          {diff >= 0 ? '+' : ''}
          {formatMan(diff)}
        </p>
      </div>
      <div className="col-span-12 md:col-span-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor(rate)}`}
              style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
            />
          </div>
          <p
            className={`font-mono tabular-nums text-sm font-semibold shrink-0 ${rateColor(rate)}`}
          >
            {target > 0 ? `${rate}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export function YearlyPlSummary({
  year,
  totalTargetRevenue,
  totalActualRevenue,
  totalTargetGrossProfit,
  totalActualGrossProfit,
  totalTargetOperatingProfit,
  totalActualOperatingProfit,
  totalOpex,
  opexMonths,
}: {
  year: number;
  totalTargetRevenue: number;
  totalActualRevenue: number;
  totalTargetGrossProfit: number;
  totalActualGrossProfit: number;
  totalTargetOperatingProfit: number;
  totalActualOperatingProfit: number;
  totalOpex: number;
  opexMonths: number;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-baseline justify-between mb-4 gap-2 flex-wrap">
        <h3 className="text-sm font-semibold text-gray-900">
          {year} 年 P/L 予実サマリー
        </h3>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
          全社合計
        </p>
      </div>

      <div className="space-y-0">
        <PLRow
          label="売上"
          target={totalTargetRevenue}
          actual={totalActualRevenue}
          hint="入金確定 + 請求済（deals.amount 集計）"
        />
        <PLRow
          label="粗利"
          target={totalTargetGrossProfit}
          actual={totalActualGrossProfit}
          hint="売上 − 外注費（deals.gross_profit generated column）"
        />
        <PLRow
          label="営業利益"
          target={totalTargetOperatingProfit}
          actual={totalActualOperatingProfit}
          hint={`粗利 − 販管費（手動入力 ${formatMan(totalOpex)} / ${opexMonths} ヶ月分、MF 接続後に自動化）`}
        />
      </div>

      {opexMonths === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
          販管費がまだ入力されていません。月次ダッシュボード（/monthly）の販管費欄から手動入力できます。
          営業利益の実績は粗利と同値で表示中。
        </p>
      )}
    </section>
  );
}
