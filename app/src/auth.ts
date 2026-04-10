import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export type UserRole = 'owner' | 'manager' | 'member';

type AllowedUser = {
  id: string;
  email: string;
  role: UserRole;
};

const ALLOWED_USERS: AllowedUser[] = [
  { id: 'toki',      email: 'k.toki@jtravel.group',         role: 'owner' },
  { id: 'ono',       email: 'ono@tripot.example.com',       role: 'owner' },
  { id: 'kashiwagi', email: 'kashiwagi@tripot.example.com', role: 'manager' },
  { id: 'inukai',    email: 'inukai@tripot.example.com',    role: 'manager' },
  { id: 'izumi',     email: 'izumi@tripot.example.com',     role: 'member' },
  { id: 'ichioka',   email: 'ichioka@tripot.example.com',   role: 'member' },
];

export function findUser(email: string): AllowedUser | undefined {
  return ALLOWED_USERS.find((u) => u.email === email);
}

export function getAllUsers(): AllowedUser[] {
  return ALLOWED_USERS;
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

      const user = auth?.user as unknown as Record<string, unknown> | undefined;
      const role = user?.role as UserRole | undefined;
      const memberId = user?.memberId as string | undefined;

      if (pathname.startsWith('/budget') && role && !hasMinRole(role, 'manager')) {
        return Response.redirect(new URL(`/home/${memberId ?? 'kashiwagi'}`, request.nextUrl));
      }
      if (pathname.startsWith('/monthly') && role && !hasMinRole(role, 'manager')) {
        return Response.redirect(new URL(`/home/${memberId ?? 'kashiwagi'}`, request.nextUrl));
      }
      if (pathname.startsWith('/weekly') && role && !hasMinRole(role, 'manager')) {
        return Response.redirect(new URL(`/home/${memberId ?? 'kashiwagi'}`, request.nextUrl));
      }
      if (pathname.startsWith('/settings') && role !== 'owner') {
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
