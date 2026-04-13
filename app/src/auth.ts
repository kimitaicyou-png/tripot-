import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { neon } from '@neondatabase/serverless';

export type UserRole = 'owner' | 'manager' | 'member';

export type AllowedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  invitedBy: string | null;
  invitedAt: string;
};

async function findUserByEmail(email: string): Promise<AllowedUser | undefined> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT id, email, name, role, invited_by, invited_at FROM members WHERE email = ${email} LIMIT 1`;
    if (rows.length === 0) return undefined;
    const r = rows[0];
    return { id: r.id, email: r.email, name: r.name, role: r.role as UserRole, invitedBy: r.invited_by, invitedAt: r.invited_at ?? '' };
  } catch {
    return undefined;
  }
}

const ROLE_LEVEL: Record<UserRole, number> = { owner: 3, manager: 2, member: 1 };

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return ROLE_LEVEL[userRole] >= ROLE_LEVEL[minRole];
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) return false;
      const user = await findUserByEmail(profile.email);
      return !!user;
    },
    async jwt({ token, profile }) {
      if (profile?.email) {
        const user = await findUserByEmail(profile.email);
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

      const role = (auth?.user as Record<string, unknown> | undefined)?.role as UserRole | undefined;
      const memberId = (auth?.user as Record<string, unknown> | undefined)?.memberId as string | undefined;

      const restrictedForMember = ['/budget', '/monthly', '/weekly'];
      if (role && !hasMinRole(role, 'manager') && restrictedForMember.some((p) => pathname.startsWith(p))) {
        return Response.redirect(new URL(`/home/${memberId ?? 'toki'}`, request.nextUrl));
      }
      if (pathname.startsWith('/settings') && role && role !== 'owner') {
        return Response.redirect(new URL(`/home/${memberId ?? 'toki'}`, request.nextUrl));
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
