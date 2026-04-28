'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, RotateCcw, FileEdit } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function SummarizeMeetingButton({
  meetingId,
  hasSummary,
}: {
  meetingId: string;
  hasSummary: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  async function handleSummarize() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/summarize-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'no_raw_text'
            ? '本文が空のため要約できません'
            : data?.error === 'ai_error'
              ? `AI エラー: ${data.message ?? '通信失敗'}`
              : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('要約に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const data = (await res.json()) as { needs: unknown[] };
      toast.success(hasSummary ? '再要約しました' : '要約しました', {
        description: `needs ${data.needs.length}件 抽出`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('要約に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      type="button"
      variant={hasSummary ? 'ghost' : 'secondary'}
      size="sm"
      onClick={handleSummarize}
      disabled={running || pending}
    >
      <span className="inline-flex items-center gap-1">
        {running ? <Sparkles className="w-3.5 h-3.5" /> : hasSummary ? <RotateCcw className="w-3.5 h-3.5" /> : <FileEdit className="w-3.5 h-3.5" />}
        {running ? '要約中…' : hasSummary ? '再要約' : '要約'}
      </span>
    </Button>
  );
}
