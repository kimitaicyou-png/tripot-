import { redirect } from 'next/navigation';
import { auth, signIn } from '@/auth';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user) {
    const memberId = (session.user as unknown as Record<string, unknown>).memberId ?? 'toki';
    redirect(`/home/${memberId}`);
  }

  const params = await searchParams;
  const error = params.error;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
      <div className="w-full max-w-[360px]">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-[#1a1f36] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-white text-xl font-semibold tracking-tight">T</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">トライポット</h1>
          <p className="text-sm text-gray-500 mt-2">Coaris AI 経営管理システム</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-red-600 leading-relaxed">
              {error === 'AccessDenied'
                ? '許可されていないアカウントです。社内Googleアカウントでログインしてください。'
                : 'ログインに失敗しました。もう一度お試しください。'}
            </p>
          </div>
        )}

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Googleアカウントでログイン</span>
          </button>
        </form>

        <p className="text-[11px] text-gray-400 text-center mt-8 leading-relaxed">
          社内Googleアカウントのみログイン可能です
        </p>
      </div>
    </div>
  );
}
