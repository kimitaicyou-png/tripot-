'use client';

import { useState, useActionState, useTransition } from 'react';
import { logActionEntry, type ActionFormState } from '@/lib/actions/log-action';

const ACTION_TYPES = [
  { value: 'call', label: '電話', icon: '📞' },
  { value: 'meeting', label: '商談', icon: '🤝' },
  { value: 'proposal', label: '提案', icon: '📄' },
  { value: 'email', label: 'メール', icon: '✉️' },
  { value: 'visit', label: '訪問', icon: '🚶' },
  { value: 'other', label: 'その他', icon: '📝' },
] as const;

type Variant = 'fixed' | 'inline';

export function LogActionButton({
  dealId,
  variant = 'fixed',
  label,
}: {
  dealId?: string;
  variant?: Variant;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [, formAction] = useActionState<ActionFormState, FormData>(logActionEntry, {});
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await formAction(formData);
      setOpen(false);
    });
  }

  const triggerClass =
    variant === 'fixed'
      ? 'fixed bottom-20 md:bottom-6 right-6 z-40 px-6 py-4 bg-gray-900 text-white font-medium rounded-xl shadow-sm hover:bg-gray-700 active:scale-[0.98] transition-all'
      : 'px-3 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98] transition-all';

  const triggerLabel = label ?? (variant === 'inline' ? '＋ この案件で記録' : '行動を記録');

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClass}>
        {triggerLabel}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => setOpen(false)} />
          <div className="fixed left-0 right-0 bottom-0 md:left-1/2 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:max-w-md z-50">
            <div className="bg-white rounded-t-xl md:rounded-xl border border-gray-200 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900">
                  {dealId ? 'この案件で行動を記録' : '行動を記録'}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-gray-700 hover:text-gray-900 text-2xl leading-none"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>

              <form action={handleSubmit} className="space-y-4">
                {dealId && <input type="hidden" name="deal_id" value={dealId} />}

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">種類</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ACTION_TYPES.map((t, i) => (
                      <label
                        key={t.value}
                        className="flex flex-col items-center gap-1 px-3 py-3 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-700 transition-colors has-[:checked]:bg-gray-900 has-[:checked]:text-white has-[:checked]:border-gray-900"
                      >
                        <input
                          type="radio"
                          name="type"
                          value={t.value}
                          defaultChecked={i === 0}
                          className="sr-only"
                        />
                        <span className="text-2xl">{t.icon}</span>
                        <span className="text-xs font-medium">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="note" className="block text-sm font-medium text-gray-900 mb-1.5">
                    メモ（任意）
                  </label>
                  <textarea
                    id="note"
                    name="note"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="どんな話をしたか、次に何をするか…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-700 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {pending ? '記録中…' : '記録する'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
