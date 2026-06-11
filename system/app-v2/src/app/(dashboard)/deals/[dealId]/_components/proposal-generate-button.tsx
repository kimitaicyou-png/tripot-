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

export function ProposalGenerateButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);
  // 生成直後に結果を画面へ即出す（B4-5：保存はされるが list の再取得待ちで「出ない」体感を断つ）
  const [justGenerated, setJustGenerated] = useState<GenerateResult | null>(null);

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

      const data = (await res.json()) as GenerateResult;
      setJustGenerated(data);
      toast.success('提案書を生成しました', {
        description: `v${data.version}・${data.slide_count}枚（下に表示中）`,
      });
      // 保存済み一覧（Server Component）を最新化。refresh は await できないので transition で囲い、
      // 完了表示は justGenerated 側で担保する（refresh 待ちで「出ない」を起こさない）。
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
    <div className="space-y-4">
      <Button
        type="button"
        variant="primary"
        onClick={handleGenerate}
        disabled={running || pending}
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          {running ? '生成中…(30秒前後)' : pending ? '一覧を更新中…' : 'AIで提案書を生成'}
        </span>
      </Button>

      {justGenerated && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <p className="text-sm text-gray-900 font-medium">
            生成した提案書 v{justGenerated.version}
            <span className="ml-2 text-xs font-mono text-gray-500">
              {justGenerated.slide_count}枚
            </span>
          </p>
          <p className="text-xs text-gray-500">
            下の「提案書」一覧にも保存済みです。編集・共有は一覧側から行えます。
          </p>
          <SlideRendererInline slides={justGenerated.slides} />
        </div>
      )}
    </div>
  );
}
