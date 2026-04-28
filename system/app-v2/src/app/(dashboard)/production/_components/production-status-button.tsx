'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProductionCardStatus } from '@/lib/actions/production';

const STATUS_FLOW: Record<string, string[]> = {
  requirements: ['designing', 'cancelled'],
  designing: ['building', 'cancelled'],
  building: ['reviewing', 'cancelled'],
  reviewing: ['delivered', 'building'],
  delivered: [],
  cancelled: ['requirements'],
};

const STATUS_LABEL: Record<string, string> = {
  requirements: '要件',
  designing: '設計',
  building: '実装',
  reviewing: 'レビュー',
  delivered: '納品',
  cancelled: 'キャンセル',
};

const TONE: Record<string, string> = {
  requirements: 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900',
  designing: 'text-blue-700 border-blue-200 hover:bg-blue-50',
  building: 'text-indigo-700 border-indigo-200 hover:bg-indigo-50',
  reviewing: 'text-amber-700 border-amber-200 hover:bg-amber-50',
  delivered: 'text-emerald-700 border-emerald-200 hover:bg-emerald-50',
  cancelled: 'text-gray-700 border-gray-200 hover:text-red-700 hover:border-red-700',
};

export function ProductionStatusButton({
  cardId,
  currentStatus,
}: {
  cardId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const next = STATUS_FLOW[currentStatus] ?? [];
  if (next.length === 0) return null;

  function handleClick(status: string) {
    startTransition(async () => {
      const result = await updateProductionCardStatus(cardId, status as 'requirements' | 'designing' | 'building' | 'reviewing' | 'delivered' | 'cancelled');
      if (!result.success) {
        alert(result.error ?? '更新に失敗しました');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {next.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => handleClick(s)}
          disabled={pending}
          className={`px-2 py-0.5 text-xs border rounded transition-colors disabled:opacity-40 ${TONE[s] ?? 'text-gray-700 border-gray-200'}`}
        >
          → {STATUS_LABEL[s] ?? s}
        </button>
      ))}
    </div>
  );
}
