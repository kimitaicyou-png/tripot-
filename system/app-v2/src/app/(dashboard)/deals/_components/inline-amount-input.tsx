'use client';

/**
 * 案件一覧 List view 用 — 受注金額のインライン編集（G7、2026-05-26）
 *
 * クリックで input 化、blur で server action 呼び出し（楽観的更新 + toast）。
 * 柏樹「90 件運用で死ぬ」=「金額直すたびに詳細ページ往復」解消。
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateDealAmount } from '@/lib/actions/deals';
import { formatYen } from '@/lib/format';
import { toast } from '@/components/ui/toaster';

export function InlineAmountInput({
  dealId,
  initialAmount,
}: {
  dealId: string;
  initialAmount: number | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<number>(initialAmount ?? 0);
  const [savedValue, setSavedValue] = useState<number>(initialAmount ?? 0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function enterEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function commit() {
    setEditing(false);
    if (value === savedValue) return;
    const prev = savedValue;
    setSavedValue(value); // 楽観的
    startTransition(async () => {
      const result = await updateDealAmount(dealId, value);
      if (!result.ok) {
        setSavedValue(prev);
        setValue(prev);
        toast.error(`金額の更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(`金額を ${formatYen(value)} に更新`);
      router.refresh();
    });
  }

  function cancel() {
    setEditing(false);
    setValue(savedValue);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={0}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(Number(e.target.value) || 0)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        aria-label="受注金額"
        className="w-28 px-1.5 py-0.5 text-right text-sm font-mono tabular-nums border border-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={enterEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enterEdit();
        }
      }}
      title="クリックで金額を編集"
      className="font-mono tabular-nums text-sm text-gray-900 font-semibold px-1.5 py-0.5 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 active:scale-[0.98]"
    >
      {formatYen(savedValue)}
    </button>
  );
}
