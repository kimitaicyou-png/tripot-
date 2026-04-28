'use client';

import { useActionState, useEffect, useRef } from 'react';
import { createCommitment, type CommitmentFormState } from '@/lib/actions/commitments';
import { FormField, TextInput, Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const initialState: CommitmentFormState = {};

export function CommitmentForm({ memberId: _memberId }: { memberId: string }) {
  const [state, formAction, pending] = useActionState(createCommitment, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      toast.success('記録しました');
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-12 gap-2 items-start"
    >
      <input
        name="text"
        placeholder="例: 来週水曜までに A 社に提案書送る"
        className="col-span-7 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
      />
      <input
        type="date"
        name="due_date"
        className="col-span-3 px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20"
      />
      <Button type="submit" variant="primary" size="md" className="col-span-2" disabled={pending}>
        {pending ? '…' : '+ 記録'}
      </Button>
      {state.errors?.text && (
        <p className="col-span-12 text-xs text-red-700">{state.errors.text.join(' / ')}</p>
      )}
    </form>
  );
}
