'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { FormField, Select, TextInput, TextArea, Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const INTENT_OPTIONS = [
  { value: 'thank_you', label: '🙇 商談・打ち合わせのお礼' },
  { value: 'follow_up', label: '🔁 提案後のフォローアップ' },
  { value: 'proposal_send', label: '📄 提案書 送付の案内' },
  { value: 'estimate_send', label: '🧮 見積書 送付の案内' },
  { value: 'meeting_request', label: '📅 次回打ち合わせの日程調整' },
  { value: 'price_discussion', label: '💴 価格の相談・交渉' },
  { value: 'closing_check', label: '✅ 受注に向けた最終確認' },
  { value: 'apology', label: '🙏 対応遅延・トラブルの謝罪' },
  { value: 'custom', label: '📝 自由記述（追加指示で詳細）' },
];

const FORMALITY_OPTIONS = [
  { value: 'formal', label: 'フォーマル' },
  { value: 'casual', label: 'カジュアル' },
];

type Draft = { subject: string; body: string; to: string | null; generated_at: string };

export function EmailDraftButton({
  dealId,
  dealTitle,
}: {
  dealId: string;
  dealTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState('thank_you');
  const [formality, setFormality] = useState('formal');
  const [recipient, setRecipient] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [running, setRunning] = useState(false);

  function reset() {
    setDraft(null);
    setCustomPrompt('');
  }

  async function handleGenerate() {
    if (running) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: dealId,
          intent,
          formality,
          recipient_name: recipient || undefined,
          custom_prompt: customPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.error === 'ai_error'
            ? `AI エラー: ${data.message ?? '通信失敗'}`
            : data?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('メール下書き失敗', { description: msg });
        setRunning(false);
        return;
      }

      const json = (await res.json()) as Draft;
      setDraft(json);
      toast.success('メール下書きできました');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('メール下書き失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  async function copyAll() {
    if (!draft) return;
    const text = `件名: ${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('コピーしました', { description: '件名+本文をクリップボードへ' });
    } catch {
      toast.error('コピーに失敗');
    }
  }

  function openMailto() {
    if (!draft) return;
    const params = new URLSearchParams({
      subject: draft.subject,
      body: draft.body,
    });
    const to = draft.to ?? '';
    window.location.href = `mailto:${to}?${params.toString()}`;
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        ✉️ メール下書き
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        size="lg"
      >
        <DialogHeader
          title={`メール下書き — ${dealTitle}`}
          onClose={() => {
            setOpen(false);
            reset();
          }}
        />
        <DialogBody className="space-y-4">
          {!draft ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="意図" required>
                  <Select
                    value={intent}
                    onChange={(e) => setIntent(e.target.value)}
                    options={INTENT_OPTIONS}
                  />
                </FormField>
                <FormField label="トーン">
                  <Select
                    value={formality}
                    onChange={(e) => setFormality(e.target.value)}
                    options={FORMALITY_OPTIONS}
                  />
                </FormField>
              </div>

              <FormField
                label="受信者の呼称（任意）"
                hint="例: 鈴木様 / 田中部長 / 株式会社○○ ご担当者様（空欄で自動）"
              >
                <TextInput
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder=""
                />
              </FormField>

              <FormField
                label="追加指示（任意）"
                hint="意図=自由記述 を選んだ時 / 強調したい点があれば"
              >
                <TextArea
                  rows={3}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="例) 料金プランBの理由を強調 / 来月初の訪問を打診"
                />
              </FormField>
            </>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle mb-1">件名</p>
                <p className="text-base text-ink font-medium">{draft.subject}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-subtle mb-1">本文</p>
                <pre className="text-sm text-ink whitespace-pre-wrap font-sans bg-surface border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
                  {draft.body}
                </pre>
              </div>
              {draft.to && (
                <p className="text-xs text-muted">
                  宛先候補: <span className="font-mono">{draft.to}</span>
                </p>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {!draft ? (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOpen(false);
                  reset();
                }}
              >
                キャンセル
              </Button>
              <Button type="button" variant="primary" onClick={handleGenerate} disabled={running}>
                {running ? '✨ 生成中…' : '✨ AI で下書き'}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                ← 別の意図でやり直し
              </Button>
              <Button type="button" variant="secondary" onClick={copyAll}>
                📋 コピー
              </Button>
              <Button type="button" variant="primary" onClick={openMailto}>
                ✉️ メーラーで開く
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </>
  );
}
