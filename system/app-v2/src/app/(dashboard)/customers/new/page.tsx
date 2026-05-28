'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createCustomer, type CustomerFormState } from '@/lib/actions/customers';

export default function CustomerNewPage() {
  const [state, formAction, isPending] = useActionState<CustomerFormState, FormData>(createCustomer, {});

  const nameError = state.errors?.name;
  const emailError = state.errors?.contact_email;
  const formError = state.errors?._form;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/customers" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm active:scale-[0.98]">
          <ArrowLeft className="w-3.5 h-3.5" />顧客一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">新規顧客</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <form
          action={formAction}
          noValidate
          className="bg-white border border-gray-200 rounded-xl p-6 space-y-5"
        >
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1.5">
              顧客名 <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="organization"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${nameError ? 'border-red-400' : 'border-gray-200'}`}
              placeholder="例：株式会社A社"
            />
            {nameError && (
              <p className="mt-1 text-xs text-red-600">{nameError.join(', ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_email" className="block text-sm font-medium text-gray-900 mb-1.5">
              連絡先メール
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              autoComplete="email"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${emailError ? 'border-red-400' : 'border-gray-200'}`}
            />
            {emailError && (
              <p className="mt-1 text-xs text-red-600">{emailError.join(', ')}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_phone" className="block text-sm font-medium text-gray-900 mb-1.5">
              電話番号
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              type="tel"
              autoComplete="tel"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600">{formError.join(', ')}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link href="/customers" className="px-4 py-2 text-gray-700 hover:text-gray-900 text-sm font-medium active:scale-[0.98]">
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? '登録中…' : '登録する'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
