'use client';

import type { ProductionCard } from '@/lib/stores/types';

type Props = {
  card: ProductionCard;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
  aiBusy: string | null;
  onAiAction: (action: string) => void;
  undoSitemap: string | null;
  onUndoSitemap: () => void;
};

export function StructureTab({ card, onUpdate, aiBusy, onAiAction, undoSitemap, onUndoSitemap }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-gray-900">サイトマップ / 画面構成</p>
        <div className="flex gap-1.5">
          {undoSitemap !== null && (
            <button onClick={onUndoSitemap} className="text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-200 active:scale-[0.98]">元に戻す</button>
          )}
          <button
            onClick={() => onAiAction('generate-sitemap')}
            disabled={aiBusy !== null || !((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '').trim()}
            className="text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg px-2 py-1 hover:bg-blue-100 active:scale-[0.98] disabled:opacity-50"
          >{aiBusy === 'generate-sitemap' ? '生成中...' : '要件から自動生成'}</button>
        </div>
      </div>
      <textarea
        value={card.sitemap ?? ''}
        onChange={(e) => onUpdate(card.id, { sitemap: e.target.value })}
        placeholder={'# サイトマップ\n- トップ\n  - お知らせ\n  - サービス\n- 管理画面\n  - ダッシュボード\n  - ユーザー管理'}
        className="w-full min-h-[320px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y font-mono text-gray-900"
      />
    </div>
  );
}
