'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { updateCustomer, type CustomerFormState } from '@/lib/actions/customers';

export function CustomerEditForm({
  customerId,
  initial,
}: {
  customerId: string;
  initial: { name: string; contact_email: string | null; contact_phone: string | null };
}) {
  const action = updateCustomer.bind(null, customerId);
  const [state, formAction, isPending] = useActionState<CustomerFormState, FormData>(action, {});

  return (
    <form action={formAction} className="bg-card border border-border rounded-xl p-6 space-y-5">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-ink mb-1.5">
          顧客名 <span className="text-red-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial.name}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.name && <p className="mt-1 text-xs text-red-600">{state.errors.name.join(', ')}</p>}
      </div>

      <div>
        <label htmlFor="contact_email" className="block text-sm font-medium text-ink mb-1.5">
          連絡先メール
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={initial.contact_email ?? ''}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {state.errors?.contact_email && (
          <p className="mt-1 text-xs text-red-600">{state.errors.contact_email.join(', ')}</p>
        )}
      </div>

      <div>
        <label htmlFor="contact_phone" className="block text-sm font-medium text-ink mb-1.5">
          電話番号
        </label>
        <input
          id="contact_phone"
          name="contact_phone"
          type="tel"
          defaultValue={initial.contact_phone ?? ''}
          className="w-full px-3 py-2 border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {state.success && <p className="text-xs text-emerald-700">保存しました</p>}
      {state.errors?._form && <p className="text-xs text-red-600">{state.errors._form.join(', ')}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={`/customers/${customerId}`}
          className="px-4 py-2 text-muted hover:text-ink text-sm font-medium"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98] disabled:opacity-50"
        >
          {isPending ? '保存中…' : '保存する'}
        </button>
      </div>
    </form>
  );
}
