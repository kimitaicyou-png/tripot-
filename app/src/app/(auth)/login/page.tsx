'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AUTH_COOKIE = 'coaris_auth';
const REDIRECT_PATH = '/home/kashiwagi';

function getAuthCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${AUTH_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

function setAuthCookie(remember: boolean) {
  const value = encodeURIComponent('kashiwagi');
  if (remember) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${AUTH_COOKIE}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  } else {
    document.cookie = `${AUTH_COOKIE}=${value}; path=/; SameSite=Lax`;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (getAuthCookie()) {
      router.replace(REDIRECT_PATH);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('ユーザーIDとパスワードを入力してください');
      return;
    }

    if (email === 'admin' && password === 'admin') {
      setLoading(true);
      setAuthCookie(rememberMe);
      setTimeout(() => router.push(REDIRECT_PATH), 500);
      return;
    }

    setError('ユーザーIDまたはパスワードが正しくありません');
    return;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">コアリスAI</h1>
          <p className="text-sm text-blue-300 font-semibold mt-1">案件管理システム</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-1.5">ユーザーID</label>
            <input id="email" type="text" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="admin" autoComplete="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-500" />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-1.5">パスワード</label>
            <div className="relative">
              <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 placeholder:text-gray-500" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-900">
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none active:scale-[0.98]">
            <div className="relative shrink-0">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 transition-colors flex items-center justify-center ${rememberMe ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                {rememberMe && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-700 font-medium">次回から省略する（30日間）</span>
          </label>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 disabled:bg-blue-400 transition-colors active:scale-[0.98]">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />ログイン中...
              </span>
            ) : 'ログイン'}
          </button>

          <div className="text-center">
            <button type="button" className="text-sm text-blue-700 font-semibold hover:text-blue-900">
              パスワードをお忘れですか？
            </button>
          </div>
        </form>

        <p className="text-center text-xs text-blue-200 font-medium mt-6">© 2026 コアリスホールディングス</p>
      </div>
    </div>
  );
}
