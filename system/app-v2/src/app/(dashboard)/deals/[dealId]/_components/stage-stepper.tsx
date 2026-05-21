import { Check, Circle, Dot } from 'lucide-react';
import { TRIPOT_CONFIG, type StageDef } from '../../../../../../coaris.config';

/**
 * tripot 案件ステージ Stepper（縦型）
 *
 * 隊長指摘 (2026-05-20)「動線の中にステージがどうしたら変わるのか？見込み→提案が全く分からん」
 * への直接の解答。
 *
 * 設計（4 体合議統合）:
 * - 縦型（美冬推奨、9 段階を横にすると画面狭い、モバイル耐性、受託開発の真面目さ）
 * - 各 stage に guidance 文章を併記（秋美の Salesforce Path 型ガイダンス採用）
 * - 各 stage に cashflowWeight を %表示（隊長思想「行動 → PL/CF」の動く実装、既存 config 資産）
 * - 通過済 / 現在地 / 未来 / 失注 を視覚的に区別（dot / 強調 / 半透明 / 赤）
 *
 * Server Component（インタラクション無し、表示のみ）。
 * バッジクリックでの変更は InlineStageChanger が担当。
 */

const VISIBLE_KEYS = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
];

function StageRow({
  stage,
  state,
}: {
  stage: StageDef;
  state: 'past' | 'current' | 'future';
}) {
  const isDone = state === 'past';
  const isCurrent = state === 'current';
  const cashflowPercent = Math.round(stage.cashflowWeight * 100);

  const iconCircleClass = isDone
    ? 'bg-gray-900 text-white border-gray-900'
    : isCurrent
      ? 'bg-white text-gray-900 border-gray-900 ring-4 ring-gray-900/10'
      : 'bg-white text-gray-400 border-gray-200';

  const labelClass = isCurrent
    ? 'text-gray-900 font-semibold'
    : isDone
      ? 'text-gray-700'
      : 'text-gray-500';

  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${iconCircleClass}`}
        >
          {isDone ? (
            <Check className="w-4 h-4" />
          ) : isCurrent ? (
            <Dot className="w-5 h-5" />
          ) : (
            <Circle className="w-3 h-3" />
          )}
        </div>
      </div>

      <div className="flex-1 min-w-0 pb-6">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className={`text-sm ${labelClass}`}>{stage.label}</span>
          <span
            className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
              isCurrent
                ? 'bg-gray-900 text-white'
                : isDone
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-50 text-gray-400'
            }`}
            title="CF 確度（このステージに到達した時点のキャッシュフロー予測加重）"
          >
            CF {cashflowPercent}%
          </span>
        </div>
        {stage.guidance && (
          <p
            className={`text-xs mt-1.5 leading-relaxed ${
              isCurrent
                ? 'text-gray-700'
                : isDone
                  ? 'text-gray-500'
                  : 'text-gray-400'
            }`}
          >
            {stage.guidance}
          </p>
        )}
      </div>
    </li>
  );
}

export function StageStepper({ currentStage }: { currentStage: string }) {
  const allStages = TRIPOT_CONFIG.stages;
  const currentDef = allStages.find((s) => s.key === currentStage);
  const isLost = currentStage === 'lost';

  // 失注時は専用表示
  if (isLost) {
    const lostDef = allStages.find((s) => s.key === 'lost');
    return (
      <section className="bg-white border border-red-200 rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
            <Dot className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-800">失注</p>
            {lostDef?.guidance && (
              <p className="text-xs text-red-700 mt-1">{lostDef.guidance}</p>
            )}
          </div>
        </div>
      </section>
    );
  }

  const currentOrder = currentDef?.order ?? 0;

  const visibleStages = allStages.filter((s) => VISIBLE_KEYS.includes(s.key));

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">案件ステージ</h3>
        <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
          毎日の行動が PL/CF まで自動で流れます
        </p>
      </div>
      <ol className="relative">
        <span
          aria-hidden="true"
          className="absolute left-4 top-4 bottom-4 w-px bg-gray-200"
        />
        {visibleStages.map((stage) => {
          const state: 'past' | 'current' | 'future' =
            stage.key === currentStage
              ? 'current'
              : stage.order < currentOrder
                ? 'past'
                : 'future';
          return <StageRow key={stage.key} stage={stage} state={state} />;
        })}
      </ol>
    </section>
  );
}
