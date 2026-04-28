'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, Check } from 'lucide-react';
import { evaluateBudgetAlerts } from '@/lib/actions/budget-alerts';

export function BudgetAlertButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [messageType, setMessageType] = useState<'error' | 'success' | 'info' | null>(null);

  function handleClick() {
    setMessage(null);
    setMessageType(null);
    startTransition(async () => {
      const result = await evaluateBudgetAlerts();
      if (result.errors && result.errors.length > 0) {
        setMessage(result.errors.join(' / '));
        setMessageType('error');
        return;
      }
      if (result.generated > 0) {
        setMessage(`${result.generated} 件のアラートを生成しました`);
        setMessageType('success');
      } else if (result.skipped > 0) {
        setMessage('既にアラートが生成済 or 評価対象外');
        setMessageType('info');
      } else {
        setMessage('—');
        setMessageType('info');
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
        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 disabled:opacity-40 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {pending ? '評価中...' : 'アラート再評価'}
      </button>
      {message && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
          {messageType === 'error' && <AlertTriangle className="w-3 h-3 text-red-700" />}
          {messageType === 'success' && <Check className="w-3 h-3 text-emerald-700" />}
          {message}
        </span>
      )}
    </div>
  );
}
