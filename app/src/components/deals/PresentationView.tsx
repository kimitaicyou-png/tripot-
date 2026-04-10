'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Deal, Slide } from '@/lib/deals/types';
import { KISHOUTENKETSU, SLIDE_TO_SECTION } from '@/lib/deals/constants';
import { SlideRenderer } from './SlideRenderer';

type PresentationViewProps = {
  slides: Slide[];
  deal: Deal;
  onClose: () => void;
};

export function PresentationView({ slides, deal, onClose }: PresentationViewProps) {
  const [view, setView] = useState<'map' | 'section' | 'slide'>('map');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animating, setAnimating] = useState(false);

  const sectionSlides = (si: number) => slides.filter((s) => SLIDE_TO_SECTION[s.type] === si);
  const currentSectionSlides = sectionSlides(sectionIdx);

  const animateTo = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 50);
  };

  const zoomIntoSection = (si: number) => animateTo(() => { setSectionIdx(si); setSlideIdx(0); setView('slide'); });
  const zoomOut = () => animateTo(() => setView('map'));

  const prevSlide = useCallback(() => {
    setSlideIdx((c) => {
      if (c > 0) return c - 1;
      if (sectionIdx > 0) {
        const prevSec = sectionIdx - 1;
        const prevSlides = slides.filter((s) => SLIDE_TO_SECTION[s.type] === prevSec);
        setSectionIdx(prevSec);
        return Math.max(0, prevSlides.length - 1);
      }
      return c;
    });
  }, [sectionIdx, slides]);

  const nextSlide = useCallback(() => {
    const secSlides = slides.filter((s) => SLIDE_TO_SECTION[s.type] === sectionIdx);
    setSlideIdx((c) => {
      if (c < secSlides.length - 1) return c + 1;
      if (sectionIdx < 3) {
        setSectionIdx(sectionIdx + 1);
        return 0;
      }
      return c;
    });
  }, [sectionIdx, slides]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (view === 'slide') zoomOut(); else onClose(); }
      if (view === 'slide') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSlide();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      }
      if (view === 'map') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomIntoSection(0); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, prevSlide, nextSlide, onClose, sectionIdx]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const totalFlatIdx = slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).slice(0, slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).findIndex((s) => s === currentSectionSlides[slideIdx]) + 1).length;
  const totalSlideCount = slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).length;

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950/80 backdrop-blur border-b border-white/5 shrink-0 z-20">
        <button onClick={() => { if (view === 'slide') zoomOut(); else onClose(); }}
          className="text-sm text-gray-500 hover:text-white font-medium transition-colors">
          {view === 'slide' ? '← マップに戻る' : '← 閉じる'}
        </button>
        <div className="flex items-center gap-3">
          {view === 'slide' && (
            <div className="flex items-center gap-2">
              {KISHOUTENKETSU.map((sec, i) => (
                <button key={sec.key} onClick={() => zoomIntoSection(i)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${i === sectionIdx ? 'text-white scale-110' : 'text-white/30 hover:text-white/60'}`}
                  style={{ backgroundColor: i === sectionIdx ? sec.color : 'transparent' }}>
                  {sec.label}
                </button>
              ))}
              <span className="text-xs text-gray-600 ml-2">{totalFlatIdx} / {totalSlideCount}</span>
            </div>
          )}
          <button onClick={toggleFullscreen} className="px-3 py-1.5 bg-white/5 text-gray-500 hover:bg-white/10 rounded text-xs font-medium transition-colors">
            {isFullscreen ? '通常' : '全画面'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${view === 'map' ? 'opacity-100 scale-100' : 'opacity-0 scale-150 pointer-events-none'}`}>
          <div className="w-full max-w-4xl px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-white mb-2">{deal.dealName}</h1>
              <p className="text-gray-500">{deal.clientName} 御中</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {KISHOUTENKETSU.map((sec, i) => {
                const secSlides = sectionSlides(i);
                return (
                  <button key={sec.key} onClick={() => zoomIntoSection(i)}
                    className="group text-left p-0 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-[0.98]"
                    style={{ boxShadow: `0 0 0 1px ${sec.color}30` }}>
                    <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: sec.color }}>
                      <span className="text-3xl font-semibold text-white/90">{sec.label}</span>
                      <span className="text-sm font-medium text-white/70">{secSlides.length} slides</span>
                    </div>
                    <div className="bg-gray-900 px-4 py-3 space-y-1.5">
                      {sec.subItems.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${sec.color}80` }} />
                          <span className="text-xs text-gray-500 group-hover:text-gray-500 transition-colors">{item}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-gray-600 text-xs mt-6">クリックでズームイン / Enter で開始</p>
          </div>
        </div>

        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${view === 'slide' ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
          <button onClick={prevSlide}
            className="absolute left-4 z-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white text-xl transition-all">
            ‹
          </button>
          <div className="w-full max-w-5xl px-16" style={{ aspectRatio: '16/9' }}>
            <div className="w-full h-full relative rounded-lg overflow-hidden" style={{ boxShadow: `0 0 60px ${KISHOUTENKETSU[sectionIdx]?.color ?? '#000'}20` }}>
              <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ backgroundColor: KISHOUTENKETSU[sectionIdx]?.color }} />
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <span className="text-xs font-semibold text-white/60 px-2 py-0.5 rounded" style={{ backgroundColor: `${KISHOUTENKETSU[sectionIdx]?.color}40` }}>
                  {KISHOUTENKETSU[sectionIdx]?.label}
                </span>
                <span className="text-xs text-white/30">{slideIdx + 1} / {currentSectionSlides.length}</span>
              </div>
              {currentSectionSlides[slideIdx] && (
                <SlideRenderer slide={currentSectionSlides[slideIdx]} deal={deal} isPresent={true} />
              )}
            </div>
          </div>
          <button onClick={nextSlide}
            className="absolute right-4 z-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white text-xl transition-all">
            ›
          </button>
        </div>

        {view === 'slide' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {currentSectionSlides.map((_, i) => (
              <button key={i} onClick={() => setSlideIdx(i)}
                className={`rounded-full transition-all ${i === slideIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
