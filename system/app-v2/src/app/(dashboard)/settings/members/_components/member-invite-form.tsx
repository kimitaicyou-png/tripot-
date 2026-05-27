'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createMember, type MemberFormState } from '@/lib/actions/members';
import { FormField, TextInput, Select, Button, FormActions } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const initialState: MemberFormState = {};

const ROLE_OPTIONS = [
  { value: 'member', label: 'メンバー（営業 / 制作）' },
  { value: 'hq_member', label: '本部メンバー（hq_member）' },
  { value: 'president', label: '社長（president、全権）' },
];

export function MemberInviteForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createMember, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success('メンバーを登録しました', {
        description: '本人が Google でログインすると利用開始',
      });
      formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, onSuccess]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <FormField label="氏名" required error={state.errors?.name?.[0]}>
        <TextInput name="name" placeholder="例：石田 ぴっぱ" />
      </FormField>

      <FormField
        label="Gmail アドレス"
        required
        hint="この Google アカウントでログインできるようになります"
        error={state.errors?.email?.[0]}
      >
        <TextInput
          type="email"
          name="email"
          placeholder="例：ishida.pippa@gmail.com"
          autoComplete="off"
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="役割" required error={state.errors?.role?.[0]}>
          <Select name="role" defaultValue="member" options={ROLE_OPTIONS} />
        </FormField>
        <FormField label="部署（任意）">
          <TextInput name="department" placeholder="例：営業" />
        </FormField>
      </div>

      {state.errors?._form && (
        <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <FormActions>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '登録中…' : '登録する'}
        </Button>
      </FormActions>

      <p className="text-[11px] text-gray-500 leading-relaxed pt-1 border-t border-gray-100">
        ※ 招待後、本人に「<span className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}</span>」を共有してください。
        本人が <strong>同じメールの Google アカウント</strong>でログインすると利用開始できます。
      </p>
    </form>
  );
}
