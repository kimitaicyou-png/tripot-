'use client';

import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, AlertCircle, HelpCircle, ArrowRightCircle } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

/**
 * 議事録 → 要件定義 AI 生成ボタン
 *
 * 隊長指摘 (2026-05-20)「議事録から要件定義が生まれる。ニーズやウォンツが
 * でるようにするのよ」を実装。
 *
 * tripot 思想フロー：
 *   議事録（録音 → 文字起こし → AI 要約 → ニーズ抽出）
 *     ↓ ★ 本コンポーネント ★
 *   要件定義（overview + 機能 + 非機能 + スコープ外 + 質問 + 次アクション）
 *     ↓
 *   提案 → 見積 → 受注 → 制作 → 請求
 *
 * 動作：議事録 1 件から /api/ai/generate-requirement を叩き、構造化された要件定義を
 * 同じカード内にインライン展開する。DB には書かない（プレビュー）。
 * 「提案書を作成」ボタンで proposals に展開する導線を提示。
 */

type RequirementCategory = {
  category: string;
  items: string[];
};

type Result = {
  title: string;
  overview: string;
  functional_requirements: RequirementCategory[];
  non_functional_requirements: RequirementCategory[];
  out_of_scope: string[];
  open_questions: string[];
  next_actions: string[];
  generated_at: string;
};

export function GenerateRequirementButton({
  dealId,
  meetingId,
}: {
  dealId: string;
  meetingId: string;
}) {
  const [data, setData] = useState<Result | null>(null);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/generate-requirement', {
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
        toast.error('要件定義の生成に失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as Result;
      setData(json);
      setExpanded(true);
      const totalItems =
        json.functional_requirements.reduce((sum, c) => sum + c.items.length, 0) +
        json.non_functional_requirements.reduce((sum, c) => sum + c.items.length, 0);
      toast.success('要件定義を生成しました', {
        description: `機能 ${json.functional_requirements.length}カテゴリ / 全 ${totalItems} 項目`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('要件定義の生成に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
        <span className="inline-flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {running ? '生成中…' : '要件定義'}
        </span>
      </Button>
    );
  }

  void dealId;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant="ghost" size="sm" onClick={handleGenerate} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {running ? '再生成中…' : '再生成'}
          </span>
        </Button>
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? '折りたたむ' : data.title}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-4 bg-white border border-gray-200 rounded-xl p-5">
          {/* タイトル + 生成日時 */}
          <div className="flex items-baseline justify-between gap-3 flex-wrap pb-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-900">{data.title}</h4>
            <p className="text-xs font-mono text-gray-500">
              {new Date(data.generated_at).toLocaleString('ja-JP')}
            </p>
          </div>

          {/* overview */}
          <section>
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">概要</p>
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{data.overview}</p>
          </section>

          {/* functional */}
          {data.functional_requirements.length > 0 && (
            <section>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">機能要件</p>
              <div className="space-y-3">
                {data.functional_requirements.map((cat, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-xs font-semibold text-gray-900 mb-1">{cat.category}</p>
                    <ul className="space-y-0.5">
                      {cat.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 leading-relaxed">
                          ・{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* non-functional */}
          {data.non_functional_requirements.length > 0 && (
            <section>
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-2">非機能要件</p>
              <div className="space-y-3">
                {data.non_functional_requirements.map((cat, idx) => (
                  <div key={idx} className="border-l-2 border-gray-200 pl-3">
                    <p className="text-xs font-semibold text-gray-900 mb-1">{cat.category}</p>
                    <ul className="space-y-0.5">
                      {cat.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 leading-relaxed">
                          ・{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* out of scope */}
          {data.out_of_scope.length > 0 && (
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">スコープ外</p>
              <ul className="space-y-0.5">
                {data.out_of_scope.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">
                    ・{item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* open questions */}
          {data.open_questions.length > 0 && (
            <section className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-amber-800 mb-1.5 inline-flex items-center gap-1">
                <HelpCircle className="w-3 h-3" />
                先方への確認事項
              </p>
              <ul className="space-y-0.5">
                {data.open_questions.map((item, i) => (
                  <li key={i} className="text-xs text-amber-900 leading-relaxed flex gap-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* next actions */}
          {data.next_actions.length > 0 && (
            <section className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1.5 inline-flex items-center gap-1">
                <ArrowRightCircle className="w-3 h-3" />
                次にやること
              </p>
              <ul className="space-y-0.5">
                {data.next_actions.map((item, i) => (
                  <li key={i} className="text-xs text-emerald-900 leading-relaxed">
                    ・{item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 次の動線 */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
            <p className="text-xs text-gray-700 leading-relaxed">
              この要件定義をベースに <span className="font-semibold">提案書</span> を作成すると、案件ステージが「提案中」に進みます。
            </p>
            <button
              type="button"
              disabled
              className="w-full px-4 py-2 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed border border-gray-200"
              title="今後実装予定：要件定義から提案書を直接生成できるようになります"
            >
              提案書を作成（今後実装予定）
            </button>
            <p className="text-xs text-gray-500 leading-relaxed">
              現在は議事録カードの「提案生成」ボタンから提案を作成してください。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
