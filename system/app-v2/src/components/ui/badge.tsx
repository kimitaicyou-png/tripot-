type BadgeTone = 'default' | 'up' | 'down' | 'accent' | 'info' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  default: 'bg-slate-100 text-ink',
  neutral: 'bg-slate-100 text-muted',
  up: 'bg-green-50 text-green-700 border border-green-200',
  down: 'bg-red-50 text-red-700 border border-red-200',
  accent: 'bg-amber-50 text-amber-700 border border-amber-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-medium ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
