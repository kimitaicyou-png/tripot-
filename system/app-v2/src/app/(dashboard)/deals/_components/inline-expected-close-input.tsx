'use client';

/**
 * 受注予定日のインライン編集（G7 拡張、2026-05-26）
 *
 * 案件一覧 List 行で date input、blur で保存。クリアは空にして blur。
 */

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { updateDealExpectedClose } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';

export function InlineExpectedCloseInput({
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
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function commit() {
    setEditing(false);
    if (value === savedValue) return;
    const prev = savedValue;
    setSavedValue(value);
    startTransition(async () => {
      const result = await updateDealExpectedClose(dealId, value === '' ? null : value);
      if (!result.ok) {
        setSavedValue(prev);
        setValue(prev);
        toast.error(`受注予定日の更新に失敗：${result.error ?? 'unknown'}`);
        return;
      }
      toast.success(value === '' ? '受注予定日をクリア' : `受注予定日を ${value} に更新`);
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
        type="date"
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        aria-label="受注予定日"
        className="px-1.5 py-0.5 text-xs font-mono tabular-nums border border-gray-900 rounded focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:opacity-50"
      />
    );
  }

  const hasValue = savedValue !== '';
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
      title={hasValue ? `受注予定日 ${savedValue}（クリックで編集）` : 'クリックで受注予定日を設定'}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-mono tabular-nums hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900/20 active:scale-[0.98] ${
        hasValue ? 'text-gray-900' : 'text-gray-400'
      }`}
    >
      <Calendar className="w-3 h-3 shrink-0 opacity-60" />
      <span>{hasValue ? savedValue : '—'}</span>
    </button>
  );
}
