'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, Plus } from 'lucide-react';
import { seedDefaultQuotes, addQuote } from '@/lib/actions/quotes';
import { FormField, TextInput, TextArea, Button, FormActions } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

export function QuotesAdmin({ existingCount }: { existingCount: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSeed() {
    if (existingCount > 0) {
      if (!confirm(`既に ${existingCount} 件登録済です。それでも seed しますか？`)) return;
    }
    startTransition(async () => {
      try {
        const r = await seedDefaultQuotes();
        if (r.inserted === 0) {
          toast.info('既存データがあるため投入をスキップしました', {
            description: `スキップ ${r.skipped} 件`,
          });
        } else {
          toast.success(`${r.inserted} 件 投入しました`);
        }
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '投入失敗';
        toast.error('投入失敗', { description: msg });
      }
    });
  }

  async function handleAddSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await addQuote(formData);
        toast.success('追加しました');
        router.refresh();
      } catch (err) {
        const msg = err instanceof Error ? err.message : '追加失敗';
        toast.error('追加失敗', { description: msg });
      }
    });
  }

  const [open, setOpen] = useState(false);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">名言の管理</p>
          <p className="text-xs text-gray-700 mt-1">
            登録済 <span className="font-mono">{existingCount}</span> 件
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={handleSeed} disabled={pending}>
            <span className="inline-flex items-center gap-1.5"><Sprout className="w-4 h-4" />初期データ投入</span>
          </Button>
          <Button type="button" variant="primary" onClick={() => setOpen((v) => !v)}>
            <span className="inline-flex items-center gap-1">{open ? null : <Plus className="w-4 h-4" />}{open ? '閉じる' : '追加'}</span>
          </Button>
        </div>
      </div>

      {open && (
        <form action={handleAddSubmit} className="space-y-3 pt-3 border-t border-gray-200">
          <FormField label="名言" required>
            <TextArea name="body" rows={2} placeholder="" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="著者（任意）" hint="例: 隊長 / 司馬遼太郎">
              <TextInput name="author" placeholder="" />
            </FormField>
            <FormField label="重み" hint="表示頻度の倍率（1〜5、大きいほど高頻度）">
              <TextInput type="number" name="weight" defaultValue="1" min="1" max="10" />
            </FormField>
          </div>
          <FormActions>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? '保存中…' : '追加'}
            </Button>
          </FormActions>
        </form>
      )}
    </section>
  );
}
