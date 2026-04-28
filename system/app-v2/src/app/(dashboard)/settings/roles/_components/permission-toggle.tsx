'use client';

import { useState, useTransition } from 'react';
import { updateRolePermission } from '@/lib/actions/role-permissions';
import { type Role } from '@/lib/role-permissions-meta';
import { toast } from '@/components/ui/toaster';

export function PermissionToggle({
  role,
  resource,
  action,
  initialAllowed,
}: {
  role: Role;
  resource: string;
  action: string;
  initialAllowed: boolean;
}) {
  const [allowed, setAllowed] = useState(initialAllowed);
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const next = !allowed;
    setAllowed(next);
    startTransition(async () => {
      try {
        await updateRolePermission(role, resource, action, next ? 1 : 0);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
        setAllowed(!next);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      aria-pressed={allowed}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs transition-colors disabled:opacity-50 ${
        allowed
          ? 'bg-emerald-500 text-white hover:bg-green-700'
          : 'bg-gray-50 border border-gray-200 text-gray-500 hover:bg-slate-100'
      }`}
    >
      {allowed ? '✓' : '—'}
    </button>
  );
}
