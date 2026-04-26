import { signIn } from '@/auth';
import { TRIPOT_CONFIG } from '../../../../coaris.config';

const QUOTES = [
  '打席に立たなければヒットは出ない。',
  '小さな一歩が、大きな案件を動かす。',
  '放置は最大の敵。今日連絡するだけで状況は変わる。',
  '行動量がKPIの源泉。量×質=結果。',
];

function pickQuote(): string {
  const idx = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % QUOTES.length;
  return QUOTES[idx]!;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; callbackUrl?: string }> }) {
  const params = await searchParams;
  const errorMessage = mapError(params.error);
  const callbackUrl = params.callbackUrl ?? '/';
  const quote = pickQuote();

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-1/2 bg-slate-950 text-white flex flex-col justify-between p-8 md:p-16">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <span className="font-serif italic text-xl">t</span>
          </div>
          <div>
            <p className="font-serif italic text-2xl">tripot.</p>
            <p className="text-xs text-slate-500 mt-0.5">Coaris HD</p>
          </div>
        </div>

        <div>
          <p className="font-serif italic text-3xl md:text-5xl leading-tight tracking-tight">
            {quote}
          </p>
          <p className="text-sm text-slate-500 mt-6 font-sans">
            {TRIPOT_CONFIG.name}　経営管理システム
          </p>
        </div>

        <p className="text-xs text-slate-500 font-mono">
          coaris.ai / tripot
        </p>
      </aside>

      <section className="md:w-1/2 bg-white flex items-center justify-center p-8 md:p-16">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">tripot にサインイン</h1>
          <p className="text-sm text-muted mt-2">
            {TRIPOT_CONFIG.auth.allowedEmailDomains.map((d) => `@${d}`).join(' / ')} のメールでログイン
          </p>

          {errorMessage && (
            <div className="mt-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: callbackUrl });
            }}
            className="mt-8"
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white border border-border rounded-lg hover:border-ink-mid transition-colors active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-sm font-medium text-ink">Google でサインイン</span>
            </button>
          </form>

          <p className="text-xs text-subtle text-center mt-8 leading-relaxed">
            社内 Google アカウントのみアクセス可能です
          </p>
        </div>
      </section>
    </main>
  );
}

function mapError(error?: string): string | null {
  if (!error) return null;
  switch (error) {
    case 'domain_not_allowed':
      return '社内ドメイン（@coaris.ai）のアカウントでログインしてください';
    case 'not_invited':
      return 'まだ招待されていないアカウントです。管理者にご連絡ください';
    case 'inactive':
      return 'アカウントが無効化されています。管理者にご連絡ください';
    default:
      return 'ログインに失敗しました。もう一度お試しください';
  }
}
