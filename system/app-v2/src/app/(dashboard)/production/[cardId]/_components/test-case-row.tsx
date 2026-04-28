'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recordTestRun } from '@/lib/actions/test-cases';

type Props = {
  id: string;
  cardId: string;
  title: string;
  expected: string | null;
  result: string | null;
  passed: number | null;
  last_run_at: Date | string | null;
};

export function TestCaseRow(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRecord(passed: boolean) {
    startTransition(async () => {
      await recordTestRun(props.id, props.cardId, passed);
      router.refresh();
    });
  }

  const status = props.last_run_at == null ? null : props.passed === 1 ? 'pass' : 'fail';

  return (
    <li className="flex items-start gap-3 px-4 py-3 bg-white border border-gray-200 rounded">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <p className="text-sm text-gray-900">{props.title}</p>
          {status === 'pass' && (
            <span className="text-xs text-emerald-700 font-medium">✓ PASS</span>
          )}
          {status === 'fail' && (
            <span className="text-xs text-red-700 font-medium">✗ FAIL</span>
          )}
          {status === null && (
            <span className="text-xs text-gray-500">未実行</span>
          )}
        </div>
        {props.expected && (
          <p className="text-xs text-gray-500 mt-0.5">期待：{props.expected}</p>
        )}
        {props.last_run_at && (
          <p className="text-xs font-mono tabular-nums text-gray-500 mt-0.5">
            最終実行 {new Date(props.last_run_at).toLocaleString('ja-JP')}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleRecord(true)}
          disabled={pending}
          className="px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-50 disabled:opacity-40 transition-colors"
        >
          PASS
        </button>
        <button
          type="button"
          onClick={() => handleRecord(false)}
          disabled={pending}
          className="px-2 py-0.5 text-xs text-red-700 border border-red-200 rounded hover:bg-red-50 disabled:opacity-40 transition-colors"
        >
          FAIL
        </button>
      </div>
    </li>
  );
}
