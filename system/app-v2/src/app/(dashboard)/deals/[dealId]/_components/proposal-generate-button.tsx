'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function ProposalGenerateButton({ dealId }: { dealId: string }) {
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
        body: JSON.stringify({ deal_id: dealId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.error === 'ai_invalid_format'
              ? 'AI レスポンスの形式が不正です（再試行してみてください）'
              : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('提案書生成に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const data = (await res.json()) as { proposal_id: string; version: number; slide_count: number };
      toast.success('提案書を生成しました', {
        description: `v${data.version}・${data.slide_count}枚`,
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
      variant="primary"
      onClick={handleGenerate}
      disabled={running || pending}
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="w-4 h-4" />
        {running ? '生成中…(30秒前後)' : 'AIで提案書を生成'}
      </span>
    </Button>
  );
}
