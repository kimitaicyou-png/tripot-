'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/form';
import { Dialog, DialogHeader, DialogBody } from '@/components/ui/dialog';
import { MemberInviteForm } from './member-invite-form';

export function MemberInviteButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="primary" size="sm" onClick={() => setOpen(true)}>
        <span className="inline-flex items-center gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          メンバーを招待
        </span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg">
        <DialogHeader title="メンバーを招待" onClose={() => setOpen(false)} />
        <DialogBody>
          <MemberInviteForm onSuccess={() => setOpen(false)} />
        </DialogBody>
      </Dialog>
    </>
  );
}
