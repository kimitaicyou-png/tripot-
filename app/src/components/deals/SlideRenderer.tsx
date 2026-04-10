'use client';

import type { Slide, Deal } from '@/lib/deals/types';
import { scheduleData } from '@/lib/deals/constants';

type SlideRendererProps = {
  slide: Slide;
  deal: Deal;
  isPresent: boolean;
};

export function SlideRenderer({ slide, deal, isPresent }: SlideRendererProps) {
  const isDark = ['cover', 'tech', 'cost', 'next'].includes(slide.type);
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/80' : 'text-gray-700';
  const titleSize = isPresent ? 'text-4xl md:text-5xl' : 'text-xl';
  const bodySize = isPresent ? 'text-xl md:text-2xl' : 'text-sm';
  const metaSize = isPresent ? 'text-base' : 'text-xs';

  if (slide.type === 'cover') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-between p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative">
          <span className={`inline-block px-3 py-1 bg-white/10 rounded ${metaSize} text-white/80 font-semibold mb-4`}>SYSTEM PROPOSAL</span>
          <h1 className={`${titleSize} font-semibold text-white leading-tight mb-3`}>{slide.title}</h1>
          <div className={`${bodySize} text-white/60`}>
            {slide.bullets.slice(0, 1).map((b, i) => <p key={i}>{b}</p>)}
          </div>
        </div>
        <div className="relative flex justify-between items-end">
          <div className="space-y-1">
            {slide.bullets.slice(1).map((b, i) => (
              <p key={i} className={`${metaSize} text-white/50`}>{b}</p>
            ))}
          </div>
          <div className="text-right">
            <p className={`${metaSize} text-white/80 font-semibold`}>トライポット株式会社</p>
            <p className={`${metaSize} text-white/40`}>柏樹 久美子</p>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === 'effect') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-2`}>{slide.title}</h2>
        <p className={`${metaSize} text-gray-500 mb-4`}>導入前後の比較（導入前=100として指数化）</p>
        <div className="flex-1 grid grid-cols-1 gap-3">
          {[
            { label: '工数削減', value: '30%削減', sub: '月40h → 月28h' },
            { label: 'コスト削減', value: '20%削減', sub: '運用コスト年間削減' },
            { label: '処理速度向上', value: '45%向上', sub: '業務スループット改善' },
            { label: 'エラー率低減', value: '75%削減', sub: 'ヒューマンエラー解消' },
          ].map((kpi) => (
            <div key={kpi.label} className={`flex items-center gap-3 ${isPresent ? 'p-3' : 'p-2'} bg-gray-50 rounded border border-gray-200`}>
              <div className={`w-0.5 ${isPresent ? 'h-12' : 'h-8'} bg-gray-900 rounded-full shrink-0`} />
              <div>
                <p className={`${isPresent ? 'text-2xl' : 'text-base'} font-semibold text-gray-900`}>{kpi.value}</p>
                <p className={`${metaSize} text-gray-500`}>{kpi.label} — {kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'tech') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-white mb-4`}>{slide.title}</h2>
        <div className="flex-1 grid grid-cols-1 gap-3">
          {[
            { layer: 'フロントエンド', items: ['Next.js 15 + TypeScript', 'Tailwind CSS v4', 'Vercel Deploy'] },
            { layer: 'バックエンド / API', items: ['Supabase (PostgreSQL)', 'Row Level Security', 'Realtime Subscriptions'] },
            { layer: 'インフラ / セキュリティ', items: ['Vercel Edge Network', 'JWT認証 + RLS', '暗号化通信 (TLS 1.3)'] },
          ].map((row, ri) => (
            <div key={ri} className="border-l-2 border-gray-600 px-4 py-3 bg-white/5">
              <p className={`${metaSize} text-gray-500 font-semibold uppercase tracking-wider mb-1`}>{row.layer}</p>
              <div className="flex flex-wrap gap-2">
                {row.items.map((item) => (
                  <span key={item} className={`${isPresent ? 'text-base' : 'text-xs'} font-medium text-white/80 bg-white/10 px-3 py-1 rounded`}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'schedule') {
    const totalWeeks = 12;
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-4`}>{slide.title}</h2>
        <div className="space-y-3 flex-1">
          {scheduleData.map((row) => (
            <div key={row.name} className="flex items-center gap-3">
              <span className={`${isPresent ? 'text-sm' : 'text-xs'} font-medium text-gray-700 w-28 shrink-0 text-right`}>{row.name}</span>
              <div className="flex-1 relative h-5 bg-gray-100 rounded overflow-hidden">
                <div className="absolute h-full rounded bg-gray-900" style={{ left: `${(row.start / totalWeeks) * 100}%`, width: `${(row.duration / totalWeeks) * 100}%` }} />
              </div>
              <span className={`${isPresent ? 'text-sm' : 'text-xs'} text-gray-500 font-medium w-12 shrink-0`}>{row.duration}週</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {slide.bullets.map((b, i) => (
            <div key={i} className={`flex items-start gap-2 ${isPresent ? 'p-3' : 'p-2'} bg-gray-50 rounded border border-gray-200`}>
              <span className="text-gray-500 font-semibold shrink-0">{i + 1}.</span>
              <span className={`${bodySize} text-gray-800 font-medium`}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'team') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-4`}>{slide.title}</h2>
        <div className="flex-1 grid grid-cols-2 gap-3">
          {[
            { role: 'プロジェクトマネージャー', name: deal.assignee, desc: '全体統括・顧客折衝' },
            { role: 'フロントエンドエンジニア', name: '担当TBD', desc: 'UI/UX実装・性能最適化' },
            { role: 'バックエンドエンジニア', name: '担当TBD', desc: 'API設計・DB設計' },
            { role: 'QAエンジニア', name: '担当TBD', desc: 'テスト計画・品質保証' },
          ].map((m) => (
            <div key={m.role} className={`${isPresent ? 'p-4' : 'p-3'} bg-gray-50 rounded border border-gray-200`}>
              <p className={`${isPresent ? 'text-sm' : 'text-xs'} text-gray-500 font-medium`}>{m.role}</p>
              <p className={`${isPresent ? 'text-xl' : 'text-sm'} font-semibold text-gray-900`}>{m.name}</p>
              <p className={`${metaSize} text-gray-500`}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'cases') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-2`}>{slide.title}</h2>
        <p className={`${metaSize} text-gray-500 mb-4`}>{deal.industry}業界における類似プロジェクト実績</p>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-50 rounded border border-dashed border-gray-300 w-full">
            <p className={`${isPresent ? 'text-xl' : 'text-base'} font-semibold text-gray-700 mb-2`}>事例データベース構築中</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['製造業実績: 3社', 'DX支援: 12社', '平均ROI: 180%'].map((tag) => (
                <span key={tag} className={`${metaSize} font-medium px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200`}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === 'cost') {
    const amt = deal.amount > 0 ? deal.amount : 0;
    const tax = Math.round(amt * 0.1);
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col p-6 relative overflow-hidden">
        <h2 className={`${titleSize} font-semibold text-white mb-4 relative`}>{slide.title}</h2>
        {amt > 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <p className="text-white/50 font-medium mb-2">お見積り総額（税別）</p>
            <p className={`${isPresent ? 'text-6xl md:text-8xl' : 'text-4xl'} font-semibold text-white tabular-nums`}>¥{(amt / 10000).toFixed(0)}<span className={`${isPresent ? 'text-3xl' : 'text-xl'}`}>万</span></p>
            <p className="text-white/40 mt-2 tabular-nums">税込: ¥{(amt + tax).toLocaleString()}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <p className={`${isPresent ? 'text-2xl' : 'text-lg'} font-semibold text-white/70 mb-2`}>別途お見積りいたします</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[['開発', '45'], ['設計', '25'], ['テスト', '15'], ['PM', '15']].map(([name, value]) => (
                <span key={name} className="text-xs font-medium px-3 py-1 bg-white/10 text-white/70 rounded">{name}: {value}%</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (slide.type === 'next') {
    const steps = slide.bullets.slice(0, 4);
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-white mb-6`}>{slide.title}</h2>
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`${isPresent ? 'w-10 h-10 text-base' : 'w-7 h-7 text-sm'} bg-white/10 border border-white/20 rounded flex items-center justify-center font-semibold text-white shrink-0`}>{i + 1}</div>
                <div className={`flex-1 ${isPresent ? 'p-4' : 'p-3'} bg-white/5 border border-white/10 rounded`}>
                  <p className={`${bodySize} font-medium text-white/80`}>{step.replace(/^\d+\.\s/, '')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${isDark ? 'bg-gray-900' : 'bg-white'} flex flex-col p-6`}>
      <h2 className={`${titleSize} font-semibold ${textMain} mb-4`}>{slide.title}</h2>
      <div className="flex-1 space-y-2">
        {slide.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`text-gray-500 font-medium shrink-0 ${isPresent ? 'text-xl' : 'text-base'}`}>—</span>
            <span className={`${bodySize} ${textSub} font-normal`}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
