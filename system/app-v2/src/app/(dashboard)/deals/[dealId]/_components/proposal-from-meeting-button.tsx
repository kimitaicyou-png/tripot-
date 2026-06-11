'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';
import { SlideRendererInline } from './slide-renderer-inline';

type Slide = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  items?: string[];
  message?: string;
};

type GenerateResult = {
  proposal_id: string;
  version: number;
  slide_count: number;
  slides: Slide[];
};

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
  // この議事録から生成した提案書をその場で表示（B4-5：別タブ保存で「出ない」体感を断つ）
  const [justGenerated, setJustGenerated] = useState<GenerateResult | null>(null);

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

      const data = (await res.json()) as GenerateResult;
      setJustGenerated(data);
      toast.success('議事録から提案書を生成', {
        description: `v${data.version}・${data.slide_count}枚（下に表示・提案書タブにも保存）`,
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('提案書生成に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleGenerate}
        disabled={running || pending}
      >
        <span className="inline-flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          {running ? '生成中…' : pending ? '更新中…' : '提案書化'}
        </span>
      </Button>

      {justGenerated && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-900 font-medium">
            提案書 v{justGenerated.version}（{justGenerated.slide_count}枚）を生成しました
          </p>
          <SlideRendererInline slides={justGenerated.slides} />
        </div>
      )}
    </div>
  );
}
