import type { UserRole } from '@/auth';

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  memberId: string;
  role: UserRole;
};

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'オーナー',
  manager: 'マネージャー',
  member: 'メンバー',
};
