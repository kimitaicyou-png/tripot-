import type { ReactNode } from 'react';

export function SectionHeading({
  eyebrow,
  title,
  count,
  action,
}: {
  eyebrow?: string;
  title: string;
  count?: number;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4 gap-3">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">{eyebrow}</p>
        )}
        <h3 className="text-base font-semibold text-gray-900">
          {title}
          {typeof count === 'number' && (
            <span className="text-xs text-gray-500 font-normal ml-2 font-mono tabular-nums">
              {count}
            </span>
          )}
        </h3>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
