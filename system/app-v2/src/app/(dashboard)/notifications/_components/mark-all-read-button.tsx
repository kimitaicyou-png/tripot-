'use client';

import { useTransition } from 'react';
import { markAllAsRead } from '@/lib/actions/notifications';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        await markAllAsRead();
        toast.success('全て既読にしました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('一括既読失敗', { description: msg });
      }
    });
  }

  return (
    <Button type="button" variant="secondary" size="sm" onClick={handleClick} disabled={pending}>
      {pending ? '更新中…' : '全て既読'}
    </Button>
  );
}
