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
      <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900 list-none">
        <span className="inline-block group-open:hidden">▶ スライド {slides.length} 枚を展開</span>
        <span className="hidden group-open:inline-block">▼ スライドを折りたたむ</span>
      </summary>
      <ol className="mt-3 space-y-3">
        {slides.map((s, idx) => (
          <li
            key={s.id ?? idx}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm text-gray-900 font-medium">
                <span className="text-gray-500 font-mono mr-2">{String(idx + 1).padStart(2, '0')}</span>
                {s.title}
              </p>
              <span className="text-xs text-gray-500 uppercase tracking-widest">
                {TYPE_LABEL[s.type] ?? s.type}
              </span>
            </div>
            {s.subtitle && <p className="text-sm text-gray-700">{s.subtitle}</p>}
            {s.items && s.items.length > 0 && (
              <ul className="space-y-1">
                {s.items.map((it, i) => (
                  <li key={i} className="text-sm text-gray-900 before:content-['・'] before:text-gray-500">
                    {it}
                  </li>
                ))}
              </ul>
            )}
            {s.bullets && s.bullets.length > 0 && (
              <ul className="space-y-1">
                {s.bullets.map((b, i) => (
                  <li key={i} className="text-sm text-gray-900 before:content-['・'] before:text-gray-500">
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {s.message && (
              <p className="text-sm text-gray-900 border-l-2 border-amber-300 pl-3">
                {s.message}
              </p>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}
