'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type NextAction = {
  action: string;
  reason: string;
  due_in_days: number;
  action_type: 'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other';
  generated_at: string;
};

const TYPE_LABEL: Record<NextAction['action_type'], string> = {
  call: '📞 電話',
  meeting: '🤝 商談',
  proposal: '📄 提案',
  email: '✉️ メール',
  visit: '🚶 訪問',
  other: '📝 その他',
};

function formatDue(days: number): string {
  if (days === 0) return '今日中';
  if (days === 1) return '明日まで';
  if (days <= 7) return `${days}日以内`;
  if (days <= 14) return `2週間以内`;
  return `${days}日以内`;
}

export function NextActionSection({ dealId }: { dealId: string }) {
  const [data, setData] = useState<NextAction | null>(null);
  const [running, setRunning] = useState(false);

  async function handleSuggest() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/next-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal_id: dealId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('次の一手 提案失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as NextAction;
      setData(json);
      toast.success('AI が次の一手を提案しました');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('次の一手 提案失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500">次の一手 AI</p>
            <p className="text-sm text-gray-900 mt-1">
              この案件で「今やるべき行動」を AI が 1 つだけ提案します
            </p>
            <p className="text-xs text-gray-700 mt-1">
              直近の議事録・行動・タスクを集約 → 文脈に沿った具体的な次アクション
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleSuggest} disabled={running}>
            {running ? '✨ 提案中…' : '✨ 次の一手'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">次の一手 AI</p>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {new Date(data.generated_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleSuggest} disabled={running}>
          {running ? '提案中…' : '↻ 再提案'}
        </Button>
      </div>

      <div className="border-l-2 border-amber-300 pl-4 py-1 space-y-2">
        <p className="font-semibold text-xl text-gray-900 leading-snug">{data.action}</p>
        <div className="flex flex-wrap gap-3 text-xs text-gray-700">
          <span>{TYPE_LABEL[data.action_type] ?? data.action_type}</span>
          <span>·</span>
          <span className="font-mono">{formatDue(data.due_in_days)}</span>
        </div>
      </div>

      <div className="border-l-2 border-gray-200 pl-4 py-1">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">理由</p>
        <p className="text-sm text-gray-700">{data.reason}</p>
      </div>
    </section>
  );
}
