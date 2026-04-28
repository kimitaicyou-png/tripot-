'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield } from 'lucide-react';
import { requestApproval, type ApprovalRequestState } from '@/lib/actions/approvals';
import { Button, FormField, Select, TextArea, FormActions } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';

const TYPE_OPTIONS = [
  { value: 'discount', label: '値引き承認' },
  { value: 'expense', label: '経費承認' },
  { value: 'contract', label: '契約承認' },
  { value: 'custom', label: 'その他' },
];

const initialState: ApprovalRequestState = {};

export function ApprovalRequestButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(requestApproval, initialState);

  useEffect(() => {
    if (state.success) {
      toast.success('承認を申請しました', { description: '/approval で進捗確認できます' });
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-1.5">
          <Shield className="w-4 h-4" />
          承認申請
        </span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} size="md">
        <DialogHeader title="承認申請" onClose={() => setOpen(false)} />
        <form action={formAction}>
          <DialogBody className="space-y-4">
            <input type="hidden" name="deal_id" value={dealId} />
            <FormField label="種別" required>
              <Select name="type" defaultValue="discount" options={TYPE_OPTIONS} />
            </FormField>
            <FormField label="申請理由・補足" hint="決裁者が判断するための情報">
              <TextArea
                name="payload_note"
                rows={4}
                placeholder="例: A社向け 10%値引き。受注確度80%のクロージング段階、競合B社が安価提示中"
              />
            </FormField>
            {state.errors?._form && (
              <p className="text-xs text-red-700">{state.errors._form.join(' / ')}</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? '申請中…' : '申請する'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
