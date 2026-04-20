import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function requireAuth(): Promise<{ email: string; memberId?: string } | NextResponse> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
  }
  const memberId = (session.user as Record<string, unknown>).memberId as string | undefined;
  return { email: session.user.email, memberId };
}

export function isAuthError(result: { email: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}
