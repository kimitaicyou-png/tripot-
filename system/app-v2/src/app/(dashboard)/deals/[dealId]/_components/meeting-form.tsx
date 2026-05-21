'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { createMeeting, type MeetingFormState } from '@/lib/actions/meetings';
import { FormField, TextInput, Select, Button, FormActions } from '@/components/ui/form';
import { VoiceInputButton } from '@/components/voice-input-button';

const TYPE_OPTIONS = [
  { value: 'meeting', label: '商談' },
  { value: 'call', label: '電話' },
  { value: 'gmeet', label: 'オンラインMTG' },
  { value: 'visit', label: '訪問' },
  { value: 'email', label: 'メール' },
  { value: 'other', label: 'その他' },
];

const initialState: MeetingFormState = {};

export function MeetingForm({ dealId }: { dealId: string }) {
  const [state, formAction, pending] = useActionState(createMeeting, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const [rawText, setRawText] = useState('');

  useEffect(() => {
    if (state.success && formRef.current) {
      formRef.current.reset();
      setRawText('');
    }
  }, [state.success]);

  function appendTranscript(text: string) {
    setRawText((prev) => (prev ? prev + '\n' + text : text));
  }

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
        <TextInput name="title" placeholder="例: 2026/05/20 A社 初回商談" />
      </FormField>

      <FormField
        label="本文・メモ"
        hint="話した内容を箇条書き or 自由記述で。マイクで録音するとブラウザが自動で文字に起こします。AI が要約・ニーズ抽出・要件定義・提案・見積まで作ります"
      >
        <div className="space-y-2">
          <VoiceInputButton onTranscript={appendTranscript} disabled={pending} />
          <textarea
            name="raw_text"
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="例) 予算500万、決裁は社長。競合は X 社。納期は3月末まで希望..."
            className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-y"
          />
        </div>
      </FormField>

      {state.errors?._form && (
        <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
      )}
      {state.success && (
        <p className="text-xs text-emerald-700">記録しました</p>
      )}

      <FormActions>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? '保存中…' : '記録する'}
        </Button>
      </FormActions>
    </form>
  );
}
