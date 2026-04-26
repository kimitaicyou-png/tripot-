'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { createCustomer, type CustomerFormState } from '@/lib/actions/customers';

export default function CustomerNewPage() {
  const [state, formAction, isPending] = useActionState<CustomerFormState, FormData>(createCustomer, {});

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/customers" className="text-muted hover:text-ink text-sm">← 顧客一覧</Link>
        <h1 className="text-lg font-semibold text-ink">新規顧客</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
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
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：株式会社A社"
            />
            {state.errors?.name && <p className="mt-1 text-xs text-red-600">{state.errors.name.join(', ')}</p>}
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-ink mb-1.5">連絡先メール</label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state.errors?.contact_email && <p className="mt-1 text-xs text-red-600">{state.errors.contact_email.join(', ')}</p>}
          </div>

          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-ink mb-1.5">電話番号</label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              className="w-full px-3 py-2 border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/customers" className="px-4 py-2 text-muted hover:text-ink text-sm font-medium">キャンセル</Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? '登録中…' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
