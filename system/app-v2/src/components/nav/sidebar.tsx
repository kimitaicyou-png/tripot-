import Link from 'next/link';
import { signOut } from '@/auth';
import { TRIPOT_CONFIG } from '../../../coaris.config';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';
import { unreadCountForMember } from '@/lib/actions/notifications';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'ホーム', icon: '🏠' },
  { href: '/deals', label: '案件', icon: '📋' },
  { href: '/tasks', label: 'タスク', icon: '✓' },
  { href: '/customers', label: '顧客', icon: '🤝' },
  { href: '/weekly', label: '週次', icon: '📅' },
  { href: '/monthly', label: '月次', icon: '📊' },
  { href: '/budget', label: '事業計画', icon: '🎯' },
  { href: '/team', label: 'チーム', icon: '👥' },
  { href: '/production', label: '製造', icon: '🛠️' },
  { href: '/approval', label: '承認', icon: '✋' },
];

const SETTINGS_ITEMS: NavItem[] = [
  { href: '/settings/company', label: '会社', icon: '🏢' },
  { href: '/settings/roles', label: '権限', icon: '🛡️' },
  { href: '/settings/quotes', label: '名言', icon: '🎴' },
  { href: '/settings/templates', label: 'テンプレ', icon: '📁' },
  { href: '/settings/vendors', label: '外注先', icon: '🏭' },
  { href: '/settings/notifications', label: '通知設定', icon: '🔔' },
  { href: '/settings/integrations', label: '連携', icon: '🔌' },
  { href: '/settings/audit', label: '監査', icon: '🪵' },
  { href: '/settings/mf', label: 'MF', icon: '💴' },
];

export async function Sidebar({ user }: { user: { name?: string | null; member_id: string; role: string } }) {
  const memberId = user.member_id;
  const initial = getMemberInitial(user.name ?? '');
  const color = getMemberColor(memberId);
  const unreadCount = await unreadCountForMember(memberId);

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col bg-card border-r border-border h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-border">
        <Link href={`/home/${memberId}`} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink flex items-center justify-center">
            <span className="font-serif italic text-white text-sm">t</span>
          </div>
          <div>
            <p className="font-serif italic text-lg text-ink leading-none">tripot.</p>
            <p className="text-[10px] text-subtle font-mono mt-0.5">{TRIPOT_CONFIG.shortName} / Coaris HD</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <form action="/search" className="px-2 mb-3">
          <div className="relative">
            <input
              type="search"
              name="q"
              placeholder="🔎 横断検索"
              className="w-full px-3 py-1.5 text-sm text-ink bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20 placeholder:text-subtle"
            />
          </div>
        </form>

        {NAV_ITEMS.map((item) => {
          const href = item.href === '/home' ? `/home/${memberId}` : item.href;
          return (
            <Link
              key={item.href}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={href as any}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-mid hover:bg-slate-50 transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

        <Link
          href="/notifications"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-ink-mid hover:bg-slate-50 transition-colors"
        >
          <span className="text-base">🔔</span>
          <span className="font-medium flex-1">通知</span>
          {unreadCount > 0 && (
            <span className="text-xs font-mono tabular-nums text-card bg-amber-500 px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </Link>

        <Link
          href="/settings"
          className="text-[10px] uppercase tracking-widest text-subtle mt-4 mb-2 px-3 hover:text-ink block"
        >
          設定 →
        </Link>
        {SETTINGS_ITEMS.map((item) => (
          <Link
            key={item.href}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            href={item.href as any}
            className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs text-muted hover:bg-slate-50 hover:text-ink transition-colors"
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg">
          <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center text-white text-sm font-semibold shrink-0`}>
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{user.name}</p>
            <p className="text-xs text-subtle">{roleLabel(user.role)}</p>
          </div>
        </div>
        <form
          action={async () => {
            'use server';
            await signOut({ redirectTo: '/login' });
          }}
        >
          <button
            type="submit"
            className="w-full mt-2 px-3 py-1.5 text-xs text-muted hover:text-ink transition-colors text-left"
          >
            ログアウト
          </button>
        </form>
      </div>
    </aside>
  );
}

function roleLabel(role: string): string {
  switch (role) {
    case 'president': return '社長';
    case 'hq_member': return '本部メンバー';
    case 'member': return 'メンバー';
    default: return role;
  }
}
