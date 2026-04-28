'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { bulkLogActions } from '@/lib/actions/log-action';

const ACTION_TYPES = [
  { key: 'call', label: '電話' },
  { key: 'meeting', label: '商談' },
  { key: 'proposal', label: '提案' },
  { key: 'email', label: 'メール' },
  { key: 'visit', label: '訪問' },
  { key: 'other', label: 'その他' },
] as const;

type ActionTypeKey = (typeof ACTION_TYPES)[number]['key'];
type Member = { id: string; name: string };
type GridState = Record<string, Record<ActionTypeKey, number>>;

function emptyRow(): Record<ActionTypeKey, number> {
  return { call: 0, meeting: 0, proposal: 0, email: 0, visit: 0, other: 0 };
}

export function WeeklyInputGrid({
  members,
  defaultOccurredOn,
  presentation = false,
}: {
  members: Member[];
  defaultOccurredOn: string;
  presentation?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [grid, setGrid] = useState<GridState>(() =>
    Object.fromEntries(members.map((m) => [m.id, emptyRow()]))
  );
  const [occurredOn, setOccurredOn] = useState(defaultOccurredOn);
  const [message, setMessage] = useState<string | null>(null);

  const totals = useMemo(() => {
    const perType = emptyRow();
    let perPerson: Record<string, number> = {};
    let grand = 0;
    for (const m of members) {
      const row = grid[m.id] ?? emptyRow();
      let memberSum = 0;
      for (const t of ACTION_TYPES) {
        perType[t.key] += row[t.key];
        memberSum += row[t.key];
      }
      perPerson[m.id] = memberSum;
      grand += memberSum;
    }
    return { perType, perPerson, grand };
  }, [grid, members]);

  function setCell(memberId: string, type: ActionTypeKey, raw: string) {
    const n = Math.max(0, Math.min(999, Number.parseInt(raw, 10) || 0));
    setGrid((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? emptyRow()), [type]: n },
    }));
  }

  function bump(memberId: string, type: ActionTypeKey, delta: number) {
    setGrid((prev) => {
      const row = prev[memberId] ?? emptyRow();
      const next = Math.max(0, Math.min(999, row[type] + delta));
      return { ...prev, [memberId]: { ...row, [type]: next } };
    });
  }

  function clearAll() {
    setGrid(Object.fromEntries(members.map((m) => [m.id, emptyRow()])));
    setMessage(null);
  }

  function handleSubmit() {
    if (totals.grand === 0) {
      setMessage('入力された行動が0件です');
      return;
    }
    const entries = members.flatMap((m) =>
      ACTION_TYPES.map((t) => ({ member_id: m.id, type: t.key, count: grid[m.id]?.[t.key] ?? 0 }))
    ).filter((e) => e.count > 0);

    startTransition(async () => {
      const result = await bulkLogActions({ entries, occurred_on: occurredOn });
      if (result.errors?._form) {
        setMessage(result.errors._form.join(' / '));
        return;
      }
      setMessage(`✓ ${result.inserted ?? 0} 件保存しました`);
      clearAll();
      router.refresh();
    });
  }

  const cellInputClass = presentation
    ? 'w-20 text-2xl font-mono tabular-nums text-center bg-transparent border border-border rounded focus:outline-none focus:border-ink'
    : 'w-14 text-base font-mono tabular-nums text-center bg-transparent border border-border rounded focus:outline-none focus:border-ink';

  const headerCellClass = presentation
    ? 'px-3 py-3 text-base font-medium text-muted text-center'
    : 'px-2 py-2 text-xs uppercase tracking-widest font-medium text-subtle text-center';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 px-6 py-4 bg-card border border-border rounded-lg">
        <div className="flex flex-col gap-1">
          <label className="text-xs uppercase tracking-widest font-medium text-subtle">記録日</label>
          <input
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="px-3 py-2 text-sm bg-bg border border-border rounded focus:outline-none focus:border-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest font-medium text-subtle">合計</span>
          <span className="font-semibold text-3xl text-ink tabular-nums">{totals.grand}</span>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="px-4 py-2 text-sm text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
          >
            クリア
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending || totals.grand === 0}
            className="px-5 py-2 text-sm font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            {pending ? '保存中...' : `${totals.grand} 件まとめて保存`}
          </button>
        </div>
      </div>

      {message && (
        <div className="px-6 py-3 bg-card border border-border rounded text-sm text-ink">{message}</div>
      )}

      <div className="overflow-x-auto bg-card border border-border rounded-lg">
        <table className="w-full">
          <thead className="border-b border-border">
            <tr>
              <th className={`${headerCellClass} text-left pl-6`}>メンバー</th>
              {ACTION_TYPES.map((t) => (
                <th key={t.key} className={headerCellClass}>{t.label}</th>
              ))}
              <th className={`${headerCellClass} pr-6`}>個人合計</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const row = grid[m.id] ?? emptyRow();
              const memberSum = totals.perPerson[m.id] ?? 0;
              return (
                <tr key={m.id} className="border-b border-border last:border-b-0">
                  <td className={`pl-6 py-3 ${presentation ? 'text-lg' : 'text-sm'} font-medium text-ink`}>
                    {m.name}
                  </td>
                  {ACTION_TYPES.map((t) => (
                    <td key={t.key} className="py-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`${m.name} ${t.label} -1`}
                          onClick={() => bump(m.id, t.key, -1)}
                          className="w-6 h-6 text-muted hover:text-ink rounded border border-transparent hover:border-border transition-colors"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={row[t.key]}
                          onChange={(e) => setCell(m.id, t.key, e.target.value)}
                          className={cellInputClass}
                        />
                        <button
                          type="button"
                          aria-label={`${m.name} ${t.label} +1`}
                          onClick={() => bump(m.id, t.key, 1)}
                          className="w-6 h-6 text-muted hover:text-ink rounded border border-transparent hover:border-border transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  ))}
                  <td className={`pr-6 py-3 text-center font-mono tabular-nums ${presentation ? 'text-2xl font-semibold' : 'text-base'} text-ink`}>
                    {memberSum}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border bg-bg">
            <tr>
              <td className={`pl-6 py-3 ${presentation ? 'text-base' : 'text-xs'} uppercase tracking-widest font-medium text-subtle`}>
                種類別合計
              </td>
              {ACTION_TYPES.map((t) => (
                <td key={t.key} className={`py-3 text-center font-mono tabular-nums ${presentation ? 'text-2xl font-semibold' : 'text-base'} text-ink`}>
                  {totals.perType[t.key]}
                </td>
              ))}
              <td className={`pr-6 py-3 text-center font-mono tabular-nums ${presentation ? 'text-3xl font-semibold' : 'text-lg'} text-ink`}>
                {totals.grand}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
