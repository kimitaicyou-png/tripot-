'use client';

import { useState } from 'react';
import type { Deal, Slide, Stage } from '@/lib/deals/types';
import { KSTK_TABS, getMarketData } from '@/lib/deals/constants';
import { gatherDealContext } from '@/lib/deals/dealContext';
import { SlideRenderer } from './SlideRenderer';
import { PresentationView } from './PresentationView';

type ProposalEditorProps = {
  deal: Deal;
  onClose: () => void;
  onCreateEstimate: (slides: Slide[]) => void;
  onAutoAdvance?: (id: string, stage: Stage) => void;
};

function SlideEditorCard({ slide, idx, total, onUpdate, onRemove }: {
  slide: Slide; idx: number; total: number;
  onUpdate: (s: Slide) => void; onRemove: () => void;
}) {
  const isDark = ['cover', 'tech', 'cost', 'next'].includes(slide.type);
  const bgMap: Record<string, string> = {
    cover: 'bg-gray-900',
    problem: 'bg-white border border-gray-200',
    solution: 'bg-white border border-gray-200',
    effect: 'bg-white border border-gray-200',
    tech: 'bg-gray-950',
    schedule: 'bg-white border border-gray-200',
    team: 'bg-white border border-gray-200',
    cases: 'bg-white border border-gray-200',
    cost: 'bg-gray-900',
    next: 'bg-gray-900',
    custom: 'bg-white border border-gray-200',
  };
  const textC = isDark ? 'text-white' : 'text-gray-900';
  const subC = isDark ? 'text-white/70' : 'text-gray-700';
  const inputBase = `bg-transparent focus:ring-0 p-0 w-full placeholder:text-gray-500 border-b border-white/30`;

  return (
    <div className="relative group">
      <div className={`${bgMap[slide.type] ?? 'bg-white'} rounded p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`}>{idx + 1} / {total}</span>
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            {({'cover': '表紙', 'problem': '課題', 'solution': '解決策', 'effect': '効果', 'tech': '技術構成', 'schedule': 'スケジュール', 'team': '体制', 'cases': '事例', 'cost': '費用', 'next': '次のステップ', 'custom': 'カスタム'} as Record<string, string>)[slide.type] ?? slide.type}
          </span>
        </div>
        <input value={slide.title} onChange={(e) => onUpdate({ ...slide, title: e.target.value })}
          className={`${inputBase} text-base font-semibold ${textC}`} placeholder="スライドタイトル" />
        <div className="space-y-1.5">
          {slide.bullets.map((b, bi) => (
            <div key={bi} className="flex items-start gap-2">
              <span className={`${subC} shrink-0 font-medium mt-0.5`}>•</span>
              <input value={b} onChange={(e) => { const nb = [...slide.bullets]; nb[bi] = e.target.value; onUpdate({ ...slide, bullets: nb }); }}
                className={`${inputBase} text-sm ${subC}`} placeholder="内容を入力..." />
              <button onClick={() => onUpdate({ ...slide, bullets: slide.bullets.filter((_, i) => i !== bi) })}
                className={`opacity-0 group-hover:opacity-100 text-sm shrink-0 ${isDark ? 'text-white/40 hover:text-red-300' : 'text-gray-500 hover:text-red-500'}`}>×</button>
            </div>
          ))}
          <button onClick={() => onUpdate({ ...slide, bullets: [...slide.bullets, ''] })}
            className={`text-xs font-medium ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'}`}>+ 行を追加</button>
        </div>
      </div>
      <button onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">×</button>
    </div>
  );
}

