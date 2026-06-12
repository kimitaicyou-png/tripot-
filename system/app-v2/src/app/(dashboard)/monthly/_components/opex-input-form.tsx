'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, Loader2 } from 'lucide-react';
import { updateMonthlyOpex } from '@/lib/actions/monthly-opex';
import { toast } from '@/components/ui/toaster';

/**
 * 月次販管費の手動入力フォーム。
 *
 * MoneyForward 接続前の仮実装。MF 接続後は自動取得に置換、本 form は非表示にする。
 * president / hq_member のみ書込可能（メンバー role はクライアント側でも非表示）。
 */
export function OpexInputForm({
  yearMonth,
  initialAmount,
  canEdit,
}: {
  yearMonth: string;
  initialAmount: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(initialAmount));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (saving) return;
    const amount = Number(draft.replace(/[^0-9]/g, '')) || 0;
    setSaving(true);
    try {
      const res = await updateMonthlyOpex(yearMonth, amount);
      if (!res.ok) {
        toast.error('販管費の更新に失敗', { description: res.error });
        return;
      }
      toast.success('販管費を更新しました', {
        description: `${yearMonth}：¥${amount.toLocaleString('ja-JP')}`,
      });
      setEditing(false);
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('販管費の更新に失敗', { description: msg });
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit && initialAmount === 0) {
    // メンバーは未入力時は非表示（経営層が入力するまで見せない）
    return null;
  }

  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-gray-500">販管費（手動入力）:</span>
      {editing ? (
        <>
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-32 px-2 py-1 text-xs font-mono tabular-nums text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            aria-label="販管費（円）"
            disabled={saving}
            autoFocus
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-gray-900 rounded hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            保存
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(String(initialAmount));
              setEditing(false);
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            取消
          </button>
        </>
      ) : (
        <>
          <span className="font-mono tabular-nums text-gray-900">
            ¥{initialAmount.toLocaleString('ja-JP')}
          </span>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-xs text-gray-700 hover:text-gray-900 active:scale-[0.98]"
            >
              <Pencil className="w-3 h-3" />
              編集
            </button>
          )}
          <span className="text-[10px] text-gray-500">※ MF 接続後に自動化</span>
        </>
      )}
    </div>
  );
}
