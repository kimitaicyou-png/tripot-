'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { deleteDealSoft } from '@/lib/actions/deals';
import { toast } from '@/components/ui/toaster';

export function DealDeleteButton({
  dealId,
  dealTitle,
}: {
  dealId: string;
  dealTitle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    const ok = window.confirm(`「${dealTitle}」を削除しますか？\n\nこの操作は取り消せますが、一覧から消えます。`);
    if (!ok) return;
    setConfirming(true);
    startTransition(async () => {
      try {
        const result = await deleteDealSoft(dealId);
        if (!result.ok) {
          toast.error('削除に失敗しました', { description: result.error });
          return;
        }
        toast.success(`「${result.title}」を削除しました`);
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '通信に失敗しました';
        toast.error('削除に失敗しました', { description: msg });
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || confirming}
      aria-label={`「${dealTitle}」を削除`}
      title="削除（社長のみ）"
      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors active:scale-[0.98] disabled:opacity-40"
    >
      {isPending || confirming ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
