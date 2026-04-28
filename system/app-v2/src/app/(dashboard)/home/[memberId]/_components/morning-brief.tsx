'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type FocusItem = {
  title: string;
  why: string;
  suggested_action: string;
  deal_id?: string | null;
};

type AlertItem = {
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

type Brief = {
  focus: FocusItem[];
  alerts: AlertItem[];
  message: string;
};

const ALERT_TONE: Record<AlertItem['severity'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-200 bg-red-50 text-red-900',
};

const ALERT_ICON: Record<AlertItem['severity'], string> = {
  info: '💡',
  warning: '⚠️',
  critical: '🚨',
};

export function MorningBrief({ memberId }: { memberId: string }) {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/morning-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('朝ブリーフィング生成に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const data = (await res.json()) as { brief: Brief; generated_at: string };
      setBrief(data.brief);
      setGeneratedAt(data.generated_at);
      toast.success('今日のブリーフィングできました');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('朝ブリーフィング生成に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!brief) {
    return (
      <section className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-subtle">朝ブリーフィング</p>
            <p className="text-sm text-ink mt-1">
              AI が今日の重点案件 3 件と警告を提示します
            </p>
            <p className="text-xs text-muted mt-1">
              残タスク・進行中案件・直近行動量・詰まり案件を集約して 30秒前後で作成
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleGenerate} disabled={running}>
            {running ? '✨ 生成中…' : '✨ 今日のブリーフィング'}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">朝ブリーフィング</p>
          {generatedAt && (
            <p className="text-xs font-mono text-subtle mt-1">
              {new Date(generatedAt).toLocaleString('ja-JP')}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGenerate}
          disabled={running}
        >
          {running ? '更新中…' : '↻ 再生成'}
        </Button>
      </div>

      {brief.message && (
        <p className="font-semibold text-lg text-ink-mid border-l-2 border-amber-300 pl-4 py-1">
          {brief.message}
        </p>
      )}

      {brief.focus.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle mb-3">
            今日の重点 <span className="font-mono text-ink">{brief.focus.length}</span>
          </p>
          <ol className="space-y-3">
            {brief.focus.map((f, i) => (
              <li
                key={i}
                className="border-l-2 border-ink pl-4 py-1"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-subtle">{String(i + 1).padStart(2, '0')}</span>
                  {f.deal_id ? (
                    <Link
                      href={`/deals/${f.deal_id}`}
                      className="text-sm text-ink font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                  ) : (
                    <p className="text-sm text-ink font-medium">{f.title}</p>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">{f.why}</p>
                <p className="text-sm text-ink mt-1.5">
                  <span className="text-xs text-subtle uppercase tracking-wider mr-2">行動</span>
                  {f.suggested_action}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {brief.alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-subtle">警告</p>
          {brief.alerts.map((a, i) => (
            <div
              key={i}
              className={`border rounded-lg px-3 py-2 text-sm ${ALERT_TONE[a.severity]}`}
            >
              <span className="mr-2">{ALERT_ICON[a.severity]}</span>
              {a.message}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
