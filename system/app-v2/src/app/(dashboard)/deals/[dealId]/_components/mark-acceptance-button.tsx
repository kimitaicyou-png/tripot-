'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ClipboardCheck, Loader2 } from 'lucide-react';
import { markMeetingAsAcceptance } from '@/lib/actions/meetings';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

/**
 * 議事録を「検収議事録」としてマークするボタン。
 *
 * 隊長思想「行動 → 自動でステージ」の delivered → acceptance 自動進行をトリガー。
 * 既にマーク済の場合は ✓ バッジを表示するのみ（再マーク不要）。
 */
export function MarkAcceptanceButton({
  dealId,
  meetingId,
  alreadyMarked,
}: {
  dealId: string;
  meetingId: string;
  alreadyMarked: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  if (alreadyMarked) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg">
        <CheckCircle2 className="w-3.5 h-3.5" />
        検収議事録としてマーク済
      </span>
    );
  }

  async function handleMark() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await markMeetingAsAcceptance(meetingId, dealId);
      if (!res.ok) {
        toast.error('マークに失敗', { description: res.error });
        return;
      }
      toast.success('検収議事録としてマークしました', {
        description: '案件が「納品済」なら自動で「検収」ステージへ進みます',
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('マークに失敗', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleMark} disabled={submitting}>
      <span className="inline-flex items-center gap-1">
        {submitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ClipboardCheck className="w-3.5 h-3.5" />
        )}
        {submitting ? 'マーク中…' : '検収議事録としてマーク'}
      </span>
    </Button>
  );
}
