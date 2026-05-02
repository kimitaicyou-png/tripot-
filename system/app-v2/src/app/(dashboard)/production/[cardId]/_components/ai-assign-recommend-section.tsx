'use client';

import { useState } from 'react';
import { Users, RotateCcw, Building2, User2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type Resource = {
  id: string;
  name: string;
  type: 'inhouse' | 'outsource';
  role: string;
  skills: string[];
  matched_skills: string[];
  load_rate: number;
  avg_speed_rate: number;
  quality_score: number;
  unit_price_yen: number;
  score: number;
  reason: string;
};

type RecommendResult = {
  card: { id: string; title: string };
  ai: {
    required_skills: string[];
    task_summary: string;
    recommend_rationale: string;
  };
  ranked: Resource[];
  generated_at: string;
};

function loadTone(rate: number): { color: string; label: string } {
  if (rate < 50) return { color: 'text-blue-700', label: '余裕' };
  if (rate <= 80) return { color: 'text-gray-700', label: '通常' };
  return { color: 'text-red-700', label: '過負荷' };
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const empty = max - full - (half ? 1 : 0);
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-amber-600">
      {'★'.repeat(full)}
      {half ? '⯨' : ''}
      {'☆'.repeat(empty)}
      <span className="ml-1 text-gray-700 font-medium tabular-nums">{value.toFixed(1)}</span>
    </span>
  );
}

export function AiAssignRecommendSection({ cardId }: { cardId: string }) {
  const [data, setData] = useState<RecommendResult | null>(null);
  const [running, setRunning] = useState(false);

  async function handleRecommend() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/recommend-assignee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'no_resources'
            ? 'メンバー / 外注先が登録されていません'
            : data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('AI アサイン推薦失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as RecommendResult;
      setData(json);
      toast.success(`AI が Top${json.ranked.length} を推薦しました`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('AI アサイン推薦失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500">AI アサイン推薦</p>
            <p className="text-sm text-gray-900 mt-1">
              タスク要件から必要スキルを AI が推論 → メンバー + 外注先を score 化して Top3 推薦
            </p>
            <p className="text-xs text-gray-700 mt-1">
              スキル match × 30 + 稼働(空き +20 / 通常 +10 / 過負荷 -20) + 速度 / 品質 / 最安 加点
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleRecommend} disabled={running}>
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              {running ? '推薦中…' : 'AI 推薦'}
            </span>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-gray-500">AI アサイン推薦</p>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {new Date(data.generated_at).toLocaleString('ja-JP')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleRecommend} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            {running ? '推薦中…' : '再推薦'}
          </span>
        </Button>
      </div>

      <div className="border-l-2 border-gray-300 pl-4 py-1 space-y-2">
        <p className="text-xs uppercase tracking-widest text-gray-500">タスク要約</p>
        <p className="text-sm text-gray-900">{data.ai.task_summary}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {data.ai.required_skills.map((s) => (
            <span
              key={s}
              className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 border border-blue-200"
            >
              {s}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-700 mt-2">
          <span className="text-gray-500">推薦軸：</span>{data.ai.recommend_rationale}
        </p>
      </div>

      <ul className="space-y-3">
        {data.ranked.map((r, idx) => {
          const tone = loadTone(r.load_rate);
          const Icon = r.type === 'inhouse' ? User2 : Building2;
          const isTop = idx === 0;
          return (
            <li
              key={r.id}
              className={`rounded-xl border p-4 ${
                isTop
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isTop && <Trophy className="w-4 h-4 text-amber-600" />}
                    <span className="text-xs uppercase tracking-widest text-gray-500">
                      推薦 {idx + 1}
                    </span>
                    <Icon className="w-3.5 h-3.5 text-gray-500" />
                    <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                    {r.type === 'outsource' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-gray-200 text-gray-700">
                        外注
                      </span>
                    )}
                    <span className="font-mono text-sm font-semibold text-blue-700 tabular-nums">
                      score {r.score}
                    </span>
                  </div>

                  {r.matched_skills.length > 0 && (
                    <p className="text-xs text-blue-700 mt-1 ml-1">
                      ✓ マッチ: {r.matched_skills.join(', ')}
                    </p>
                  )}
                  {r.matched_skills.length === 0 && r.skills.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1 ml-1">
                      保有: {r.skills.slice(0, 4).join(', ')}
                      {r.skills.length > 4 ? ' 他' : ''}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                    <span className={`font-mono font-medium ${tone.color}`}>
                      稼働 {r.load_rate}%（{tone.label}）
                    </span>
                    <span className="text-gray-500">
                      速度 <span className="font-mono">{r.avg_speed_rate}</span>
                    </span>
                    {r.quality_score > 0 && <StarRating value={r.quality_score} />}
                    {r.unit_price_yen > 0 && (
                      <span className="text-gray-700 font-mono">
                        ¥{r.unit_price_yen.toLocaleString('ja-JP')}/月
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-gray-700 mt-2 ml-1">→ {r.reason}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
        <p className="text-xs text-blue-700">
          AI 推薦は判断の参考です。最終アサインは案件 / メンバー詳細から手動で行います。
          score は skill_match × 30 + 稼働 + 速度 + 品質 + 最安 のロジック合計。
        </p>
      </div>
    </section>
  );
}
