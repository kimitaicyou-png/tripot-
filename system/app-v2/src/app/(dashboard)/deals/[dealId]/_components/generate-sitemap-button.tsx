'use client';

import { useState } from 'react';
import { Map, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

/**
 * 議事録 → サイトマップ AI 生成ボタン
 *
 * 旧 system/app/api/production/ai/generate-sitemap の app-v2 復活分。
 * 受託開発の標準フロー：要件定義 → ★ サイトマップ ★ → 画面遷移 → デザイン → 実装
 * 顧客との合意形成に使う中間成果物。
 */

type Page = {
  path: string;
  title: string;
  purpose: string;
  depth: number;
  parent?: string | null;
};

type Result = {
  project_type: string;
  total_pages: number;
  pages: Page[];
  notes: string | null;
  generated_at: string;
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  website: 'Web サイト',
  webapp: 'Web アプリ',
  mobile_app: 'モバイル',
  lp: 'ランディング',
  other: 'その他',
};

function pagesToMarkdown(pages: Page[]): string {
  return pages
    .map((p) => {
      const indent = '  '.repeat(p.depth);
      return `${indent}- **${p.title}** \`${p.path}\` — ${p.purpose}`;
    })
    .join('\n');
}

export function GenerateSitemapButton({ meetingId }: { meetingId: string }) {
  const [data, setData] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/generate-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: meetingId }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        const msg =
          errJson?.error === 'no_source'
            ? errJson.message ?? '議事録に内容がありません'
            : errJson?.error === 'ai_error'
              ? `AI エラー: ${errJson.message ?? '通信失敗'}`
              : errJson?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('サイトマップ生成に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as Result;
      setData(json);
      setExpanded(true);
      toast.success('サイトマップを生成しました', {
        description: `${PROJECT_TYPE_LABEL[json.project_type] ?? json.project_type} / ${json.pages.length} ページ`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('サイトマップ生成に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  async function handleCopyMarkdown() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(pagesToMarkdown(data.pages));
      toast.success('Markdown をクリップボードにコピーしました');
    } catch {
      toast.error('クリップボードへのコピーに失敗');
    }
  }

  if (!data) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
        <span className="inline-flex items-center gap-1">
          <Map className="w-3.5 h-3.5" />
          {running ? '生成中…' : 'サイトマップ'}
        </span>
      </Button>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <Map className="w-3.5 h-3.5" />
            {running ? '再生成中…' : '再生成'}
          </span>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleCopyMarkdown}>
          <span className="inline-flex items-center gap-1">
            <Copy className="w-3.5 h-3.5" />
            Markdown コピー
          </span>
        </Button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? '折りたたむ' : `${data.pages.length} ページ`}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {PROJECT_TYPE_LABEL[data.project_type] ?? data.project_type}
              </span>
              <span className="text-xs font-mono tabular-nums text-gray-500">
                {data.pages.length} ページ
              </span>
            </div>
            <p className="text-xs font-mono text-gray-500">
              {new Date(data.generated_at).toLocaleString('ja-JP')}
            </p>
          </div>

          <ul className="space-y-1.5">
            {data.pages.map((p, idx) => (
              <li
                key={idx}
                className="text-sm text-gray-900"
                style={{ paddingLeft: `${p.depth * 1.25}rem` }}
              >
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{p.title}</span>
                  <code className="text-[11px] font-mono text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                    {p.path}
                  </code>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{p.purpose}</p>
              </li>
            ))}
          </ul>

          {data.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-900 leading-relaxed">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