function ProposalPromptSection({
  deal, prompt, onPromptChange, generating, onGenerate, researchEnabled, onResearchChange,
}: {
  deal: Deal; prompt: string; onPromptChange: (v: string) => void;
  generating: boolean; onGenerate: () => void;
  researchEnabled: boolean; onResearchChange: (v: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [sheets, setSheets] = useState<Record<string, string>>({ ki: '', shou: '', ten: '', ketsu: '' });

  const updateSheet = (key: string, val: string) => {
    const next = { ...sheets, [key]: val };
    setSheets(next);
    const parts = KSTK_TABS.map((t) => next[t.key] ? `【${t.label} ${t.sub}】\n${next[t.key]}` : '').filter(Boolean);
    const base = `あなたは${deal.industry}業界のシステム提案のプロフェッショナルです。\n「${deal.dealName}」の提案書を起承転結の構成で作成してください。\n顧客: ${deal.clientName}\n予算感: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}\n`;
    onPromptChange(parts.length > 0 ? base + '\n' + parts.join('\n\n') : base);
  };

  const tab = KSTK_TABS[activeTab];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">提案書を作成</h2>
        <p className="text-sm text-gray-500">{deal.clientName} | {deal.dealName}</p>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg px-4 py-3">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-indigo-900">✨ 市場調査をAIに含めさせる</p>
            <p className="text-xs text-indigo-600 mt-0.5">業界市場データ・競合・トレンドを最新情報から取得して提案書に反映します</p>
            {researchEnabled && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['業界規模', '成長率', '主要トレンド', '競合'].map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onResearchChange(!researchEnabled)}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors active:scale-[0.98] ${researchEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            aria-pressed={researchEnabled}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${researchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="px-6">
        <div className="flex gap-1 border-b border-gray-100">
          {KSTK_TABS.map((t, i) => (
            <button key={t.key} onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 ${i === activeTab ? 'border-current text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-600'}`}
              style={i === activeTab ? { color: t.color } : undefined}>
              <span className="w-5 h-5 rounded text-xs font-semibold flex items-center justify-center text-white" style={{ backgroundColor: t.color }}>{t.label}</span>
              <span className="hidden sm:inline">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: tab.color }} />
          <span className="text-sm font-semibold text-gray-900">{tab.label} — {tab.sub}</span>
        </div>
        <textarea
          value={sheets[tab.key]}
          onChange={(e) => updateSheet(tab.key, e.target.value)}
          rows={4}
          placeholder={`${tab.placeholder}\n（空欄ならAIが自動で構成します）`}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none leading-relaxed placeholder:text-gray-500"
        />
        <div className="flex gap-1 mt-2">
          {KSTK_TABS.map((t) => (
            <div key={t.key} className="flex-1 h-1 rounded-full" style={{ backgroundColor: sheets[t.key] ? t.color : '#e5e7eb' }} />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">入力されたシートは色付きで表示されます。空欄のシートはAIが自動補完します。</p>
      </div>

      <div className="px-6 pb-5">
        <button onClick={onGenerate} disabled={generating}
          className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors active:scale-[0.98]">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </span>
          ) : 'AIで提案書を生成'}
        </button>
      </div>
    </div>
  );
}

function buildSlides(deal: Deal, withResearch: boolean): Slide[] {
  const md = withResearch ? getMarketData(deal.industry) : null;
  const coverTitle = withResearch ? `${deal.dealName} ✦ 市場調査済み` : deal.dealName;
  const marketBullets = md
    ? [`市場規模: ${md.size}`, `成長率: ${md.growth}`, ...md.trends.map((t) => `・${t}`)]
    : [`${deal.industry}業界のDX市場は年15%成長`, '中小企業のシステム投資は過去5年で2.3倍に拡大', '人手不足により業務自動化のニーズが急増', 'クラウド移行の波が加速中'];
  return [
    { type: 'cover', title: coverTitle, bullets: [`${deal.clientName} 御中`, `トライポット株式会社`, `担当: ${deal.assignee}`, `2026年4月`] },
    { type: 'problem', title: `${deal.industry}業界の市場動向`, bullets: marketBullets },
    { type: 'problem', title: `${deal.clientName}の現状と課題`, bullets: ['既存システムの老朽化による保守コスト増大', 'データのサイロ化で経営判断に必要な情報が散在', '属人的な業務フローが事業拡大のボトルネックに', `${deal.industry}業界特有の規制対応・セキュリティ要件`] },
    { type: 'solution', title: 'サービス概要', bullets: [`${deal.dealName}`, `${deal.clientName}の課題を解決する統合型システム`, 'データ一元管理 + AI自動化 + リアルタイム可視化', 'クラウドネイティブで初期費用を抑えた導入'] },
    { type: 'effect', title: 'サービス特徴', bullets: ['業務効率30%改善 ― 手作業を自動化', '経営判断を3秒に ― リアルタイムダッシュボード', '属人化ゼロ ― 標準化されたワークフロー', 'AI活用 ― 提案書・見積書・要件定義を自動生成'] },
    { type: 'tech', title: 'ビジネスフロー', bullets: [`${deal.clientName}（発注者）→ トライポット（開発・運用）`, '日次: データ自動連携で手入力ゼロ', '週次: AIが自動でレポート生成・課題検出', '月次: 経営ダッシュボードで即判断'] },
    { type: 'tech', title: '競合優位性', bullets: md ? ['AI前提設計 ― 競合の後付けAIとは根本が違う', '行動ベースKPI ― 結果だけでなくプロセスを可視化', `${deal.industry}業界特化 ― 汎用SaaSにない専門機能`, `主要競合(${md.competitors.join('・')})を凌駕するスピードと専門性`] : ['AI前提設計 ― 競合の後付けAIとは根本が違う', '行動ベースKPI ― 結果だけでなくプロセスを可視化', `${deal.industry}業界特化 ― 汎用SaaSにない専門機能`, '高速開発 ― 数日でプロトタイプ、数週間で本番'] },
    { type: 'cost', title: '費用概要', bullets: deal.amount > 0 ? [`総額: ¥${deal.amount.toLocaleString()}（税別）`, '支払条件: 着手30% / 中間30% / 検収40%', `月額運用: ¥${Math.round(deal.amount * 0.05 / 10000)}万円/月（保守・AI利用料込み）`] : ['別途お見積りいたします'] },
    { type: 'cases', title: 'KPI・投資対効果', bullets: [`投資回収: ${deal.amount > 0 ? Math.ceil(deal.amount / 500000) : 12}ヶ月で回収見込`, '業務工数: 月間40時間の削減', '判断速度: 月次報告 → リアルタイムに短縮', '人的ミス: 手入力による誤りを90%削減'] },
    { type: 'schedule', title: '開発スケジュール', bullets: ['Phase 1: 要件定義・基本設計（2週間）', 'Phase 2: 詳細設計（2週間）', 'Phase 3: 開発・実装（6週間）', 'Phase 4: テスト・導入支援（2週間）'] },
    { type: 'team', title: '販売・獲得プラン', bullets: [`プロジェクトマネージャー: ${deal.assignee}`, '初月: プロトタイプで体験 → 社内合意形成', '2-3月: 本開発 → 段階的リリース', '4月〜: 運用開始 → 月次改善サイクル'] },
    { type: 'next', title: 'ビジョン ― 3年後の未来', bullets: [`${deal.clientName}の全業務がAIで最適化された状態`, '経営者は判断だけに集中できる組織へ', 'データが溜まるほど会社が賢くなる仕組み', `${deal.industry}業界のDX先進企業としてのポジション確立`] },
    { type: 'next', title: 'ネクストステップ', bullets: ['1. 本提案内容のご検討（1週間）', '2. 詳細要件の擦り合わせ（お打ち合わせ）', '3. 正式見積書のご提出', '4. ご発注・キックオフ'] },
  ];
}

export function ProposalEditor({ deal, onClose, onCreateEstimate, onAutoAdvance }: ProposalEditorProps) {
  const [step, setStep] = useState<'prompt' | 'edit' | 'present'>('prompt');
  const dealContext = gatherDealContext(deal);
  const storedNeeds = typeof window !== 'undefined'
    ? (() => { try { const v = localStorage.getItem(`coaris_needs_${deal.id}`); return v ? (JSON.parse(v) as string[]) : []; } catch { return []; } })()
    : [];
  const needsAppend = storedNeeds.length > 0
    ? `\n\n【事前抽出ニーズ（自動反映）】\n${storedNeeds.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    : '';
  const [prompt, setPrompt] = useState(
    `あなたは${deal.industry}業界のシステム提案のプロフェッショナルです。\n\n以下の顧客データに基づいて「${deal.dealName}」の提案書を作成してください。\n\n${dealContext}\n【提案方針】\n・${deal.industry}業界の課題に精通した視点で書く\n・顧客のニーズに全て応える提案にする\n・技術的な優位性を明確にする\n・導入効果を数値で示す\n・予算感: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}${needsAppend}`
  );
  const [generating, setGenerating] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);

  const handleGenerate = () => {
    if (researchEnabled) {
      setResearching(true);
      setTimeout(() => {
        setResearching(false);
        setGenerating(true);
        setTimeout(() => {
          setSlides(buildSlides(deal, true));
          setGenerating(false);
          setStep('edit');
          if (['lead', 'meeting'].includes(deal.stage) && onAutoAdvance) {
            onAutoAdvance(deal.id, 'proposal');
          }
        }, 1400);
      }, 800);
    } else {
      setGenerating(true);
      setTimeout(() => {
        setSlides(buildSlides(deal, false));
        setGenerating(false);
        setStep('edit');
        if (['lead', 'meeting'].includes(deal.stage) && onAutoAdvance) {
          onAutoAdvance(deal.id, 'proposal');
        }
      }, 1800);
    }
  };

  const updateSlide = (idx: number, slide: Slide) => setSlides((prev) => prev.map((s, i) => (i === idx ? slide : s)));
  const removeSlide = (idx: number) => setSlides((prev) => prev.filter((_, i) => i !== idx));
  const addSlide = () => setSlides((prev) => [...prev, { type: 'custom', title: '新しいスライド', bullets: [''] }]);

  const isLoading = researching || generating;
  const loadingLabel = researching ? `市場調査を実行中... (${deal.industry})` : `${deal.industry}業界の提案プロとして生成中...`;

  if (step === 'present') return <PresentationView slides={slides} deal={deal} onClose={() => setStep('edit')} />;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900 font-medium">← 戻る</button>
          {step === 'edit' && (
            <div className="flex gap-2">
              <button onClick={() => setStep('present')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 active:scale-[0.98]">プレゼン表示</button>
              <button onClick={() => { onCreateEstimate(slides); }} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 active:scale-[0.98]">この提案書から見積書を作成</button>
            </div>
          )}
        </div>
        <div className="px-5 py-5">
          {step === 'prompt' && (
            <>
              <ProposalPromptSection
                deal={deal}
                prompt={prompt}
                onPromptChange={setPrompt}
                generating={isLoading}
                onGenerate={handleGenerate}
                researchEnabled={researchEnabled}
                onResearchChange={setResearchEnabled}
              />
              {isLoading && (
                <div className="mt-3 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                  <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin flex-shrink-0" />
                  {loadingLabel}
                </div>
              )}
            </>
          )}
          {step === 'edit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">{slides.length}枚のスライド</h2>
                <button onClick={() => setStep('prompt')} className="text-sm text-gray-500 hover:text-gray-900 font-medium">AIで再生成</button>
              </div>
              {slides.map((slide, i) => (
                <SlideEditorCard key={i} slide={slide} idx={i} total={slides.length}
                  onUpdate={(s) => updateSlide(i, s)} onRemove={() => removeSlide(i)} />
              ))}
              <button onClick={addSlide}
                className="w-full py-3 border border-dashed border-gray-300 rounded text-sm font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors active:scale-[0.98]">
                + スライドを追加
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
