import { ChevronDown, Sparkles, AlertCircle } from 'lucide-react';
import type { StageRequirementsResult } from '@/lib/deals/stage-requirements';
import { TRIPOT_CONFIG } from '../../../../../../coaris.config';

/**
 * 案件ステージ 1 行サマリーバー（折りたたみの summary 部分）
 *
 * 隊長指摘 (2026-05-20)「ステージはわかるけども。すぐ触りたい人はめんどいよな。毎度これ出るんだろ？」
 * への応答：縦型 Stepper を毎回画面占有させない、1 行で済ませる。
 *
 * 表示：
 *   [ 現在ステージ（CF%） → 次：◯◯に進むには「△△」 ] [▼]
 *
 * 詳細を見たい時だけ <details> を開く。経験者は閉じたままで OK、初日メンバーや
 * 困ってる時だけ広げる。HTML ネイティブの details/summary なので JS 不要、Server Component 内完結。
 */

export function StageBar({
  currentStage,
  requirements,
}: {
  currentStage: string;
  requirements: StageRequirementsResult;
}) {
  const currentDef = TRIPOT_CONFIG.stages.find((s) => s.key === currentStage);
  const currentLabel = currentDef?.label ?? currentStage;
  const currentBadge = currentDef?.badgeClass ?? 'bg-slate-100 text-slate-700';
  const cashflowPercent = Math.round((currentDef?.cashflowWeight ?? 0) * 100);

  const isLost = currentStage === 'lost';
  const isTerminal = currentDef?.isTerminal === true;

  const nextDef = requirements.nextStage
    ? TRIPOT_CONFIG.stages.find((s) => s.key === requirements.nextStage)
    : null;
  const nextLabel = nextDef?.label ?? requirements.nextStage ?? '';

  const missingItems = requirements.requirements.filter(
    (r) => r.status === 'missing'
  );
  const firstMissing = missingItems[0]?.label;

  return (
    <div className="flex items-center gap-3 flex-wrap text-sm">
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg ${currentBadge}`}
      >
        {currentLabel}
      </span>
      <span
        className="inline-flex items-center text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-gray-100 text-gray-700"
        title="CF 確度（このステージの加重）"
      >
        CF {cashflowPercent}%
      </span>

      {isTerminal ? (
        isLost ? (
          <span className="text-xs text-red-700">失注 — クローズ済</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
            <Sparkles className="w-3 h-3" />
            案件完了
          </span>
        )
      ) : requirements.canAdvance ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <Sparkles className="w-3 h-3" />
          「{nextLabel}」に進める条件を満たしました
        </span>
      ) : firstMissing ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 min-w-0">
          <span className="text-gray-400">→</span>
          <span className="font-medium text-gray-900">「{nextLabel}」</span>
          <span className="text-gray-400">に進むには</span>
          <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
          <span className="truncate">{firstMissing}</span>
        </span>
      ) : nextLabel ? (
        <span className="text-xs text-gray-600">
          次のステージ：{nextLabel}
        </span>
      ) : null}

      <span className="ml-auto inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900">
        詳細
        <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
      </span>
    </div>
  );
}
