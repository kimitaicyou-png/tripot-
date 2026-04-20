'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MemberInfo } from '@/lib/stores/types';
import { MEMBERS } from '@/lib/constants/members';

const STORAGE_KEY = 'coaris_current_member';
const DEFAULT_ID = 'toki';

export function useCurrentMember() {
  const [memberId, setMemberId] = useState(DEFAULT_ID);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setMemberId(stored);
  }, []);

  const switchMember = useCallback((id: string) => {
    setMemberId(id);
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const member: MemberInfo = MEMBERS.find((m) => m.id === memberId) ?? MEMBERS[0] ?? { id: '', name: '', initial: '', color: 'bg-gray-500' };

  return { memberId, member, switchMember, allMembers: MEMBERS };
}
