'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Loader2 } from 'lucide-react';
import { updateDealStage } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';
import { TRIPOT_CONFIG, type StageDef } from '../../../../../../coaris.config';

/**
 * 案件ステージのインライン変更 UI。
 *
 * 隊長指摘 (2026-05-20)「動線の中にステージがどうしたら変わるのか？全く分からん」
 * への直接の応答：案件詳細の上部バッジを「クリックで dropdown が開く」状態にして、
 * 編集画面に遷移せず即変更できるようにする。
 *
 * 想定運用：
 * - 通常は書類 status の更新で自動連動（Phase 2 で実装）
 * - 例外・手動オーバーライド・testing 時にこの UI を使う
 *
 * 失注は別フロー（LostDealSection）を使うこと推奨だが、ここからでも変更可能。
 */
export function InlineStageChanger({
  dealId,
  currentStage,
}: {
  dealId: string;
  currentStage: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const stages: StageDef[] = TRIPOT_CONFIG.stages;
  const currentDef = stages.find((s) => s.key === currentStage);
  const currentLabel = currentDef?.label ?? currentStage;
  const currentBadge = currentDef?.badgeClass ?? 'bg-slate-100 text-slate-700';

  async function handleSelect(nextStage: string) {
    if (nextStage === currentStage || submitting) {
      setOpen(false);
      return;
    }
    setSubmitting(true);
    setOpen(false);
    try {
      const res = await updateDealStage(dealId, nextStage);
      if (!res.ok) {
        toast.error('ステージ変更に失敗', { description: res.error });
        return;
      }
      const targetDef = stages.find((s) => s.key === nextStage);
      toast.success('ステージを変更しました', {
        description: `${currentLabel} → ${targetDef?.label ?? nextStage}`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('ステージ変更に失敗', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={submitting || pending}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg active:scale-[0.98] hover:opacity-80 transition-all duration-150 ${currentBadge} disabled:opacity-60`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`現在のステージ：${currentLabel}。クリックで変更`}
      >
        {submitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : null}
        <span>{currentLabel}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <ul
            role="listbox"
            className="absolute left-0 top-full mt-1 z-20 min-w-[180px] bg-white border border-gray-200 rounded-lg shadow-sm py-1"
          >
            {stages.map((stage) => {
              const isCurrent = stage.key === currentStage;
              return (
                <li key={stage.key} role="option" aria-selected={isCurrent}>
                  <button
                    type="button"
                    onClick={() => handleSelect(stage.key)}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 active:scale-[0.98] transition-all duration-150 ${
                      isCurrent ? 'bg-gray-50' : ''
                    }`}
                  >
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${stage.badgeClass.split(' ')[0]}`}
                      aria-hidden="true"
                    />
                    <span className={isCurrent ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                      {stage.label}
                    </span>
                    {isCurrent && (
                      <span className="ml-auto text-[10px] font-mono text-gray-500">現在</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
