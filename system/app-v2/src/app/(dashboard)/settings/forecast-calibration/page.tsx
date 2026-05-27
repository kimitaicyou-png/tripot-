import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, TrendingUp, AlertTriangle } from 'lucide-react';
import { auth } from '@/auth';
import { computeForecastCalibration } from '@/lib/deals/forecast-calibration';
import { PageHeader } from '@/components/ui/page-header';
import { formatPercent } from '@/lib/format';

/**
 * ヨミ予測売上 実測キャリブレーション（秋美レビュー C-4 改良 2、隊長明示 2026-05-27 11:22 UI 化）
 *
 * 業界共通の罠「A=1.0 / B=0.8 ... のデフォルト % は convention、自社実測ではない」への対処。
 * 3-6 ヶ月運用後の実勝率で CONFIDENCE_WEIGHT を上書きする判断材料を提供。
 */
const LOOKBACK_DAYS_DEFAULT = 90; // 3 ヶ月

const CONFIDENCE_LABEL_JA: Record<string, string> = {
  a: 'A（見積以降）',
  b: 'B（補助金待ち等）',
  c: 'C（提案中）',
  d: 'D（アポ段階）',
  e: 'E（見込み）',
  expected: '想定',
  continuing: '継続',
};

export default async function ForecastCalibrationPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.company_id) redirect('/login');

  const { days: daysParam } = await searchParams;
  const lookbackDays = Math.max(30, Math.min(365, Number(daysParam) || LOOKBACK_DAYS_DEFAULT));
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - lookbackDays);

  const calibration = await computeForecastCalibration({
    companyId: session.user.company_id,
    sinceDate,
  });

  const totalSamples = calibration.byConfidence.reduce((s, b) => s + b.totalSampleSize, 0);
  const hasEnoughData = totalSamples >= 30;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          設定
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">ヨミ予測売上 実測キャリブレーション</h1>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <PageHeader
          eyebrow="CALIBRATION"
          title="A〜E ランクの実勝率"
          subtitle={
            <>
              過去 <span className="font-mono tabular-nums text-gray-900">{lookbackDays}</span> 日に
              決着（入金 or 失注）した案件で、案件作成時の確度別に実勝率を集計。
              デフォルト % との乖離が大きい場合は実測値で書き換えるのが業界標準（HubSpot Mark Roberge / Salesforce ベストプラクティス）。
            </>
          }
        />

        {/* 期間切替 */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-700">集計期間：</span>
          {[30, 60, 90, 180, 365].map((d) => (
            <Link
              key={d}
              href={`/settings/forecast-calibration?days=${d}`}
              className={`px-2.5 py-1 rounded-lg ${
                d === lookbackDays
                  ? 'bg-gray-900 text-white font-medium'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {d} 日
            </Link>
          ))}
        </div>

        {!hasEnoughData && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2 text-xs text-amber-900">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">サンプルサイズ不足</p>
              <p>
                対象期間内に決着した案件 <span className="font-mono tabular-nums">{totalSamples}</span> 件
                （30 件未満）。3-6 ヶ月以上運用してから判定推奨。現状の集計値は参考程度に扱う。
              </p>
            </div>
          </div>
        )}

        {calibration.warnings.length > 0 && hasEnoughData && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1 text-xs text-amber-900">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              注意（ランク別サンプル不足）
            </p>
            <ul className="space-y-0.5 pl-5 list-disc">
              {calibration.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* メイン table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-[11px] font-medium text-gray-700">確度</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">サンプル</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">受注</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">実勝率</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">現在の係数</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">提案係数</th>
                <th className="px-4 py-2 text-right text-[11px] font-medium text-gray-700">乖離</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calibration.byConfidence.map((row) => {
                const deviationPct = row.deviation * 100;
                const deviationTone =
                  Math.abs(deviationPct) < 10
                    ? 'text-gray-600'
                    : deviationPct > 0
                      ? 'text-emerald-700'
                      : 'text-rose-700';
                const sampleWarning = row.totalSampleSize < 30;
                return (
                  <tr key={row.confidence}>
                    <td className="px-4 py-2 text-gray-900 font-medium">
                      {CONFIDENCE_LABEL_JA[row.confidence] ?? row.confidence}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono tabular-nums ${
                        sampleWarning ? 'text-amber-700' : 'text-gray-900'
                      }`}
                    >
                      {row.totalSampleSize}
                      {sampleWarning && <span className="text-[10px] ml-1">⚠</span>}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900">
                      {row.actualWonCount}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900 font-semibold">
                      {formatPercent(row.actualWonRate)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-600">
                      {formatPercent(row.currentDefaultWeight)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-gray-900 font-semibold">
                      {formatPercent(row.suggestedWeight)}
                    </td>
                    <td className={`px-4 py-2 text-right font-mono tabular-nums ${deviationTone}`}>
                      {deviationPct >= 0 ? '+' : ''}
                      {deviationPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 注意書き */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-700 space-y-2 leading-relaxed">
          <p className="flex items-center gap-1.5 font-semibold text-gray-900">
            <TrendingUp className="w-3.5 h-3.5" />
            運用ガイド
          </p>
          <ul className="space-y-1 list-disc pl-5">
            <li>
              <strong>各ランクのサンプルが 30 件以上溜まったら、提案係数で CONFIDENCE_WEIGHT 定数を上書き</strong>を検討
              （`src/lib/deals/forecast-weight.ts`）
            </li>
            <li>
              「実勝率」は作成時の主観確度 → 実際に paid に到達した割合（lost を含まない確率）
            </li>
            <li>
              業界共通の罠：HubSpot / Salesforce のデフォルト確度も実測と一致しない、自社実測で再キャリブレーションするのがベスト
              （forecastio.ai 集約、Mark Roberge 推奨）
            </li>
            <li>
              30 件未満の段階で書き換えると逆に精度が落ちる、サンプル不足ランクは現状維持を推奨
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
