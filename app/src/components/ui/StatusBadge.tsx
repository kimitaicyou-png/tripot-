type Status = 'good' | 'warning' | 'danger' | 'neutral' | 'info';

const STYLES: Record<Status, string> = {
  good: 'text-blue-600 border-blue-200 bg-blue-50',
  warning: 'text-gray-900 border-gray-300 bg-gray-50',
  danger: 'text-red-600 border-red-200 bg-red-50',
  neutral: 'text-gray-500 border-gray-200 bg-gray-50',
  info: 'text-blue-600 border-blue-200 bg-blue-50',
};

export function StatusBadge({ label, status }: { label: string; status: Status }) {
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STYLES[status]}`}>{label}</span>;
}
