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

export const MEMBERS: MemberInfo[] = [
  { id: 'kashiwagi', name: '柏樹 久美子', initial: '柏', color: 'bg-pink-500',    email: 'kashiwagi@tripot.example.com', slackId: 'U0KASHI', skills: ['営業', 'ディレクション', '提案書'], level: 'senior' },
  { id: 'inukai',    name: '犬飼 智之',   initial: '犬', color: 'bg-emerald-500', email: 'inukai@tripot.example.com',    slackId: 'U0INUKAI', skills: ['React', 'Next.js', 'TypeScript', 'API設計', 'DB設計'], level: 'senior' },
  { id: 'izumi',     name: '和泉 阿委璃', initial: '和', color: 'bg-amber-500',   email: 'izumi@tripot.example.com',     slackId: 'U0IZUMI', skills: ['ディレクション', 'QA', 'デザインレビュー', 'テスト設計'], level: 'mid' },
  { id: 'ono',       name: '小野 崇',     initial: '小', color: 'bg-indigo-500',  email: 'ono@tripot.example.com',       slackId: 'U0ONO', skills: ['PM', '経営', '要件定義', 'プリセールス'], level: 'lead' },
  { id: 'ichioka',   name: '市岡 陸',     initial: '市', color: 'bg-teal-500',    email: 'ichioka@tripot.example.com',   slackId: 'U0ICHI', skills: ['HTML', 'CSS', 'JavaScript'], level: 'junior' },
];

const STORAGE_KEY = 'coaris_current_member';
// ログイン中ユーザー（デフォルト）。(dashboard)/layout.tsx の CURRENT_USER と揃える
const DEFAULT_MEMBER_ID = 'kashiwagi';

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
