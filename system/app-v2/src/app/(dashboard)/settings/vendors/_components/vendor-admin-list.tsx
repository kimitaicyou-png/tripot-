'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteVendor, type VendorFormState } from '@/lib/actions/vendors';
import { Button } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { VendorForm } from './vendor-form';

type Vendor = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  rating: number | null;
  skills: unknown;
  created_at: Date | string;
};

export function VendorAdminList({ vendors }: { vendors: Vendor[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Vendor | null>(null);

  function handleDelete(vendor: Vendor) {
    if (!confirm(`「${vendor.name}」を削除しますか？`)) return;
    startTransition(async () => {
      try {
        await deleteVendor(vendor.id);
        toast.success('削除しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '削除失敗';
        toast.error('削除失敗', { description: msg });
      }
    });
  }

  return (
    <>
      <ul className="space-y-3">
        {vendors.map((v) => {
          const skills = Array.isArray(v.skills) ? (v.skills as string[]) : [];
          return (
            <li key={v.id} className="bg-card border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium">{v.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-muted">
                    {v.contact_email && <span className="font-mono">{v.contact_email}</span>}
                    {v.contact_phone && <span className="font-mono">{v.contact_phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {v.rating && (
                    <Badge tone="accent">★ {v.rating}/5</Badge>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditing(v)}
                  >
                    編集
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(v)}
                    disabled={pending}
                  >
                    削除
                  </Button>
                </div>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s, i) => (
                    <Badge key={i} tone="neutral">{s}</Badge>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="lg">
        <DialogHeader
          title={`${editing?.name ?? ''} を編集`}
          onClose={() => setEditing(null)}
        />
        <DialogBody>
          {editing && (
            <VendorForm
              initial={{
                id: editing.id,
                name: editing.name,
                contact_email: editing.contact_email,
                contact_phone: editing.contact_phone,
                rating: editing.rating,
                skills: Array.isArray(editing.skills) ? (editing.skills as string[]) : [],
              }}
              onSuccess={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </DialogBody>
      </Dialog>
    </>
  );
}
