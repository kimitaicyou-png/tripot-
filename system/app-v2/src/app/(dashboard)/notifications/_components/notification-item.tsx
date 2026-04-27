'use client';

import { useTransition } from 'react';
import { markAsRead } from '@/lib/actions/notifications';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';

export function NotificationItem({
  id,
  title,
  body,
  ruleLabel,
  channelLabel,
  channelTone,
  createdAt,
  isRead,
}: {
  id: string;
  title: string;
  body: string | null;
  ruleLabel: string;
  channelLabel: string;
  channelTone: 'info' | 'accent' | 'up' | 'neutral';
  createdAt: string;
  isRead: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (isRead || pending) return;
    startTransition(async () => {
      try {
        await markAsRead(id);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('既読化失敗', { description: msg });
      }
    });
  }

  return (
    <li
      onClick={handleClick}
      className={`bg-card border rounded-xl p-4 transition-colors ${
        isRead
          ? 'border-border opacity-70'
          : 'border-l-2 border-l-amber-300 cursor-pointer hover:border-ink'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isRead ? 'text-muted' : 'text-ink font-medium'}`}>{title}</p>
          {body && <p className="text-xs text-muted mt-1 whitespace-pre-wrap">{body}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-subtle">{ruleLabel}</span>
            <span className="text-xs font-mono text-subtle">{createdAt}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={channelTone}>{channelLabel}</Badge>
          {!isRead && <span className="w-2 h-2 rounded-full bg-amber-500" aria-label="未読" />}
        </div>
      </div>
    </li>
  );
}
