'use client';

import { useState } from 'react';
import { Bot, RotateCcw, User2 } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

type Category =
  | 'development'
  | 'testing'
  | 'document'
  | 'template'
  | 'ui'
  | 'business_logic'
  | 'customer_facing'
  | 'negotiation'
  | 'other';

type OptimizeItem = {
  id: string;
  title: string;
  category: Category;
  rationale: string;
  original_hours: number;
  optimized_hours: number;
  reduction_rate: number;
  is_ai: boolean;
};

type OptimizeResult = {
  card: { id: string; title: string };
  hourly_rate_yen: number;
  items: OptimizeItem[];
  summary: {
    task_count: number;
    total_original_hours: number;
    total_optimized_hours: number;
    total_reduction_hours: number;
    overall_reduction_rate: number;
    cost_saving_yen: number;
  };
  generated_at: string;
};

const CATEGORY_LABEL: Record<Category, string> = {
  development: '開発',
  testing: 'テスト',
  document: 'ドキュメント',
  template: 'テンプレ流用',
  ui: 'UI 設計',
  business_logic: '業務ロジック',
  customer_facing: '顧客対応',
  negotiation: '交渉',
  other: 'その他',
};

const CATEGORY_BADGE: Record<Category, string> = {
  development: 'bg-blue-50 text-blue-700 border-blue-200',
  testing: 'bg-blue-50 text-blue-700 border-blue-200',
  document: 'bg-blue-50 text-blue-700 border-blue-200',
  template: 'bg-blue-50 text-blue-700 border-blue-200',
  ui: 'bg-amber-50 text-amber-800 border-amber-200',
  business_logic: 'bg-amber-50 text-amber-800 border-amber-200',
  customer_facing: 'bg-amber-50 text-amber-800 border-amber-200',
  negotiation: 'bg-amber-50 text-amber-800 border-amber-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function formatYen(value: number): string {
  return `¥${value.toLocaleString('ja-JP')}`;
}

export function AiWorkOptimizerSection({ cardId }: { cardId: string }) {
  const [data, setData] = useState<OptimizeResult | null>(null);
  const [running, setRunning] = useState(false);

  async function handleOptimize() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/optimize-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ card_id: cardId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'no_tasks'
            ? '紐付くタスクがありません'
            : data?.error === 'no_linked_deal'
            ? '案件に紐付かないため最適化対象外です'
            : data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('AI 工数最適化失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as OptimizeResult;
      setData(json);
      toast.success(
        `AI で工数 ${json.summary.overall_reduction_rate}% 削減、¥${json.summary.cost_saving_yen.toLocaleString('ja-JP')} の最適化余地`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('AI 工数最適化失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  if (!data) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-gray-500">AI 工数最適化</p>
            <p className="text-sm text-gray-900 mt-1">
              タスクを AI が分類し、AI 化可能な工数と人間専管の工数を分離。粗利改善余地を数値化
            </p>
            <p className="text-xs text-gray-700 mt-1">
              開発 80% / テスト 60% / ドキュメント 50% / テンプレ 70% 削減（隊長思想 7原則「AI で出来ることは AI で」の数値化）
            </p>
          </div>
          <Button type="button" variant="primary" onClick={handleOptimize} disabled={running}>
            <span className="inline-flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              {running ? '分析中…' : 'AI 化シミュレーション'}
            </span>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">AI 工数最適化</p>
          <p className="text-xs font-mono text-gray-500 mt-1">
            {new Date(data.generated_at).toLocaleString('ja-JP')} ／ 時給単価 {formatYen(data.hourly_rate_yen)}/h
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleOptimize} disabled={running}>
          <span className="inline-flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5" />
            {running ? '分析中…' : '再分析'}
          </span>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">タスク数</p>
          <p className="font-semibold text-3xl text-gray-900 mt-1 tabular-nums">
            {data.summary.task_count}
          </p>
        </div>
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">元工数</p>
          <p className="font-semibold text-3xl text-gray-900 mt-1 tabular-nums">
            {data.summary.total_original_hours}h
          </p>
        </div>
        <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
          <p className="text-xs text-blue-700">最適化後</p>
          <p className="font-semibold text-3xl text-blue-700 mt-1 tabular-nums">
            {data.summary.total_optimized_hours}h
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {data.summary.overall_reduction_rate}% 削減
          </p>
        </div>
        <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
          <p className="text-xs text-amber-800">予算削減効果</p>
          <p className="font-serif italic text-3xl text-amber-700 mt-1 tabular-nums tracking-tight">
            {formatYen(data.summary.cost_saving_yen)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {data.summary.total_reduction_hours}h 削減 × {formatYen(data.hourly_rate_yen)}/h
          </p>
        </div>
      </div>

      <div className="border-l-2 border-gray-200 pl-4">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">タスク別内訳</p>
        <ul className="divide-y divide-gray-100">
          {data.items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${CATEGORY_BADGE[item.category]}`}
                    >
                      {item.is_ai ? (
                        <Bot className="w-3 h-3 mr-1" />
                      ) : (
                        <User2 className="w-3 h-3 mr-1" />
                      )}
                      {CATEGORY_LABEL[item.category]}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{item.title}</p>
                  </div>
                  <p className="text-xs text-gray-700 mt-1 ml-1">{item.rationale}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-sm text-gray-700 tabular-nums">
                    {item.original_hours}h
                  </p>
                  {item.is_ai && item.original_hours !== item.optimized_hours ? (
                    <p className="font-mono text-sm text-blue-700 font-semibold tabular-nums">
                      → {item.optimized_hours}h ({Math.round(item.reduction_rate * 100)}%off)
                    </p>
                  ) : (
                    <p className="font-mono text-xs text-gray-500">人間専管</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-xs text-amber-700">
          隊長思想：「AI で出来ることは AI で。人間は判断と修正のみ」を数値で示す装置。
          {data.summary.overall_reduction_rate >= 50
            ? ' この案件は AI 化余地が大きい。粗利改善のチャンス'
            : ' この案件は人間専管比率が高い。AI 削減余地は限定的、その分付加価値を価格に反映'}
        </p>
      </div>
    </section>
  );
}
