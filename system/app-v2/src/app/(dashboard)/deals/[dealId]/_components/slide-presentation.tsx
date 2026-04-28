'use client';

import { useState, useEffect, useCallback } from 'react';

type Slide = {
  id?: string;
  type: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  items?: string[];
  message?: string;
};

const TYPE_LABEL: Record<string, string> = {
  title: 'タイトル',
  agenda: 'アジェンダ',
  content: '内容',
  comparison: '比較',
  closing: 'クロージング',
};

export function SlidePresentation({
  slides,
  proposalTitle,
  triggerLabel = 'プレゼンモード',
}: {
  slides: Slide[];
  proposalTitle: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const total = slides.length;
  const close = useCallback(() => {
    setOpen(false);
    setIndex(0);
  }, []);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIndex((i) => Math.min(total - 1, i + 1)), [total]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        next();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close, prev, next]);

  useEffect(() => {
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [open]);

  if (total === 0) return null;
  const slide = slides[index]!;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 transition-opacity"
      >
        ▶ {triggerLabel}（{total}枚）
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-bg flex flex-col print:bg-white">
          <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card print:hidden">
            <div className="flex items-baseline gap-3 min-w-0">
              <p className="text-xs uppercase tracking-widest text-subtle">{proposalTitle}</p>
              <p className="text-xs font-mono text-muted">
                {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
                aria-label="印刷"
              >
                印刷
              </button>
              <button
                type="button"
                onClick={close}
                className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
                aria-label="閉じる"
              >
                閉じる (ESC)
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto flex items-center justify-center p-12 print:p-8">
            <article className="w-full max-w-5xl space-y-8">
              <SlideContent slide={slide} />
            </article>
          </main>

          <footer className="flex items-center justify-between px-6 py-3 border-t border-border bg-card print:hidden">
            <button
              type="button"
              onClick={prev}
              disabled={index === 0}
              className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              ← 前
            </button>
            <ProgressBar current={index + 1} total={total} />
            <button
              type="button"
              onClick={next}
              disabled={index === total - 1}
              className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              次 →
            </button>
          </footer>
        </div>
      )}
    </>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex-1 mx-6 max-w-md">
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-ink transition-all duration-200"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  const typeLabel = TYPE_LABEL[slide.type] ?? slide.type;

  if (slide.type === 'title') {
    return (
      <div className="text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-subtle">{typeLabel}</p>
        <h1 className="font-semibold text-5xl md:text-7xl text-ink tracking-tight leading-tight">
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className="text-lg md:text-2xl text-muted">{slide.subtitle}</p>
        )}
      </div>
    );
  }

  if (slide.type === 'closing') {
    return (
      <div className="text-center space-y-6">
        <p className="text-xs uppercase tracking-widest text-subtle">{typeLabel}</p>
        <h2 className="font-semibold text-4xl md:text-6xl text-ink tracking-tight leading-tight">
          {slide.title}
        </h2>
        {slide.message && (
          <p className="font-semibold text-2xl md:text-3xl text-ink-mid leading-relaxed">
            {slide.message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-subtle">{typeLabel}</p>
        <h2 className="font-semibold text-4xl md:text-5xl text-ink tracking-tight">
          {slide.title}
        </h2>
        {slide.subtitle && (
          <p className="text-lg text-muted">{slide.subtitle}</p>
        )}
      </div>

      {slide.bullets && slide.bullets.length > 0 && (
        <ul className="space-y-3">
          {slide.bullets.map((b, i) => (
            <li key={i} className="flex gap-4 text-xl md:text-2xl text-ink leading-relaxed">
              <span className="text-subtle font-mono text-base mt-1">{String(i + 1).padStart(2, '0')}</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.items && slide.items.length > 0 && (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {slide.items.map((it, i) => (
            <li
              key={i}
              className="bg-card border border-border rounded-lg p-5 text-lg text-ink"
            >
              {it}
            </li>
          ))}
        </ul>
      )}

      {slide.message && (
        <p className="font-semibold text-2xl text-ink-mid leading-relaxed border-l-2 border-ink pl-6">
          {slide.message}
        </p>
      )}
    </div>
  );
}
