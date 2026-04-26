import { DefaultSession } from 'next-auth';

/**
 * NextAuth v5 型拡張
 *
 * 🎩 セバスチャン Phase 0 V4 設計：
 * 旧 v1 の `(session.user as unknown as Record<string, unknown>).memberId` 型キャスト廃止。
 * session.user を厳格に型定義、tsc --noEmit 0 errors 担保。
 */

declare module 'next-auth' {
  interface Session {
    user: {
      member_id: string;
      company_id: string;
      role: 'president' | 'hq_member' | 'member';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    member_id?: string;
    company_id?: string;
    role?: 'president' | 'hq_member' | 'member';
  }
}
