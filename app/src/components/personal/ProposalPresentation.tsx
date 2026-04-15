'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type Slide = { type: string; title: string; bullets: string[] };
type Deal = { id: string; clientName: string; dealName: string; industry: string; stage: string; amount: number; probability: number; assignee: string; lastDate: string; memo: string; revenueType: string; };

const SECTION_META = [
  { key: 'ki',    label: '起', sub: '課題提起',   color: '#B91C1C', gradient: 'from-red-900 via-red-800 to-red-950' },
  { key: 'shou',  label: '承', sub: 'ソリューション', color: '#1D4ED8', gradient: 'from-blue-900 via-blue-800 to-blue-950' },
  { key: 'ten',   label: '転', sub: '実行計画',   color: '#047857', gradient: 'from-emerald-900 via-emerald-800 to-emerald-950' },
  { key: 'ketsu', label: '結', sub: 'ビジョン',   color: '#7C3AED', gradient: 'from-violet-900 via-violet-800 to-violet-950' },
];

const TYPE_TO_SEC: Record<string, number> = {
  cover: -1, problem: 0, solution: 1, effect: 1, tech: 1, schedule: 2, team: 2, cases: 2, cost: 2, next: 3, custom: 3,
};

function CountUp({ end, duration = 1200, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    setVal(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(end * ease));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);
  return <span>{prefix}{val.toLocaleString()}{suffix}</span>;
}

function FadeInItem({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </div>
  );
}

function AnimatedBar({ width, delay = 0, color }: { width: number; delay?: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    setW(0);
    const t = setTimeout(() => setW(width), delay + 100);
    return () => clearTimeout(t);
  }, [width, delay]);
  return (
    <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: color }} />
  );
}

