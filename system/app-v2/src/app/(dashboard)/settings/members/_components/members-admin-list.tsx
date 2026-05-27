'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Briefcase, User as UserIcon } from 'lucide-react';
import {
  activateMember,
  deactivateMember,
  updateMemberRole,
} from '@/lib/actions/members';
import { Button } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';

type Role = 'president' | 'hq_member' | 'member';
type Status = 'active' | 'pending' | 'inactive';

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  department: string | null;
  created_at: Date | string;
};

const ROLE_META: Record<Role, { label: string; icon: typeof Crown; tone: 'accent' | 'neutral' }> = {
  president: { label: '社長', icon: Crown, tone: 'accent' },
  hq_member: { label: '本部', icon: Briefcase, tone: 'neutral' },
  member: { label: 'メンバー', icon: UserIcon, tone: 'neutral' },
};

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'member', label: 'メンバー' },
  { value: 'hq_member', label: '本部' },
  { value: 'president', label: '社長' },
];

export function MembersAdminList({
  members,
  currentMemberId,
}: {
  members: Member[];
  currentMemberId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function handleStatusToggle(m: Member) {
    if (m.id === currentMemberId) {
      toast.error('自分自身を無効化することはできません');
      return;
    }
    const next = m.status === 'active' ? 'inactive' : 'active';
    const verb = next === 'inactive' ? '無効化' : '再有効化';
    if (!confirm(`「${m.name}」を${verb}しますか？`)) return;
    setBusyId(m.id);
    startTransition(async () => {
      try {
        const result =
          next === 'inactive' ? await deactivateMember(m.id) : await activateMember(m.id);
        if (result.success) {
          toast.success(`${verb}しました`);
          router.refresh();
        } else {
          toast.error('失敗', { description: result.error ?? '' });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleRoleChange(m: Member, nextRole: Role) {
    if (nextRole === m.role) return;
    if (m.id === currentMemberId) {
      toast.error('自分自身の役割は変更できません');
      return;
    }
    if (!confirm(`「${m.name}」の役割を ${ROLE_META[nextRole].label} に変更しますか？`)) return;
    setBusyId(m.id);
    startTransition(async () => {
      try {
        const result = await updateMemberRole(m.id, nextRole);
        if (result.success) {
          toast.success('役割を変更しました');
          router.refresh();
        } else {
          toast.error('変更失敗', { description: result.error ?? '' });
        }
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <ul className="space-y-3">
      {members.map((m) => {
        const RoleIcon = ROLE_META[m.role].icon;
        const isSelf = m.id === currentMemberId;
        const isInactive = m.status === 'inactive';
        const isBusy = busyId === m.id && pending;
        return (
          <li
            key={m.id}
            className={`bg-white border rounded-xl p-5 space-y-3 ${
              isInactive ? 'border-gray-200 opacity-60' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-gray-900 font-medium">{m.name}</p>
                  {isSelf && <Badge tone="neutral">自分</Badge>}
                  {isInactive && <Badge tone="neutral">無効化中</Badge>}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-700">
                  <span className="font-mono">{m.email}</span>
                  {m.department && <span>{m.department}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge tone={ROLE_META[m.role].tone}>
                  <span className="inline-flex items-center gap-1">
                    <RoleIcon className="w-3 h-3" />
                    {ROLE_META[m.role].label}
                  </span>
                </Badge>
              </div>
            </div>

            {!isSelf && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-500">役割変更：</span>
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleRoleChange(m, opt.value)}
                    disabled={isBusy || opt.value === m.role}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-all active:scale-[0.98] disabled:cursor-default ${
                      opt.value === m.role
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    } ${isBusy ? 'opacity-50' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
                <span className="flex-1" />
                <Button
                  type="button"
                  variant={isInactive ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={() => handleStatusToggle(m)}
                  disabled={isBusy}
                >
                  {isInactive ? '再有効化' : '無効化'}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
