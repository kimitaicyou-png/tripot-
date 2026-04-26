'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { VendorForm } from './vendor-form';

export function VendorCreateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
        + 新規追加
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <DialogHeader title="外注先を新規登録" onClose={() => setOpen(false)} />
        <DialogBody>
          <VendorForm onSuccess={() => setOpen(false)} />
        </DialogBody>
      </Dialog>
    </>
  );
}