function RichSlide({ slide, deal, sectionColor, slideKey }: { slide: Slide; deal: Deal; sectionColor: string; slideKey: string }) {
  const amt = deal.amount > 0 ? deal.amount : 0;

  if (slide.type === 'cover') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col justify-center items-center p-16 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.04]" style={{ background: `radial-gradient(circle, ${sectionColor}, transparent 50%)` }} />
        </div>
        <div className="relative text-center max-w-4xl">
          <FadeInItem delay={300}>
            <div className="w-12 h-[2px] mx-auto mb-10" style={{ backgroundColor: sectionColor }} />
          </FadeInItem>
          <FadeInItem delay={500}>
            <h1 className="text-5xl md:text-7xl font-semibold text-white leading-[1.1] tracking-tight mb-6">{slide.title}</h1>
          </FadeInItem>
          <FadeInItem delay={700}>
            <p className="text-xl text-white/40 mb-16">{slide.bullets[0]}</p>
          </FadeInItem>
          <FadeInItem delay={900}>
            <div className="flex items-center justify-center gap-8 text-sm text-white/30">
              {slide.bullets.slice(1).map((b, i) => (
                <span key={i}>{b}</span>
              ))}
            </div>
          </FadeInItem>
        </div>
      </div>
    );
  }

  if (slide.type === 'effect') {
    const kpis = [
      { label: '業務効率', value: 30, unit: '%改善', icon: '↗', sub: '手作業の自動化' },
      { label: '判断速度', value: 3, unit: '秒で判断', icon: '⚡', sub: 'リアルタイムダッシュボード' },
      { label: 'エラー削減', value: 90, unit: '%削減', icon: '✓', sub: 'ヒューマンエラー解消' },
      { label: 'コスト削減', value: 20, unit: '%削減', icon: '↓', sub: '運用コスト年間' },
    ];
    return (
      <div className="w-full h-full bg-white flex flex-col p-8">
        <FadeInItem><h2 className="text-4xl font-semibold text-gray-900 mb-8">{slide.title}</h2></FadeInItem>
        <div className="flex-1 grid grid-cols-2 gap-6">
          {kpis.map((kpi, i) => (
            <FadeInItem key={kpi.label} delay={200 + i * 200} className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${sectionColor}15`, color: sectionColor }}>{kpi.icon}</div>
              <div>
                <div className="text-4xl font-semibold text-gray-900 tabular-nums"><CountUp end={kpi.value} suffix={kpi.unit} /></div>
                <p className="text-sm text-gray-500 mt-1">{kpi.label} — {kpi.sub}</p>
              </div>
            </FadeInItem>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'cost') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]" style={{ background: `radial-gradient(circle, ${sectionColor}, transparent 50%)` }} />
        <FadeInItem delay={200}>
          <p className="text-base text-white/30 tracking-widest uppercase mb-8">{slide.title}</p>
        </FadeInItem>
        <FadeInItem delay={500}>
          <div className="text-center">
            <span className="text-white/20 text-4xl">¥</span>
            <span className="text-[120px] md:text-[160px] font-semibold text-white tabular-nums leading-none">
              <CountUp end={Math.round(amt / 10000)} duration={2000} />
            </span>
            <span className="text-white/40 text-5xl">万</span>
          </div>
        </FadeInItem>
        <FadeInItem delay={1000}>
          <div className="mt-12 flex items-center gap-6">
            {slide.bullets.slice(1).map((b, i) => (
              <span key={i} className="text-sm text-white/30">{b}</span>
            ))}
          </div>
        </FadeInItem>
      </div>
    );
  }

  if (slide.type === 'schedule') {
    const phases = [
      { name: '要件定義', start: 0, dur: 2, color: '#EF4444' },
      { name: '基本設計', start: 2, dur: 2, color: '#F59E0B' },
      { name: '開発・実装', start: 4, dur: 6, color: '#3B82F6' },
      { name: 'テスト・導入', start: 10, dur: 2, color: '#10B981' },
    ];
    return (
      <div className="w-full h-full bg-white flex flex-col p-8">
        <FadeInItem><h2 className="text-4xl font-semibold text-gray-900 mb-8">{slide.title}</h2></FadeInItem>
        <div className="flex-1 space-y-5">
          {phases.map((p, i) => (
            <FadeInItem key={p.name} delay={300 + i * 200}>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-600 w-28 text-right shrink-0">{p.name}</span>
                <div className="flex-1 h-10 bg-gray-100 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 rounded-full flex items-center px-3" style={{ left: `${(p.start / 12) * 100}%`, width: `${(p.dur / 12) * 100}%` }}>
                    <AnimatedBar width={100} delay={400 + i * 200} color={p.color} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-500 w-16 shrink-0">{p.dur}週間</span>
              </div>
            </FadeInItem>
          ))}
          <FadeInItem delay={1200}>
            <div className="flex items-center justify-between mt-4 px-32">
              <span className="text-xs text-gray-500">Month 1</span>
              <span className="text-xs text-gray-500">Month 2</span>
              <span className="text-xs text-gray-500">Month 3</span>
            </div>
          </FadeInItem>
        </div>
        <FadeInItem delay={1400}>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-semibold text-lg">!</div>
            <p className="text-sm text-gray-600">発注から約<span className="font-semibold text-gray-900">3ヶ月</span>で本番リリース</p>
          </div>
        </FadeInItem>
      </div>
    );
  }

  if (slide.type === 'problem') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-12 relative overflow-hidden">
        <FadeInItem>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-8 h-[2px]" style={{ backgroundColor: sectionColor }} />
            <h2 className="text-4xl font-semibold text-gray-900 tracking-tight">{slide.title}</h2>
          </div>
        </FadeInItem>
        <div className="flex-1 flex flex-col justify-center space-y-6">
          {slide.bullets.map((b, i) => (
            <FadeInItem key={i} delay={300 + i * 200}>
              <div className="flex items-start gap-5">
                <span className="text-sm font-semibold tabular-nums shrink-0 mt-1" style={{ color: sectionColor }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-2xl text-gray-800 font-medium leading-relaxed">{b}</p>
              </div>
            </FadeInItem>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'next') {
    return (
      <div className={`w-full h-full bg-gradient-to-br ${SECTION_META[3].gradient} flex flex-col p-8 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(ellipse at 30% 50%, white, transparent 60%)' }} />
        <FadeInItem><h2 className="text-4xl font-semibold text-white mb-8">{slide.title}</h2></FadeInItem>
        <div className="flex-1 space-y-4">
          {slide.bullets.map((b, i) => (
            <FadeInItem key={i} delay={300 + i * 250}>
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 backdrop-blur border border-white/10 hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white/80 font-semibold text-lg shrink-0 border-2 border-white/20">
                  {i + 1}
                </div>
                <p className="text-xl text-white/90 font-medium">{b.replace(/^\d+\.\s*/, '')}</p>
              </div>
            </FadeInItem>
          ))}
        </div>
      </div>
    );
  }

  const isDark = ['tech'].includes(slide.type);
  return (
    <div className={`w-full h-full ${isDark ? 'bg-gray-950' : 'bg-white'} flex flex-col p-12 relative overflow-hidden`}>
      <FadeInItem>
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-[2px]" style={{ backgroundColor: sectionColor }} />
          <h2 className={`text-4xl font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{slide.title}</h2>
        </div>
      </FadeInItem>
      <div className="flex-1 flex flex-col justify-center space-y-5">
        {slide.bullets.map((b, i) => (
          <FadeInItem key={i} delay={200 + i * 150}>
            <div className="flex items-start gap-5">
              <div className="w-1.5 h-1.5 rounded-full mt-3 shrink-0" style={{ backgroundColor: sectionColor }} />
              <p className={`text-2xl ${isDark ? 'text-white/85' : 'text-gray-700'} font-medium leading-relaxed`}>{b}</p>
            </div>
          </FadeInItem>
        ))}
      </div>
    </div>
  );
}

export default function ProposalPresentation({ slides, deal, onClose }: { slides: Slide[]; deal: Deal; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [transitioning, setTransitioning] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const allSlides = slides;

  const secOf = (s: Slide) => TYPE_TO_SEC[s.type] ?? -1;
  const currentSec = secOf(allSlides[current]);
  const secMeta = SECTION_META[currentSec] ?? SECTION_META[0];

  const goTo = useCallback((idx: number, dir: 'next' | 'prev') => {
    if (transitioning) return;
    setDirection(dir);
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setRenderKey((k) => k + 1);
      setTransitioning(false);
    }, 300);
  }, [transitioning]);

  const prev = useCallback(() => { if (current > 0) goTo(current - 1, 'prev'); }, [current, goTo]);
  const next = useCallback(() => { if (current < allSlides.length - 1) goTo(current + 1, 'next'); }, [current, allSlides.length, goTo]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [prev, next, onClose]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  };
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const progress = allSlides.length > 1 ? (current / (allSlides.length - 1)) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden select-none">
      <div className="absolute top-0 left-0 right-0 h-0.5 z-30 bg-white/5">
        <div className="h-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, backgroundColor: secMeta.color }} />
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 z-20 shrink-0">
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-white font-medium transition-colors">
          ← 閉じる
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {SECTION_META.map((sec, i) => {
              const isActive = i === currentSec;
              const secSlides = allSlides.filter((s) => secOf(s) === i);
              const hasSlides = secSlides.length > 0;
              return (
                <button key={sec.key} disabled={!hasSlides}
                  onClick={() => { const idx = allSlides.findIndex((s) => secOf(s) === i); if (idx >= 0) goTo(idx, idx > current ? 'next' : 'prev'); }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-white/25 hover:text-white/50'}`}
                  style={{ backgroundColor: isActive ? sec.color : 'transparent' }}>
                  {sec.label}
                </button>
              );
            })}
          </div>
          <span className="text-xs text-gray-600 tabular-nums">{current + 1} / {allSlides.length}</span>
          <button onClick={toggleFullscreen} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-full text-xs font-medium transition-all">
            {isFullscreen ? '通常' : '全画面'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <button onClick={prev} disabled={current === 0}
          className="absolute left-3 z-10 w-14 h-14 bg-white/0 hover:bg-white/5 disabled:opacity-0 rounded-full flex items-center justify-center text-white/40 hover:text-white text-2xl transition-all duration-300">
          ‹
        </button>

        <div className="w-full max-w-6xl px-20" style={{ aspectRatio: '16/9' }}>
          <div
            className={`w-full h-full rounded-2xl overflow-hidden shadow-sm transition-all duration-300 ease-out ${transitioning ? (direction === 'next' ? 'opacity-0 translate-x-8 scale-[0.98]' : 'opacity-0 -translate-x-8 scale-[0.98]') : 'opacity-100 translate-x-0 scale-100'}`}
            style={{ boxShadow: `0 0 80px ${secMeta.color}15, 0 25px 50px rgba(0,0,0,0.5)` }}>
            <RichSlide key={renderKey} slide={allSlides[current]} deal={deal as Deal} sectionColor={secMeta.color} slideKey={`${current}`} />
          </div>
        </div>

        <button onClick={next} disabled={current === allSlides.length - 1}
          className="absolute right-3 z-10 w-14 h-14 bg-white/0 hover:bg-white/5 disabled:opacity-0 rounded-full flex items-center justify-center text-white/40 hover:text-white text-2xl transition-all duration-300">
          ›
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 py-3 shrink-0">
        {allSlides.map((s, i) => {
          const sec = secOf(s);
          const meta = SECTION_META[sec] ?? SECTION_META[0];
          return (
            <button key={i} onClick={() => goTo(i, i > current ? 'next' : 'prev')}
              className={`rounded-full transition-all duration-300 ${i === current ? 'w-8 h-2' : 'w-2 h-2 hover:scale-150'}`}
              style={{ backgroundColor: i === current ? meta.color : `${meta.color}30` }} />
          );
        })}
      </div>
    </div>
  );
}
