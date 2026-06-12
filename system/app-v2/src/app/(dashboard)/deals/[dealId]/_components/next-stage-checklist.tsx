import { CheckCircle2, Circle, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import type { StageRequirementsResult } from '@/lib/deals/stage-requirements';
import { TRIPOT_CONFIG } from '../../../../../../coaris.config';

/**
 * 次のステージに進む条件のチェックリスト。
 *
 * 隊長指摘 (2026-05-20)「動線の中にステージがどうしたら変わるのか？見込み→提案が全く分からん」
 * → 「次に進むには何が必要か」を画面に明示する。
 *
 * stage-requirements.ts の getStageRequirements() の結果を受け取り、
 * 各要件を ✓（done）/ ○（missing）/ △（optional）で表示する。
 *
 * canAdvance（必須項目が全て done）のときは「自動連動の対象」バナーを表示し、
 * 該当の書類操作（例：見積を accepted に変更）で deal.stage が自動進行する旨を告知する。
 */

const TAB_LABEL: Record<string, string> = {
  meetings: '議事録',
  proposals: '提案',
  estimates: '見積',
  invoices: '請求書',
  resources: 'リソース',
};

export function NextStageChecklist({
  dealId,
  data,
}: {
  dealId: string;
  data: StageRequirementsResult;
}) {
  if (!data.nextStage) {
    return null;
  }

  const nextDef = TRIPOT_CONFIG.stages.find((s) => s.key === data.nextStage);
  const nextLabel = nextDef?.label ?? data.nextStage;

  const requiredItems = data.requirements.filter((r) => r.status !== 'optional');
  const optionalItems = data.requirements.filter((r) => r.status === 'optional');

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-900">
          「{nextLabel}」に進むには
        </h3>
        {data.canAdvance && (
          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
            <Sparkles className="w-3 h-3" />
            条件を満たしています
          </span>
        )}
      </div>

      {data.canAdvance && (
        <p className="text-xs text-gray-700 mb-4 leading-relaxed">
          書類のステータスを更新すると、案件ステージが自動で「{nextLabel}」に進みます。
          手動で進めたい場合は、上のステージバッジから変更できます。
        </p>
      )}

      <ul className="space-y-2.5">
        {requiredItems.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            {item.status === 'done' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  item.status === 'done' ? 'text-gray-700 line-through' : 'text-gray-900'
                }`}
              >
                {item.label}
              </p>
              {item.status !== 'done' && item.actionTab && item.actionLabel && (
                <a
                  href={`/deals/${dealId}?tab=${item.actionTab}#${item.actionTab}`}
                  className="inline-flex items-center gap-1 mt-1 text-xs text-gray-700 hover:text-gray-900 underline decoration-gray-300 hover:decoration-gray-900"
                >
                  {item.actionLabel}
                  <ArrowRight className="w-3 h-3" />
                  <span className="text-gray-500">（{TAB_LABEL[item.actionTab] ?? item.actionTab}タブ）</span>
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {optionalItems.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">
            任意・推奨
          </p>
          <ul className="space-y-2">
            {optionalItems.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                {item.status === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs ${
                      item.status === 'done' ? 'text-gray-600 line-through' : 'text-gray-700'
                    }`}
                  >
                    {item.label}
                  </p>
                  {item.status !== 'done' && item.actionTab && item.actionLabel && (
                    <a
                      href={`/deals/${dealId}?tab=${item.actionTab}#${item.actionTab}`}
                      className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-700 hover:text-gray-900 underline decoration-gray-300 hover:decoration-gray-900"
                    >
                      {item.actionLabel}
                      <ArrowRight className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
