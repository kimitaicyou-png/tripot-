'use client';

import { useState, useActionState, useTransition } from 'react';
import { upsertBudget, type BudgetFormState } from '@/lib/actions/budgets';

type Row = {
  month: number;
  target_revenue: number;
  target_gross_profit: number;
  target_operating_profit: number;
};

export function BudgetEditor({
  year,
  rows,
}: {
  year: number;
  rows: Row[];
}) {
  const [openMonth, setOpenMonth] = useState<number | null>(null);
  const target = rows.find((r) => r.month === openMonth);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setOpenMonth(m)}
            className="px-3 py-1.5 bg-card border border-border text-xs font-medium text-ink rounded-lg hover:bg-slate-50 transition-colors"
          >
            {m}月を編集
          </button>
        ))}
      </div>

      {openMonth !== null && (
        <BudgetMonthDialog
          year={year}
          month={openMonth}
          initial={
            target ?? {
              month: openMonth,
              target_revenue: 0,
              target_gross_profit: 0,
              target_operating_profit: 0,
            }
          }
          onClose={() => setOpenMonth(null)}
        />
      )}
    </>
  );
}

function BudgetMonthDialog({
  year,
  month,
  initial,
  onClose,
}: {
  year: number;
  month: number;
  initial: Row;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState<BudgetFormState, FormData>(upsertBudget, {});
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await formAction(formData);
      onClose();
    });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed left-0 right-0 bottom-0 md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md z-50">
        <div className="bg-card rounded-t-xl md:rounded-xl border border-border p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-ink">
              {year}年 {month}月の目標
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-ink text-2xl leading-none"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>

          <form action={handleSubmit} className="space-y-4">
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />

            <NumberField
              label="売上目標（円）"
              name="target_revenue"
              defaultValue={initial.target_revenue}
            />
            <NumberField
              label="粗利目標（円）"
              name="target_gross_profit"
              defaultValue={initial.target_gross_profit}
            />
            <NumberField
              label="営業利益目標（円）"
              name="target_operating_profit"
              defaultValue={initial.target_operating_profit}
            />

            {state.errors?._form && (
              <p className="text-xs text-red-600">{state.errors._form.join(', ')}</p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-ink text-white font-medium rounded-lg hover:bg-ink-mid active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {pending ? '保存中…' : '保存する'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function NumberField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-ink mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="number"
        min={0}
        step={10000}
        defaultValue={defaultValue}
        className="w-full px-3 py-2 border border-border rounded-lg font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
