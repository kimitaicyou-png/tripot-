'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
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
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm border rounded transition-colors disabled:opacity-40 ${
          confirming
            ? 'text-amber-700 border-amber-700 hover:bg-amber-50'
            : 'text-gray-700 border-gray-200 hover:text-gray-900 hover:border-gray-900'
        }`}
      >
        {!pending && !confirming && <Upload className="w-4 h-4" />}
        {pending ? '送信中...' : confirming ? '本当に送信' : '本部に送信'}
      </button>
      {message && <span className="text-xs text-gray-500 max-w-md truncate">{message}</span>}
    </div>
  );
}
