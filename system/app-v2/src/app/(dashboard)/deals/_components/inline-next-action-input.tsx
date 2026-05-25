'use client';

/**
 * 「次やること」のインライン編集（G7 拡張、2026-05-26）
 *
 * 柏樹（ノリスケ反証）「シートに戻りたい 3 つ目：次やること書く欄が一覧にない」直撃。
 * deals.metadata.next_action に格納、200 文字まで。
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { updateDealNextAction } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';

const MAX_LEN = 200;

export function InlineNextActionInput({
  dealId,
  initial,
}: {
  dealId: string;
  initial: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(initial ?? '');
  const [savedValue, setSavedValue] = useState<string>(initial ?? '');
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
    setSavedValue(value);
    startTransition(async () => {
      const result = await updateDealNextAction(dealId, value);
      if (!result.ok) {
        setSavedValue(prev);
        setValue(prev);
        toast.error(`次やることの更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(value.trim() === '' ? '次やることをクリア' : '次やることを更新');
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
        type="text"
        maxLength={MAX_LEN}
        value={value}
        disabled={isPending}
        placeholder="次やること（200 字まで）"
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        aria-label="次やること"
        className="w-56 px-1.5 py-0.5 text-xs text-gray-900 border border-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
      />
    );
  }

  const hasValue = savedValue.trim() !== '';
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
      title={hasValue ? `次やること：${savedValue}（クリックで編集）` : 'クリックで「次やること」を追加'}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 active:scale-[0.98] max-w-[14rem] ${
        hasValue ? 'text-gray-900' : 'text-gray-400'
      }`}
    >
      <Pencil className="w-3 h-3 shrink-0 opacity-60" />
      <span className="truncate">{hasValue ? savedValue : '次やること…'}</span>
    </button>
  );
}
