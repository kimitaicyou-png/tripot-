'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateBugStatus } from '@/lib/actions/bugs';

const SEVERITY_TONE: Record<string, string> = {
  low: 'text-muted',
  medium: 'text-amber-700',
  high: 'text-orange-700',
  critical: 'text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  open: '未対応',
  in_progress: '対応中',
  resolved: '解決済',
  closed: 'クローズ',
};

const STATUS_FLOW: Record<string, string[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed', 'open'],
  closed: ['open'],
};

type Props = {
  id: string;
  cardId: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  reporter_name: string | null;
  created_at: Date | string;
  resolved_at: Date | string | null;
};

export function BugRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleStatus(status: string) {
    startTransition(async () => {
      const result = await updateBugStatus(props.id, props.cardId, status as 'open' | 'in_progress' | 'resolved' | 'closed');
      if (!result.success) {
        alert(result.error ?? '更新失敗');
        return;
      }
      router.refresh();
    });
  }

  const next = STATUS_FLOW[props.status] ?? [];
  const isResolvedish = props.status === 'resolved' || props.status === 'closed';

  return (
    <li className={`bg-card border border-border rounded-lg p-4 space-y-2 ${isResolvedish ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-base font-medium text-ink">{props.title}</p>
            <span className={`text-xs uppercase tracking-widest font-medium ${SEVERITY_TONE[props.severity]}`}>
              {props.severity}
            </span>
            <span className="text-xs text-subtle">{STATUS_LABEL[props.status] ?? props.status}</span>
          </div>
          {props.description && (
            <p className="text-sm text-muted whitespace-pre-wrap mt-1">{props.description}</p>
          )}
          <p className="text-xs text-subtle font-mono tabular-nums mt-1">
            報告者 {props.reporter_name ?? '不明'} · {new Date(props.created_at).toLocaleString('ja-JP')}
            {props.resolved_at && ` · 解決 ${new Date(props.resolved_at).toLocaleString('ja-JP')}`}
          </p>
        </div>
      </div>
      {next.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {next.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatus(s)}
              disabled={pending}
              className="px-2 py-0.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors disabled:opacity-40"
            >
              → {STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}
