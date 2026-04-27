'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProposalSlides } from '@/lib/actions/proposals';

type Slide = {
  id?: string;
  type: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  items?: string[];
  message?: string;
};

export function ProposalSlidesEditor({
  proposalId,
  dealId,
  initialSlides,
}: {
  proposalId: string;
  dealId: string;
  initialSlides: Slide[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(initialSlides, null, 2));
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState(true);

  function handleChange(value: string) {
    setDraft(value);
    setMessage(null);
    try {
      JSON.parse(value);
      setValid(true);
    } catch {
      setValid(false);
    }
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateProposalSlides(proposalId, dealId, draft);
      if (!result.success) {
        setMessage(`✗ ${result.error}`);
        return;
      }
      setMessage(`✓ ${result.slideCount ?? 0} 枚のスライドを保存`);
      router.refresh();
    });
  }

  function handleReset() {
    setDraft(JSON.stringify(initialSlides, null, 2));
    setMessage(null);
    setValid(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
      >
        ✎ JSON 編集
      </button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-subtle">スライド JSON エディタ</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-muted hover:text-ink transition-colors"
        >
          閉じる
        </button>
      </div>

      <p className="text-xs text-subtle leading-relaxed">
        スライド配列を直接編集できます。各スライドは <code className="font-mono text-ink">type</code> と{' '}
        <code className="font-mono text-ink">title</code> 必須。<code className="font-mono text-ink">subtitle</code> /{' '}
        <code className="font-mono text-ink">bullets</code> / <code className="font-mono text-ink">items</code> /{' '}
        <code className="font-mono text-ink">message</code> は任意。
      </p>

      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={20}
        spellCheck={false}
        className={`w-full px-3 py-2 text-xs font-mono bg-bg border rounded focus:outline-none resize-y ${
          valid ? 'border-border focus:border-ink' : 'border-red-500 focus:border-red-700'
        }`}
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-subtle">
          {valid ? '✓ JSON パース OK' : '✗ JSON パースエラー'}
          {message && <span className={`ml-3 ${message.startsWith('✓') ? 'text-emerald-700' : 'text-red-700'}`}>{message}</span>}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:text-ink hover:border-ink transition-colors"
          >
            リセット
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending || !valid}
            className="px-4 py-1.5 text-xs font-medium bg-ink text-bg rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {pending ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}
