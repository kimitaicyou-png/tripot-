export type MemberInfo = {
  id: string;
  name: string;
  initial: string;
  color: string;
  email?: string;
  slackId?: string;
  skills?: string[];
  level?: 'junior' | 'mid' | 'senior' | 'lead';
};

const MEMBER_COLORS = ['bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500'];

function loadMembersFromStorage(): MemberInfo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('tripot_members_cache');
    if (raw) return JSON.parse(raw) as MemberInfo[];
  } catch {}
  return [];
}

export function cacheMembersFromApi(apiMembers: Array<{ id: string; name: string; email?: string }>): void {
  const members = apiMembers.map((m, i) => ({
    id: m.id,
    name: m.name,
    initial: m.name.charAt(0),
    color: MEMBER_COLORS[i % MEMBER_COLORS.length],
    email: m.email,
  }));
  try { localStorage.setItem('tripot_members_cache', JSON.stringify(members)); } catch {}
}

export const MEMBERS: MemberInfo[] = loadMembersFromStorage();

const STORAGE_KEY = 'coaris_current_member';
// ログイン中ユーザー（デフォルト）。(dashboard)/layout.tsx の CURRENT_USER と揃える
const DEFAULT_MEMBER_ID = 'toki';

export function getCurrentMemberId(): string {
  if (typeof window === 'undefined') return DEFAULT_MEMBER_ID;
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_MEMBER_ID;
}

export function setCurrentMember(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, id);
}

export function getCurrentMember(): MemberInfo {
  const id = getCurrentMemberId();
  return MEMBERS.find((m) => m.id === id) ?? MEMBERS.find((m) => m.id === DEFAULT_MEMBER_ID)!;
}
