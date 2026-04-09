'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/home', label: 'ダッシュボード', icon: '🏠' },
  { href: '/attack', label: 'アタック', icon: '🎯' },
  { href: '/deals', label: '案件管理', icon: '📋' },
  { href: '/production', label: '制作管理', icon: '🔧' },
  { href: '/customers', label: '顧客', icon: '👥' },
  { href: '/weekly', label: '週次', icon: '📊' },
  { href: '/monthly', label: '月次', icon: '📈' },
  { href: '/team', label: 'チーム', icon: '🤝' },
  { href: '/settings', label: '設定', icon: '⚙️' },
];

type Props = {
  memberId: string;
  memberName: string;
  memberInitial: string;
  memberColor: string;
  onMemberSwitch?: () => void;
};

export function Sidebar({ memberId, memberName, memberInitial, memberColor, onMemberSwitch }: Props) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="w-56 bg-gray-900 text-white flex flex-col h-screen shrink-0">
      <div className="px-3 py-4 border-b border-white/10">
        <button
          type="button"
          onClick={onMemberSwitch}
          className="flex items-center gap-2 w-full hover:bg-white/5 rounded-lg px-2 py-2 active:scale-[0.98] transition-all"
        >
          <div className={`w-8 h-8 rounded-full ${memberColor} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
            {memberInitial}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">{memberName}</p>
            <p className="text-[10px] text-white/40">トライポット</p>
          </div>
          <svg className="w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" /></svg>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href === '/home' ? `/home/${memberId}` : item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href, item.exact)
                ? 'bg-white/10 text-white font-medium'
                : 'text-white/60 hover:bg-white/5 hover:text-white/80'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
