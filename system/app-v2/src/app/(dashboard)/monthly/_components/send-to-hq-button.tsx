'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { sendMonthlyReportToHq } from '@/lib/actions/monthly-report';

export function SendToHqButton({ yearMonth }: { yearMonth: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function handleClick() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 5000);
      return;
    }
    setConfirming(false);
    setMessage(null);
    startTransition(async () => {
      const result = await sendMonthlyReportToHq(yearMonth);
      setMessage(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`px-4 py-2 text-sm border rounded transition-colors disabled:opacity-40 ${
          confirming
            ? 'text-amber-700 border-amber-700 hover:bg-amber-50'
            : 'text-muted border-border hover:text-ink hover:border-ink'
        }`}
      >
        {pending ? '送信中...' : confirming ? '本当に送信' : '📤 本部に送信'}
      </button>
      {message && <span className="text-xs text-subtle max-w-md truncate">{message}</span>}
    </div>
  );
}
