'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function ProposalFromMeetingButton({
  dealId,
  meetingId,
}: {
  dealId: string;
  meetingId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId, meeting_ids: [meetingId] }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('提案書生成に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const data = (await res.json()) as { version: number; slide_count: number };
      toast.success('議事録から提案書を生成', {
        description: `v${data.version}・${data.slide_count}枚 → 提案書タブで確認`,
      });
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('提案書生成に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={handleGenerate}
      disabled={running || pending}
    >
      {running ? '✨ 生成中…' : '✨ 提案書化'}
    </Button>
  );
}
