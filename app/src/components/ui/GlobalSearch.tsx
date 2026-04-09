'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type SearchResult = {
  id: string;
  type: 'deal' | 'customer' | 'project' | 'member' | 'document';
  title: string;
  subtitle: string;
  url: string;
};

type Props = {
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
};

const MOCK_RESULTS: SearchResult[] = [
  { id: 'd1', type: 'deal', title: '株式会社山田製作所 DX支援', subtitle: '案件 · 進行中 · ¥3,200,000', url: '/home/kashiwagi' },
  { id: 'd2', type: 'deal', title: 'ナゴヤフーズ Lark Base導入', subtitle: '案件 · 提案中 · ¥1,800,000', url: '/home/inukai' },
  { id: 'd3', type: 'deal', title: '東海商事 業務改善コンサル', subtitle: '案件 · 完了 · ¥2,500,000', url: '/home/izumi' },
  { id: 'd4', type: 'deal', title: 'マルヨシ工業 AI見える化', subtitle: '案件 · 進行中 · ¥4,100,000', url: '/home/ono' },
  { id: 'd5', type: 'deal', title: 'セントラル物流 DXロードマップ', subtitle: '案件 · 失注 · ¥900,000', url: '/home/kashiwagi' },
  { id: 'c1', type: 'customer', title: '株式会社山田製作所', subtitle: '顧客 · 製造業 · 愛知県名古屋市', url: '/customers' },
  { id: 'c2', type: 'customer', title: 'ナゴヤフーズ株式会社', subtitle: '顧客 · 飲食業 · 愛知県名古屋市', url: '/customers' },
  { id: 'c3', type: 'customer', title: '東海商事株式会社', subtitle: '顧客 · 商社 · 愛知県名古屋市', url: '/customers' },
  { id: 'p1', type: 'project', title: 'Lark Base導入テンプレ整備', subtitle: 'プロジェクト · 進行中 · 担当: 犬飼', url: '/production' },
  { id: 'p2', type: 'project', title: '見積書自動化システム', subtitle: 'プロジェクト · 完了 · 担当: 柏樹', url: '/production' },
  { id: 'p3', type: 'project', title: 'Coaris AI v2 設計', subtitle: 'プロジェクト · 準備中 · 担当: 小野', url: '/production' },
  { id: 'm1', type: 'member', title: '柏樹 久美子', subtitle: 'メンバー · 社長 · トライポット', url: '/home/kashiwagi' },
  { id: 'm2', type: 'member', title: '犬飼 智之', subtitle: 'メンバー · 営業 · トライポット', url: '/home/inukai' },
  { id: 'm3', type: 'member', title: '和泉 阿委璃', subtitle: 'メンバー · デザイン · トライポット', url: '/home/izumi' },
  { id: 'm4', type: 'member', title: '小野 崇', subtitle: 'メンバー · エンジニア · トライポット', url: '/home/ono' },
];

const TYPE_LABEL: Record<SearchResult['type'], string> = {
  deal: '案件',
  customer: '顧客',
  project: 'プロジェクト',
  member: 'メンバー',
  document: 'ドキュメント',
};

const TYPE_ORDER: SearchResult['type'][] = ['deal', 'customer', 'project', 'member', 'document'];

function TypeIcon({ type }: { type: SearchResult['type'] }) {
  if (type === 'deal') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
  if (type === 'customer') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
  if (type === 'project') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
  if (type === 'member') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const TYPE_COLOR: Record<SearchResult['type'], string> = {
  deal: 'text-blue-600 bg-blue-50',
  customer: 'text-emerald-600 bg-emerald-50',
  project: 'text-amber-600 bg-amber-50',
  member: 'text-purple-600 bg-purple-50',
  document: 'text-gray-600 bg-gray-100',
};

export function GlobalSearch({ onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const filtered = query.trim() === ''
    ? MOCK_RESULTS
    : MOCK_RESULTS.filter((r) =>
        r.title.includes(query) || r.subtitle.includes(query)
      );

  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, type) => {
    const items = filtered.filter((r) => r.type === type);
    if (items.length > 0) acc[type] = items;
    return acc;
  }, {});

  const flat = Object.values(grouped).flat();

  const handleSelect = useCallback((result: SearchResult) => {
    onSelect(result);
    router.push(result.url);
    onClose();
  }, [onSelect, onClose, router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flat.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && flat[activeIndex]) { handleSelect(flat[activeIndex]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flat, activeIndex, handleSelect, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-gray-200 w-full max-w-lg shadow-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="案件・顧客・メンバーを検索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
            ESC
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {flat.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              「{query}」に一致する結果が見つかりませんでした
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const startIndex = flat.findIndex((r) => r.id === items[0].id);
              return (
                <div key={type}>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                    {TYPE_LABEL[type as SearchResult['type']]}
                  </div>
                  {items.map((result, i) => {
                    const globalIndex = startIndex + i;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-0 ${
                          activeIndex === globalIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[result.type]}`}>
                          <TypeIcon type={result.type} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-gray-900 truncate">{result.title}</div>
                          <div className="text-xs text-gray-500 truncate">{result.subtitle}</div>
                        </div>
                        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">↑↓</kbd>移動</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">Enter</kbd>選択</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">Esc</kbd>閉じる</span>
        </div>
      </div>
    </div>
  );
}
