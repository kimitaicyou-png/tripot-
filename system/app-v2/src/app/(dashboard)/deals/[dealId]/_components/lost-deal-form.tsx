'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { recordLostDeal, type LostDealFormState } from '@/lib/actions/lost-deals';
import { FormField, TextInput, TextArea, Select, Button, FormActions } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const REASON_OPTIONS = [
  { value: '価格', label: '💴 価格が合わない' },
  { value: '機能', label: '⚙️ 機能不足' },
  { value: 'タイミング', label: '⏰ タイミング不一致' },
  { value: '決裁', label: '🗳 決裁通らず' },
  { value: '競合', label: '⚔️ 競合に取られた' },
  { value: '内製化', label: '🏠 内製化' },
  { value: '保留', label: '⏸ 保留・見送り' },
  { value: 'その他', label: '📝 その他' },
];

const initialState: LostDealFormState = {};

export function LostDealForm({
  dealId,
  initial,
}: {
  dealId: string;
  initial: { reason: string; competitor: string | null; detail: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(initial === null);
  const [state, formAction, pending] = useActionState(recordLostDeal, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success(initial ? '失注理由を更新しました' : '失注として記録しました');
      setOpen(false);
      router.refresh();
    }
  }, [state.success, initial, router]);

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        ↻ 編集
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-red-200 pt-4">
      <input type="hidden" name="deal_id" value={dealId} />

      <FormField label="失注理由" required>
        <Select
          name="reason"
          defaultValue={initial?.reason ?? '価格'}
          options={REASON_OPTIONS}
        />
      </FormField>

      <FormField label="競合（任意）" hint="例: A社 / 既存システム / 内製">
        <TextInput name="competitor" defaultValue={initial?.competitor ?? ''} placeholder="" />
      </FormField>

      <FormField label="詳細（任意）" hint="次に活かす学びを残す">
        <TextArea
          name="detail"
          rows={3}
          defaultValue={initial?.detail ?? ''}
          placeholder=""
        />
      </FormField>

      {state.errors?._form && (
        <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
      )}

      <FormActions>
        {initial && (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            閉じる
          </Button>
        )}
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? '保存中…' : initial ? '更新' : '失注として記録'}
        </Button>
      </FormActions>
    </form>
  );
}
