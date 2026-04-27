'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { evaluateBudgetAlerts } from '@/lib/actions/budget-alerts';

export function BudgetAlertButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await evaluateBudgetAlerts();
      if (result.errors && result.errors.length > 0) {
        setMessage(`⚠ ${result.errors.join(' / ')}`);
        return;
      }
      if (result.generated > 0) {
        setMessage(`✓ ${result.generated} 件のアラートを生成しました`);
      } else if (result.skipped > 0) {
        setMessage('既にアラートが生成済 or 評価対象外');
      } else {
        setMessage('—');
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink disabled:opacity-40 transition-colors"
      >
        {pending ? '評価中...' : '🔔 アラート再評価'}
      </button>
      {message && <span className="text-xs text-subtle">{message}</span>}
    </div>
  );
}
