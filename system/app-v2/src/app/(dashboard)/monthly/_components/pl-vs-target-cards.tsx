/**
 * 粗利 / 営業利益 / CF 加重パイプライン の予実カード（3 枚）
 *
 * 隊長思想「行動 → 週次 → 月次 → 全社 → PL/CF」の月次レイヤー強化。
 * 売上だけでなく PL の核（粗利 / 営業利益）と CF 見通しを画面に出す。
 *
 * 販管費は MoneyForward 接続前は手動入力（OpexInputForm 経由で companies.config に保存）。
 * MF 接続後は actual_opex は MF transactions から自動算出に置換される。
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

type CardProps = {
  label: string;
  target: number;
  actual: number;
  hint?: string;
};

function PLCard({ label, target, actual, hint }: CardProps) {
  const rate = target > 0 ? Math.round((actual / target) * 100) : 0;
  const diff = actual - target;
  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-baseline justify-between mb-3 gap-2">
        <p className="text-xs uppercase tracking-widest text-gray-500 truncate">{label}</p>
        <p
          className={`font-semibold text-2xl tabular-nums leading-none shrink-0 ${rateColor(rate)}`}
        >
          {target > 0 ? `${rate}%` : '—'}
        </p>
      </div>
      <p className="font-mono tabular-nums text-2xl text-gray-900 mb-1 truncate">
        {formatMan(actual)}
      </p>
      <p className="text-xs text-gray-500 truncate">
        目標 <span className="font-mono tabular-nums text-gray-700">{formatMan(target)}</span>
        {target > 0 && (
          <>
            {' '}差{' '}
            <span
              className={`font-mono tabular-nums ${diff >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {diff >= 0 ? '+' : ''}
              {formatMan(diff)}
            </span>
          </>
        )}
      </p>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
        <div
          className={`h-full rounded-full transition-all ${barColor(rate)}`}
          style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
        />
      </div>
      {hint && <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">{hint}</p>}
    </section>
  );
}

export function PlVsTargetCards({
  targetGrossProfit,
  actualGrossProfit,
  targetOperatingProfit,
  actualOperatingProfit,
  opexInput,
  cfForecast,
  cfBreakdown,
}: {
  targetGrossProfit: number;
  actualGrossProfit: number;
  targetOperatingProfit: number;
  actualOperatingProfit: number;
  opexInput: number;
  cfForecast: number;
  cfBreakdown: Array<{ stage: string; label: string; amount: number; weight: number }>;
}) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <PLCard
          label="粗利"
          target={targetGrossProfit}
          actual={actualGrossProfit}
          hint="入金確定 + 請求済の粗利合計（generated column）"
        />
        <PLCard
          label="営業利益"
          target={targetOperatingProfit}
          actual={actualOperatingProfit}
          hint={`粗利 − 販管費（手動入力 ${formatMan(opexInput)}、MF 接続後に自動化）`}
        />
        <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-baseline justify-between mb-3 gap-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 truncate">
              翌月 CF 見通し
            </p>
            <p className="text-[10px] font-mono uppercase text-gray-400 shrink-0">加重</p>
          </div>
          <p className="font-mono tabular-nums text-2xl text-gray-900 mb-1 truncate">
            {formatMan(cfForecast)}
          </p>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            パイプライン × CF 確度（提案 30% / 受注 70% / 請求 95% / 入金 100%）
          </p>
          {cfBreakdown.length > 0 && (
            <ul className="mt-3 space-y-1 text-[11px]">
              {cfBreakdown.map((b) => (
                <li
                  key={b.stage}
                  className="flex items-baseline justify-between gap-2 text-gray-600"
                >
                  <span className="truncate">
                    {b.label}{' '}
                    <span className="font-mono tabular-nums text-gray-400">
                      ({Math.round(b.weight * 100)}%)
                    </span>
                  </span>
                  <span className="font-mono tabular-nums text-gray-700 shrink-0">
                    {formatYen(b.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  );
}
