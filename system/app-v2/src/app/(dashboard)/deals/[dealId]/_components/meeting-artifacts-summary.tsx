/**
 * 議事録から生まれた AI 成果物の集約表示（H、隊長明示 2026-05-26 03:14）
 *
 * 「議事録のとこになんか集約されてるか分からない」直撃。
 * 議事録カードの下に「この議事録から生まれたもの」を 1 か所表示。
 */

import { FileText, FileCheck, ListChecks, Map, Sparkles, Check } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MeetingArtifact, MeetingArtifactKind } from '@/lib/ai/jobs';

const ARTIFACT_LABEL: Record<MeetingArtifactKind, string> = {
  'summarize-meeting': '要約 + needs 抽出',
  'generate-requirement': '要件定義',
  'generate-proposal': '提案書',
  'generate-tasks': 'タスク生成',
  'generate-sitemap': 'サイトマップ',
};

const ARTIFACT_ICON: Record<MeetingArtifactKind, LucideIcon> = {
  'summarize-meeting': Sparkles,
  'generate-requirement': FileCheck,
  'generate-proposal': FileText,
  'generate-tasks': ListChecks,
  'generate-sitemap': Map,
};

function formatJaDateTime(d: Date): string {
  return new Date(d).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MeetingArtifactsSummary({
  artifacts,
}: {
  artifacts: MeetingArtifact[];
}) {
  if (artifacts.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-gray-400" />
          この議事録から生まれた成果物：まだなし（下のアクションで作れます）
        </span>
      </div>
    );
  }

  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 space-y-1.5">
      <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 flex items-center gap-1.5">
        <Check className="w-3 h-3" />
        この議事録から生まれた成果物（最新のみ）
      </p>
      <ul className="space-y-1">
        {artifacts.map((a) => {
          const Icon = ARTIFACT_ICON[a.jobType];
          return (
            <li key={a.jobType} className="flex items-center gap-2 text-xs">
              <Icon className="w-3 h-3 text-emerald-700 shrink-0" />
              <span className="text-gray-900 font-medium">{ARTIFACT_LABEL[a.jobType]}</span>
              <span className="text-[10px] font-mono text-gray-500 ml-auto">
                {formatJaDateTime(a.finishedAt)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
