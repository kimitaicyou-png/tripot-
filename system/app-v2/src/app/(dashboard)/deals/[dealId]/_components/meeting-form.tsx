'use client';

import { useActionState } from 'react';
import { useRef, useEffect } from 'react';
import { createMeeting, type MeetingFormState } from '@/lib/actions/meetings';
import { FormField, TextInput, TextArea, Select, Button, FormActions } from '@/components/ui/form';

const TYPE_OPTIONS = [
  { value: 'meeting', label: '🤝 商談' },
  { value: 'call', label: '📞 電話' },
  { value: 'gmeet', label: '🎥 オンラインMTG' },
  { value: 'visit', label: '🚶 訪問' },
  { value: 'email', label: '✉️ メール' },
  { value: 'other', label: '📝 その他' },
];

const initialState: MeetingFormState = {};

export function MeetingForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="deal_id" value={dealId} />

      <div className="grid grid-cols-2 gap-3">
        <FormField label="種類" required>
          <Select name="type" defaultValue="meeting" options={TYPE_OPTIONS} />
        </FormField>
        <FormField label="日時">
          <TextInput
            type="datetime-local"
            name="occurred_at"
            defaultValue={new Date().toISOString().slice(0, 16)}
          />
        </FormField>
      </div>

      <FormField label="タイトル（任意）" hint="例: A社決裁者MTG / 提案前の確認電話">
        <TextInput name="title" placeholder="" />
      </FormField>

      <FormField
        label="本文・メモ"
        hint="話した内容を箇条書き or 自由記述で。AI が議事録要約と提案書に活用します"
      >
        <TextArea
          name="raw_text"
          rows={5}
          placeholder="例) 予算500万、決裁は社長。競合は X 社。納期は3月末まで希望..."
        />
      </FormField>

      {state.errors?._form && (
        <p className="text-xs text-kpi-down">{state.errors._form.join(' / ')}</p>
      )}
      {state.success && (
        <p className="text-xs text-kpi-up">記録しました</p>
      )}

      <FormActions>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '保存中…' : '記録する'}
        </Button>
      </FormActions>
    </form>
  );
}
