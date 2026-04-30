'use client';

import { useState } from 'react';
import { ShieldAlert, RotateCcw, AlertTriangle, AlertOctagon, ShieldCheck, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

type RiskScore = {
  score: number;
  level: RiskLevel;
  reasons: string[];
  recommended_actions: string[];
  generated_at: string;
};

const LEVEL_LABEL: Record<RiskLevel, string> = {
  low: '低リスク',
  medium: '注意',
  high: '警戒',
  critical: '緊急',
};

const LEVEL_ICON: Record<RiskLevel, LucideIcon> = {
  low: ShieldCheck,
  medium: TriangleAlert,
  high: AlertTriangle,
  critical: AlertOctagon,
};

const LEVEL_BADGE: Record<RiskLevel, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-800 border-amber-200',
  high: 'bg-orange-50 text-orange-800 border-orange-200',
  critical: 'bg-red-50 text-red-800 border-red-200',
};

const LEVEL_BAR: Record<RiskLevel, string> = {
  low: 'border-blue-300',
  medium: 'border-amber-300',
  high: 'border-orange-300',
  critical: 'border-red-300',
};

const LEVEL_SCORE_COLOR: Record<RiskLevel, string> = {
  low: 'text-blue-700',
  medium: 'text-amber-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
};

export function RiskScoreSection({ dealId }: { dealId: string }) {
  const [data, setData] = useState<RiskScore | null>(null);
  const [running, setRunning] = useState(false);

  async function handleAssess() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/risk-score', {
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
        toast.error('失注リスク分析失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as RiskScore;
      setData(json);
      toast.success('失注リスクを分析しました');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('失注リスク分析失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500">失注リスク AI</p>
            <p className="text-sm text-gray-900 mt-1">
              この案件の失注リスクを 0-100 で評価し、理由と対策を提示します
            </p>
            <p className="text-xs text-gray-700 mt-1">
              ステージ滞留・沈黙日数・議事録キーワード・受注予定超過 を多角分析
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleAssess} disabled={running}>
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              {running ? '分析中…' : 'リスク分析'}
            </span>
          </Button>
        </div>
      </section>
    );
  }

  const Icon = LEVEL_ICON[data.level];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">失注リスク AI</p>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {new Date(data.generated_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleAssess} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            {running ? '分析中…' : '再分析'}
          </span>
        </Button>
      </div>

      <div className={`border-l-2 ${LEVEL_BAR[data.level]} pl-4 py-1 flex items-end gap-4`}>
        <div>
          <p className={`font-serif italic text-6xl tabular-nums tracking-tight ${LEVEL_SCORE_COLOR[data.level]}`}>
            {data.score}
          </p>
        </div>
        <div className="pb-2 flex-1">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-lg border ${LEVEL_BADGE[data.level]}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {LEVEL_LABEL[data.level]}
          </span>
          <p className="text-xs text-gray-500 mt-1">100点満点中（高いほどリスク高）</p>
        </div>
      </div>

      <div className="border-l-2 border-gray-200 pl-4 py-1">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">リスク要因</p>
        <ul className="space-y-1.5">
          {data.reasons.map((r, idx) => (
            <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">·</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-l-2 border-amber-300 pl-4 py-1">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">推奨対策</p>
        <ul className="space-y-1.5">
          {data.recommended_actions.map((a, idx) => (
            <li key={idx} className="text-sm text-gray-900 flex items-start gap-2">
              <span className="text-amber-600 mt-0.5 font-semibold">›</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
