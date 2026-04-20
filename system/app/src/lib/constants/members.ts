import type { MemberInfo } from '@/lib/stores/types';

export const MEMBERS: MemberInfo[] = [];

export function getMemberById(id: string): MemberInfo | undefined {
  return MEMBERS.find((m) => m.id === id);
}

export function getMemberName(id: string): string {
  return getMemberById(id)?.name ?? id;
}
