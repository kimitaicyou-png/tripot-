type Slide = {
  id: string;
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

export function SlideRendererInline({ slides }: { slides: Slide[] }) {
  return (
    <details className="group">
      <summary className="text-xs text-muted cursor-pointer hover:text-ink list-none">
        <span className="inline-block group-open:hidden">▶ スライド {slides.length} 枚を展開</span>
        <span className="hidden group-open:inline-block">▼ スライドを折りたたむ</span>
      </summary>
      <ol className="mt-3 space-y-3">
        {slides.map((s, idx) => (
          <li
            key={s.id ?? idx}
            className="bg-surface border border-border rounded-lg p-4 space-y-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-ink font-medium">
                <span className="text-subtle font-mono mr-2">{String(idx + 1).padStart(2, '0')}</span>
                {s.title}
              </p>
              <span className="text-xs text-subtle uppercase tracking-widest">
                {TYPE_LABEL[s.type] ?? s.type}
              </span>
            </div>
            {s.subtitle && <p className="text-sm text-muted">{s.subtitle}</p>}
            {s.items && s.items.length > 0 && (
              <ul className="space-y-1">
                {s.items.map((it, i) => (
                  <li key={i} className="text-sm text-ink before:content-['・'] before:text-subtle">
                    {it}
                  </li>
                ))}
              </ul>
            )}
            {s.bullets && s.bullets.length > 0 && (
              <ul className="space-y-1">
                {s.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-ink before:content-['・'] before:text-subtle">
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {s.message && (
              <p className="text-sm text-ink italic border-l-2 border-amber-300 pl-3">
                {s.message}
              </p>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
