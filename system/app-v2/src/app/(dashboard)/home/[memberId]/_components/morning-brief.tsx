'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';
import { Sparkles, RotateCcw, Lightbulb, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FocusItem = {
  title: string;
  why: string;
  suggested_action: string;
  deal_id?: string | null;
};

export type AlertItem = {
  severity: 'info' | 'warning' | 'critical';
  message: string;
};

export type Brief = {
  focus: FocusItem[];
  alerts: AlertItem[];
  message: string;
};

const ALERT_TONE: Record<AlertItem['severity'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-200 bg-red-50 text-red-900',
};

const ALERT_ICON: Record<AlertItem['severity'], LucideIcon> = {
  info: Lightbulb,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const ALERT_ICON_COLOR: Record<AlertItem['severity'], string> = {
  info: 'text-blue-600',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

export function MorningBrief({
  memberId,
  initialBrief,
  initialGeneratedAt,
}: {
  memberId: string;
  initialBrief?: Brief | null;
  initialGeneratedAt?: string | null;
}) {
  const [brief, setBrief] = useState<Brief | null>(initialBrief ?? null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(
    initialGeneratedAt ?? null,
  );
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
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500">朝ブリーフィング</p>
            <p className="text-sm text-gray-900 mt-1">
              AI が今日の重点案件 3 件と警告を提示します
            </p>
            <p className="text-xs text-gray-700 mt-1">
              残タスク・進行中案件・直近行動量・詰まり案件を集約して 30秒前後で作成
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleGenerate} disabled={running}>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              {running ? '生成中…' : '今日のブリーフィング'}
            </span>
          </Button>
        </div>
      </section>
    );
  }

  // 過去 ai_jobs に保存された古い brief output で focus/alerts が欠ける形式があり、
  // .length アクセスで TypeError になっていた（2026-05-28 09:35 隊長報告
  // /home/[memberId] で "undefined is not an object (evaluating 'o.focus.length')")。
  // schema は配列必須だが、validation 通過前の旧データを防御するために
  // 表示直前で配列化する。
  const focusItems = Array.isArray(brief.focus) ? brief.focus : [];
  const alertItems = Array.isArray(brief.alerts) ? brief.alerts : [];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">朝ブリーフィング</p>
          {generatedAt && (
            <p className="text-xs font-mono text-gray-500 mt-1">
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
          <span className="inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" />
            {running ? '更新中…' : '再生成'}
          </span>
        </Button>
      </div>

      {brief.message && (
        <p className="font-semibold text-lg text-gray-700 border-l-2 border-amber-300 pl-4 py-1">
          {brief.message}
        </p>
      )}

      {focusItems.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            今日の重点 <span className="font-mono text-gray-900">{focusItems.length}</span>
          </p>
          <ol className="space-y-3">
            {focusItems.map((f, i) => (
              <li
                key={i}
                className="border-l-2 border-gray-900 pl-4 py-1"
              >
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-xs text-gray-500">{String(i + 1).padStart(2, '0')}</span>
                  {f.deal_id ? (
                    <Link
                      href={`/deals/${f.deal_id}`}
                      className="text-sm text-gray-900 font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium">{f.title}</p>
                  )}
                </div>
                <p className="text-xs text-gray-700 mt-0.5">{f.why}</p>
                <p className="text-sm text-gray-900 mt-1.5">
                  <span className="text-xs text-gray-500 uppercase tracking-wider mr-2">行動</span>
                  {f.suggested_action}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {alertItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-gray-500">警告</p>
          {alertItems.map((a, i) => {
            const Icon = ALERT_ICON[a.severity];
            return (
              <div
                key={i}
                className={`border rounded-lg px-3 py-2 text-sm flex items-start gap-2 ${ALERT_TONE[a.severity]}`}
              >
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${ALERT_ICON_COLOR[a.severity]}`} />
                <span>{a.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
