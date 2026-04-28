'use client';

import { useActionState, useState } from 'react';
import { upsertAttackPlan, type AttackPlanFormState } from '@/lib/actions/attack-plans';
import { FormField, TextInput, TextArea, Button, FormActions } from '@/components/ui/form';

type Initial = {
  key_person: string;
  competitor: string;
  budget_estimate: number | null;
  plan: string;
  next_action: string;
};

const initialState: AttackPlanFormState = {};

export function AttackForm({ dealId, initial }: { dealId: string; initial: Initial }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(upsertAttackPlan, initialState);

  if (!open) {
    const isEmpty =
      !initial.key_person && !initial.competitor && !initial.budget_estimate && !initial.plan && !initial.next_action;
    return (
      <Button type="button" variant={isEmpty ? 'primary' : 'secondary'} size="sm" onClick={() => setOpen(true)}>
        {isEmpty ? '+ 攻略カードを作成' : '↻ 攻略カードを編集'}
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 border-t border-gray-200 pt-4">
      <input type="hidden" name="deal_id" value={dealId} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="キーパーソン" hint="例: 山田部長 / 経営層 / 現場担当者">
          <TextInput name="key_person" defaultValue={initial.key_person} placeholder="" />
        </FormField>
        <FormField label="競合" hint="例: A社 / 既存システム / 内製">
          <TextInput name="competitor" defaultValue={initial.competitor} placeholder="" />
        </FormField>
      </div>

      <FormField label="予算想定（円）">
        <TextInput
          type="number"
          name="budget_estimate"
          defaultValue={initial.budget_estimate ?? ''}
          placeholder=""
          min="0"
          step="10000"
        />
      </FormField>

      <FormField label="攻略プラン" hint="勝ちパターン・差別化ポイント・想定リスクを箇条書きで">
        <TextArea name="plan" rows={4} defaultValue={initial.plan} placeholder="" />
      </FormField>

      <FormField label="次のアクション" hint="今週やる具体的な1-3手">
        <TextArea name="next_action" rows={2} defaultValue={initial.next_action} placeholder="" />
      </FormField>

      {state.errors?._form && (
        <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
      )}
      {state.success && <p className="text-xs text-emerald-700">保存しました</p>}

      <FormActions>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          閉じる
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '保存中…' : '保存'}
        </Button>
      </FormActions>
    </form>
  );
}
