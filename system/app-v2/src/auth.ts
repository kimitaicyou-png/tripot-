/**
 * NextAuth v5 設定
 *
 * 🎩 セバスチャン Phase 0 V4 設計準拠：
 * - JWT strategy
 * - signIn callback でドメイン制限（@coaris.ai のみ）
 * - 全ログイン試行を audit_logs に記録
 * - 旧 v1 の `(session.user as unknown as Record<string, unknown>).memberId = ...`
 *   型キャスト撲滅、next-auth.d.ts で型拡張
 */

import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { eq, and, isNull } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { members, companies } from '@/db/schema';
import { TRIPOT_CONFIG } from '../coaris.config';

const ALLOWED_DOMAINS = TRIPOT_CONFIG.auth.allowedEmailDomains;
const DEV_ALLOWED_EMAILS = (process.env.DEV_ALLOWED_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID_V2!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET_V2!,
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30日
  },

  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase() ?? '';
      if (!email) return false;

      // 開発時の例外許可
      if (process.env.NODE_ENV !== 'production' && DEV_ALLOWED_EMAILS.includes(email)) {
        return true;
      }

      // ドメイン制限
      const domainMatch = ALLOWED_DOMAINS.some((d) => email.endsWith(`@${d}`));
      if (!domainMatch) {
        await logAudit({
          action: 'sign_in.rejected.domain',
          metadata: { email, allowedDomains: ALLOWED_DOMAINS },
        });
        return '/login?error=domain_not_allowed';
      }

      // DB登録メンバーかチェック
      const member = await db
        .select({ id: members.id, status: members.status, company_id: members.company_id })
        .from(members)
        .where(and(eq(members.email, email), isNull(members.deleted_at)))
        .limit(1)
        .then((rows) => rows[0]);

      if (!member) {
        await logAudit({
          action: 'sign_in.rejected.not_invited',
          metadata: { email },
        });
        return '/login?error=not_invited';
      }

      if (member.status !== 'active') {
        await logAudit({
          member_id: member.id,
          company_id: member.company_id,
          action: 'sign_in.rejected.inactive',
          metadata: { email, status: member.status },
        });
        return '/login?error=inactive';
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user?.email) {
        const member = await db
          .select({
            id: members.id,
            company_id: members.company_id,
            role: members.role,
            name: members.name,
          })
          .from(members)
          .where(and(eq(members.email, user.email.toLowerCase()), isNull(members.deleted_at)))
          .limit(1)
          .then((rows) => rows[0]);

        if (member) {
          token.member_id = member.id;
          token.company_id = member.company_id;
          token.role = member.role;
          token.name = member.name;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token.member_id) session.user.member_id = token.member_id as string;
      if (token.company_id) session.user.company_id = token.company_id as string;
      if (token.role) session.user.role = token.role as 'president' | 'hq_member' | 'member';
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return;
      const member = await db
        .select({ id: members.id, company_id: members.company_id })
        .from(members)
        .where(eq(members.email, email))
        .limit(1)
        .then((rows) => rows[0]);

      if (member) {
        await logAudit({
          member_id: member.id,
          company_id: member.company_id,
          action: 'sign_in',
          resource_type: 'auth',
        });
      }
    },

    async signOut() {
      // signOut event の引数は型が緩いので member_id は middleware 側で記録する設計
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  trustHost: true,
});
