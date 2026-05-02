'use client';

import { useState } from 'react';
import { ListChecks, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type GeneratedTask = {
  title: string;
  estimated_hours: number;
  type: string;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
};

type Result = {
  tasks: GeneratedTask[];
  overall_estimated_hours: number;
  notes: string;
  generated_at: string;
};

const TYPE_LABEL: Record<string, string> = {
  development: '開発',
  testing: 'テスト',
  document: 'ドキュメント',
  template: 'テンプレ',
  ui: 'UI',
  business_logic: '業務ロジック',
  customer_facing: '顧客対応',
  negotiation: '交渉',
  other: 'その他',
};

const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200',
};

const PRIORITY_LABEL: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export function GenerateTasksFromMeetingButton({ meetingId }: { meetingId: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'no_source'
            ? data.message ?? '議事録に内容がありません'
            : data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('タスク生成失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as Result;
      setData(json);
      setExpanded(true);
      toast.success(`${json.tasks.length}件のタスクを生成しました`, {
        description: `総工数 ${json.overall_estimated_hours}h`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('タスク生成失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
        <span className="inline-flex items-center gap-1">
          <ListChecks className="w-3.5 h-3.5" />
          {running ? '生成中…' : 'タスク生成'}
        </span>
      </Button>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" />
            {running ? '再生成中…' : '再生成'}
          </span>
        </Button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? '折りたたむ' : `タスク ${data.tasks.length}件 / ${data.overall_estimated_hours}h`}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="text-xs uppercase tracking-widest text-gray-500">AI 生成タスク</span>
            <span className="font-mono tabular-nums text-gray-900">{data.tasks.length}件</span>
            <span className="font-mono tabular-nums text-blue-700 font-semibold">
              総工数 {data.overall_estimated_hours}h
            </span>
            <span className="text-xs font-mono text-gray-500">
              {new Date(data.generated_at).toLocaleString('ja-JP')}
            </span>
          </div>

          <ul className="border border-gray-200 rounded-lg divide-y divide-gray-100 bg-white">
            {data.tasks.map((t, idx) => (
              <li key={idx} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${PRIORITY_BADGE[t.priority]}`}
                      >
                        優先度 {PRIORITY_LABEL[t.priority]}
                      </span>
                      <span className="text-xs text-gray-700">
                        {TYPE_LABEL[t.type] ?? t.type}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{t.title}</p>
                    </div>
                    <p className="text-xs text-gray-700 mt-1 ml-8">{t.rationale}</p>
                  </div>
                  <p className="font-mono text-sm text-gray-900 tabular-nums shrink-0">
                    {t.estimated_hours}h
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {data.notes && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-amber-800 mb-1">注記</p>
              <p className="text-xs text-amber-900">{data.notes}</p>
            </div>
          )}

          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
            <p className="text-xs text-gray-700">
              これは AI が議事録から抽出した <span className="font-semibold">タスク候補</span> のプレビューです。
            </p>
            <button
              type="button"
              disabled
              className="w-full px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed border border-gray-200"
              title="今後実装予定：このタスクを一括で「タスク」タブに追加できるようになります"
            >
              タスクに一括追加（今後実装予定）
            </button>
            <p className="text-xs text-gray-500">
              現在は手動で「タスク」タブから登録してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
