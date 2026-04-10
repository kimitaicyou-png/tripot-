import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { readFileSync } from 'fs';
import { join } from 'path';

export type UserRole = 'owner' | 'manager' | 'member';

export type AllowedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  invitedBy: string | null;
  invitedAt: string;
};

function loadMembers(): AllowedUser[] {
  try {
    const tmpPath = '/tmp/tripot_members.json';
    try {
      const tmp = readFileSync(tmpPath, 'utf-8');
      return JSON.parse(tmp) as AllowedUser[];
    } catch {}
    const filePath = join(process.cwd(), 'src/data/members.json');
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as AllowedUser[];
  } catch {
    return [
      { id: 'toki', email: 'k.toki@jtravel.group', name: '土岐 公人', role: 'owner', invitedBy: null, invitedAt: '2026-04-09' },
    ];
  }
}

export function findUser(email: string): AllowedUser | undefined {
  const members = loadMembers();
  return members.find((u) => u.email === email);
}

export function getAllUsers(): AllowedUser[] {
  return loadMembers();
}

const ROLE_LEVEL: Record<UserRole, number> = { owner: 3, manager: 2, member: 1 };

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    signIn({ profile }) {
      if (!profile?.email) return false;
      return !!findUser(profile.email);
    },
    jwt({ token, profile }) {
      if (profile?.email) {
        const user = findUser(profile.email);
        if (user) {
          token.memberId = user.id;
          token.role = user.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).memberId = token.memberId;
        (session.user as unknown as Record<string, unknown>).role = token.role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname === '/') {
        return true;
      }
      if (!isLoggedIn) return false;

      const email = auth?.user?.email;
      const matched = email ? findUser(email) : undefined;
      const role = matched?.role as UserRole | undefined;
      const memberId = matched?.id;

      const restrictedForMember = ['/budget', '/monthly', '/weekly'];
      if (role && !hasMinRole(role, 'manager') && restrictedForMember.some((p) => pathname.startsWith(p))) {
        return Response.redirect(new URL(`/home/${memberId ?? 'kashiwagi'}`, request.nextUrl));
      }
      if (pathname.startsWith('/settings') && role && role !== 'owner') {
        return Response.redirect(new URL(`/home/${memberId ?? 'kashiwagi'}`, request.nextUrl));
      }
      if (pathname.startsWith('/home/') && role === 'member') {
        const viewingId = pathname.split('/')[2];
        if (viewingId && viewingId !== memberId) {
          return Response.redirect(new URL(`/home/${memberId}`, request.nextUrl));
        }
      }

      return true;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
