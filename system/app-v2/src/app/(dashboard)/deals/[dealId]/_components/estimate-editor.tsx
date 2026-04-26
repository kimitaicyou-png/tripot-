'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createEstimate } from '@/lib/actions/estimates';
import { FormField, TextInput, Button, FormActions } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';

type LineItem = {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
};

const DEFAULT_TAX_RATE = 0.1;

function emptyLine(): LineItem {
  return { description: '', quantity: 1, unit_price: 0, amount: 0 };
}

function calcAmount(qty: number, price: number): number {
  return Math.round(qty * price);
}

export function EstimateEditorButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0),
    [lines]
  );
  const tax = useMemo(() => Math.round(subtotal * DEFAULT_TAX_RATE), [subtotal]);
  const total = subtotal + tax;

  function reset() {
    setTitle('');
    setValidUntil('');
    setLines([emptyLine()]);
  }

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines((prev) => {
      const next = prev.map((l, i) => (i === idx ? { ...l, ...patch } : l));
      const item = next[idx]!;
      next[idx] = { ...item, amount: calcAmount(item.quantity, item.unit_price) };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  }

  async function handleSubmit() {
    if (submitting) return;
    if (!title.trim()) {
      toast.error('タイトルを入力してください');
      return;
    }
    const validLines = lines.filter((l) => l.description.trim().length > 0 && l.quantity > 0);
    if (validLines.length === 0) {
      toast.error('明細を 1 行以上入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set('deal_id', dealId);
      fd.set('title', title);
      fd.set('status', 'draft');
      fd.set('subtotal', String(subtotal));
      fd.set('tax', String(tax));
      fd.set('total', String(total));
      fd.set('line_items', JSON.stringify(validLines));
      if (validUntil) fd.set('valid_until', validUntil);

      const result = await createEstimate({}, fd);
      if (result.errors) {
        const msg = Object.values(result.errors).flat().join(' / ');
        toast.error('登録失敗', { description: msg });
        return;
      }
      toast.success('見積を作成しました', { description: `小計 ¥${subtotal.toLocaleString('ja-JP')}` });
      reset();
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('登録失敗', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>
        + 見積を新規作成
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        size="xl"
      >
        <DialogHeader title="見積を新規作成" onClose={() => setOpen(false)} />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="タイトル" required>
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder=""
              />
            </FormField>
            <FormField label="有効期限">
              <TextInput
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </FormField>
          </div>

          <div>
            <p className="text-xs uppercase tracking-widest text-subtle mb-2">明細</p>
            <div className="space-y-2">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-start"
                >
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e) => updateLine(idx, { description: e.target.value })}
                    placeholder="品目・サービス内容"
                    className="col-span-6 px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={line.quantity}
                    onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) || 0 })}
                    placeholder="数量"
                    className="col-span-2 px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20 tabular-nums"
                  />
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={line.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: Number(e.target.value) || 0 })}
                    placeholder="単価"
                    className="col-span-2 px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20 tabular-nums"
                  />
                  <p className="col-span-1 px-2 py-2 text-sm text-ink font-mono tabular-nums text-right">
                    {line.amount.toLocaleString('ja-JP')}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeLine(idx)}
                    disabled={lines.length === 1}
                    className="col-span-1 px-2 py-2 text-muted hover:text-kpi-down disabled:opacity-30 text-sm"
                    aria-label={`${idx + 1}行目を削除`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-3 text-sm text-muted hover:text-ink"
            >
              + 行を追加
            </button>
          </div>

          <div className="border-t border-border pt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">小計</span>
              <span className="font-mono tabular-nums text-ink">¥{subtotal.toLocaleString('ja-JP')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">消費税 (10%)</span>
              <span className="font-mono tabular-nums text-ink">¥{tax.toLocaleString('ja-JP')}</span>
            </div>
            <div className="flex justify-between text-base font-medium">
              <span className="text-ink">合計</span>
              <span className="font-mono tabular-nums text-ink">¥{total.toLocaleString('ja-JP')}</span>
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
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
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting || pending}
          >
            {submitting ? '保存中…' : '見積を保存'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
