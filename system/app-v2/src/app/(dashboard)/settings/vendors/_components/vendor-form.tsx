'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createVendor, updateVendor, type VendorFormState } from '@/lib/actions/vendors';
import { FormField, TextInput, Button, FormActions } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const initialState: VendorFormState = {};

type Initial = {
  id?: string;
  name?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  rating?: number | null;
  skills?: string[];
};

export function VendorForm({
  initial,
  onSuccess,
}: {
  initial?: Initial;
  onSuccess?: () => void;
}) {
  const action = initial?.id
    ? updateVendor.bind(null, initial.id)
    : createVendor;
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success(initial?.id ? '更新しました' : '登録しました');
      if (!initial?.id) formRef.current?.reset();
      onSuccess?.();
    }
  }, [state.success, initial?.id, onSuccess]);

  const skillsValue = (initial?.skills ?? []).join(', ');

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <FormField label="会社名" required error={state.errors?.name?.[0]}>
        <TextInput name="name" defaultValue={initial?.name ?? ''} placeholder="" />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="メール" error={state.errors?.contact_email?.[0]}>
          <TextInput
            type="email"
            name="contact_email"
            defaultValue={initial?.contact_email ?? ''}
            placeholder=""
          />
        </FormField>
        <FormField label="電話">
          <TextInput
            type="tel"
            name="contact_phone"
            defaultValue={initial?.contact_phone ?? ''}
            placeholder=""
          />
        </FormField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="評価（1-5）">
          <TextInput
            type="number"
            name="rating"
            defaultValue={initial?.rating ?? ''}
            min="1"
            max="5"
            step="1"
          />
        </FormField>
        <FormField label="スキル（カンマ区切り）" hint="例: React, Figma, ライティング">
          <TextInput name="skills" defaultValue={skillsValue} placeholder="" />
        </FormField>
      </div>

      {state.errors?._form && (
        <p className="text-xs text-kpi-down">{state.errors._form.join(' / ')}</p>
      )}

      <FormActions>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '保存中…' : initial?.id ? '更新' : '登録'}
        </Button>
      </FormActions>
    </form>
  );
}
