'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  importBudgetActualsFromCsv,
  type BudgetActualFormState,
} from '@/lib/actions/budget-actuals';
import { Download } from 'lucide-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button, FormField, TextArea } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';

const CSV_TEMPLATE = `year,month,revenue,cogs,sga
2025,1,5000000,2000000,1500000
2025,2,4500000,1800000,1500000
2025,3,6000000,2200000,1500000`;

const initialState: BudgetActualFormState = {};

export function ActualsImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(importBudgetActualsFromCsv, initialState);

  useEffect(() => {
    if (state.success) {
      const inserted = state.inserted ?? 0;
      const updated = state.updated ?? 0;
      toast.success('昨年実績を投入しました', {
        description: `新規 ${inserted} 件 / 更新 ${updated} 件`,
      });
      setOpen(false);
      router.refresh();
    }
  }, [state.success, state.inserted, state.updated, router]);

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          昨年実績 取込
        </span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <DialogHeader title="昨年実績を CSV で取込" onClose={() => setOpen(false)} />
        <form action={formAction}>
          <DialogBody className="space-y-4">
            <p className="text-sm text-gray-700">
              CSV 形式：
              <code className="font-mono text-xs bg-gray-50 px-1 py-0.5 rounded">
                year, month, revenue, cogs, sga
              </code>
              （金額は税抜・整数）。 同年同月のデータがあれば上書き更新されます。
            </p>

            <FormField
              label="CSV データ"
              required
              hint="ヘッダ行 1行目、データ行は 2行目以降。手で貼り付け or Excel コピー"
            >
              <TextArea
                name="csv"
                rows={10}
                defaultValue=""
                placeholder={CSV_TEMPLATE}
                className="font-mono text-xs"
              />
            </FormField>

            {state.errors?._form && state.errors._form.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {state.errors._form.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">
                    {e}
                  </p>
                ))}
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? '取込中…' : '取込実行'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
