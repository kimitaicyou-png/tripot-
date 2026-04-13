'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { GlobalSearch } from '@/components/ui/GlobalSearch';
import { NotificationCenter } from '@/components/ui/NotificationCenter';
import { setCurrentMember, cacheMembersFromApi } from '@/lib/currentMember';
import { loadAllDeals, fetchDeals } from '@/lib/dealsStore';
import { loadProductionCards, fetchProductionCards } from '@/lib/productionCards';
import type { UserRole } from '@/auth';

type CurrentUser = {
  id: string;
  name: string;
  role: 'president' | 'hq_member' | 'member';
  companyId: string;
  companyName: string;
  initial: string;
  color: string;
};

const USERS: Record<string, CurrentUser> = {
  toki:      { id: 'toki',      name: '土岐 公人',   role: 'president',   companyId: 'tripot', companyName: 'トライポット株式会社', initial: '土', color: 'bg-pink-500' },
  ono:       { id: 'ono',       name: '小野 崇',     role: 'hq_member',   companyId: 'tripot', companyName: 'トライポット株式会社', initial: '小', color: 'bg-indigo-500' },
};
const CU_STORAGE_KEY = 'tripot_current_user';
function loadCurrentUser(): CurrentUser {
  if (typeof window === 'undefined') return USERS.toki;
  const id = localStorage.getItem(CU_STORAGE_KEY) ?? 'toki';
  return USERS[id] ?? USERS.toki;
}

const MEMBER_COLORS = ['bg-pink-500', 'bg-emerald-500', 'bg-amber-500', 'bg-indigo-500', 'bg-teal-500', 'bg-blue-500', 'bg-purple-500', 'bg-rose-500'];

function useMembers() {
  const [members, setMembers] = useState<Array<{ id: string; name: string; initial: string; color: string }>>([]);
  useEffect(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => {
        const raw = (data.members ?? []).filter((m: { status?: string }) => m.status !== 'pending');
        const list = raw.map((m: { id: string; name: string }, i: number) => ({
          id: m.id,
          name: m.name,
          initial: m.name.charAt(0),
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
        }));
        setMembers(list);
        cacheMembersFromApi(raw);
      })
      .catch(() => {});
  }, []);
  return members;
}

const DEFAULT_QUOTES = [
  '打席に立たなければヒットは出ない。',
  '小さな一歩が、大きな案件を動かす。',
  '放置は最大の敵。今日連絡するだけで状況は変わる。',
  '行動量がKPIの源泉。量×質=結果。',
];

function getMemberKpi(memberId: string, idx: number) {
  return { revenue: 0, revenueTarget: 0, gross: 0, grossTarget: 0, meetings: 0, newDeals: 0, tasks: 0, urgent: 0, quote: DEFAULT_QUOTES[idx % DEFAULT_QUOTES.length], role: '' };
}

function getDateLabel(): string {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
}

function MemberContextPanel({ memberId }: { memberId: string }) {
  const allMembers = useMembers();
  const member = allMembers.find((m) => m.id === memberId);
  const memberIdx = allMembers.findIndex((m) => m.id === memberId);
  const meta = getMemberKpi(memberId, memberIdx);
  const [kpi, setKpi] = useState({ revenue: 0, revenueTarget: 0, gross: 0, grossTarget: 0, meetings: 0, newDeals: 0, tasks: 0, urgent: 0, quote: meta?.quote ?? '', role: meta?.role ?? '' });
  useEffect(() => {
    const computeAndSet = (deals: ReturnType<typeof loadAllDeals>, cards: ReturnType<typeof loadProductionCards>) => {
      const nameMap: Record<string, string> = {};
      const name = nameMap[memberId] ?? '';
      const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
      const myDeals = deals.filter((d) => d.assignee === name);
      const rev = myDeals.filter((d) => orderedStages.includes(d.stage)).reduce((s, d) => s + d.amount, 0);
      const gross = Math.round(rev * 0.457);
      const myTasks = cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === memberId && t.status !== 'done');
      setKpi((prev) => ({
        ...prev,
        revenue: Math.round(rev / 10000),
        gross: Math.round(gross / 10000),
        meetings: myDeals.filter((d) => d.stage === 'meeting').length,
        newDeals: myDeals.filter((d) => d.stage === 'lead').length,
        tasks: myTasks.length,
        urgent: myTasks.filter((t) => t.dueDate && t.dueDate < '2026-04-05').length,
      }));
    };
    const cachedCards = loadProductionCards();
    computeAndSet(loadAllDeals(), cachedCards);
    Promise.all([fetchDeals(), fetchProductionCards()]).then(([freshDeals, freshCards]) => computeAndSet(freshDeals, freshCards));
  }, [memberId]);
  if (!member) return null;
  const revPct = kpi.revenueTarget > 0 ? Math.round((kpi.revenue / kpi.revenueTarget) * 100) : 0;
  const grossPct = kpi.grossTarget > 0 ? Math.round((kpi.gross / kpi.grossTarget) * 100) : 0;
  return (
    <div className="px-3 pt-3 pb-4 border-b border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-full ${member.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
          {member.initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{member.name}</p>
          <p className="text-xs text-white/40 uppercase tracking-widest truncate">{kpi.role}</p>
        </div>
      </div>
      <p className="text-xs text-white/30 mb-3">{getDateLabel()}</p>
      <p className="text-[11px] text-white/40 italic mb-3 leading-relaxed">「{kpi.quote}」</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/5 rounded-lg px-2.5 py-2">
          <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">売上</p>
          <p className="text-base font-semibold text-white tabular-nums leading-tight mt-0.5">¥{kpi.revenue}<span className="text-xs text-white/50 ml-0.5">万</span></p>
          <p className="text-[9px] text-white/40 tabular-nums">{revPct}%</p>
        </div>
        <div className="bg-white/5 rounded-lg px-2.5 py-2">
          <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">粗利</p>
          <p className="text-base font-semibold text-white tabular-nums leading-tight mt-0.5">¥{kpi.gross}<span className="text-xs text-white/50 ml-0.5">万</span></p>
          <p className="text-[9px] text-white/40 tabular-nums">{grossPct}%</p>
        </div>
        <div className="bg-white/5 rounded-lg px-2.5 py-2">
          <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">商談</p>
          <p className="text-base font-semibold text-white tabular-nums leading-tight mt-0.5">{kpi.meetings}<span className="text-xs text-white/50 ml-0.5">件</span></p>
          <p className="text-[9px] text-white/40">新規 {kpi.newDeals}</p>
        </div>
        <div className="bg-white/5 rounded-lg px-2.5 py-2">
          <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest">残タスク</p>
          <p className={`text-base font-semibold tabular-nums leading-tight mt-0.5 ${kpi.urgent > 0 ? 'text-red-400' : 'text-white'}`}>{kpi.tasks}<span className="text-xs text-white/50 ml-0.5">件</span></p>
          <p className="text-[9px] text-white/40">至急 {kpi.urgent}</p>
        </div>
      </div>
    </div>
  );
}

const MonthlyIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const WeeklyIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ProductionIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const BudgetIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ApprovalIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CustomersIcon = () => (
  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const navLinkClass = (active: boolean) =>
  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
    active ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5 hover:text-white'
  }`;

const navIconClass = (active: boolean) =>
  `w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
    active ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white'
  }`;


const APPROVAL_COUNT = 0;


function AddMemberModal({ onClose }: { onClose: () => void }) {
  const [toast, setToast] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'member'>('member');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`${name}さんを招待しました`);
        setTimeout(() => { setToast(null); onClose(); }, 1500);
      } else {
        setToast(data.error ?? '招待に失敗しました');
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast('招待に失敗しました');
      setTimeout(() => setToast(null), 3000);
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">メンバーを招待</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="p-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              名前 <span className="text-red-600">*</span>
            </label>
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="山田 太郎" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Gmailアドレス <span className="text-red-600">*</span>
            </label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="example@gmail.com" />
            <p className="text-xs text-gray-500 mt-1">このGmailでログインできるようになります</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">権限</label>
            <select value={role} onChange={(e) => setRole(e.target.value as 'manager' | 'member')}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              <option value="member">メンバー（個人ダッシュボードのみ）</option>
              <option value="manager">マネージャー（週次・月次も閲覧可）</option>
            </select>
          </div>
          <button type="submit" disabled={submitting || !name || !email}
            className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors active:scale-[0.98]">
            {submitting ? '招待中...' : '招待する'}
          </button>
        </form>
      </div>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-lg shadow-sm z-[60]">
          {toast}
        </div>
      )}
    </div>
  );
}

function SidebarInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [memberSwitcherOpen, setMemberSwitcherOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const sessionMemberId = (session?.user as Record<string, unknown> | undefined)?.memberId as string | undefined;
  const sessionRole = (session?.user as Record<string, unknown> | undefined)?.role as UserRole | undefined;
  const currentUser = USERS[sessionMemberId ?? ''] ?? loadCurrentUser();
  const MEMBERS = useMembers();
  useEffect(() => {
    if (sessionMemberId) {
      localStorage.setItem(CU_STORAGE_KEY, sessionMemberId);
      setCurrentMember(sessionMemberId);
    }
  }, [sessionMemberId]);

  const isMonthly = pathname === '/monthly' || pathname.startsWith('/monthly/');
  const isWeekly = pathname === '/weekly' || pathname.startsWith('/weekly/');
  const isPersonalSection = pathname.startsWith('/home/');
  const isProduction = pathname === '/production';
  const isApproval = pathname === '/approval';
  // budget is accessed from monthly dashboard link, not sidebar
  const isCustomers = pathname === '/customers' || pathname.startsWith('/customers/');
  const isSettings = pathname === '/settings';

  const activeMemberId = isPersonalSection
    ? MEMBERS.find((m) => pathname.startsWith(`/home/${m.id}`))?.id ?? null
    : null;

  // URL の /home/[memberId] からカレントメンバーをlocalStorageに自動同期
  useEffect(() => {
    if (activeMemberId) {
      setCurrentMember(activeMemberId);
    }
  }, [activeMemberId]);

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setMemberSwitcherOpen(false);
      }
    };
    const clickHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-member-switcher]')) {
        setMemberSwitcherOpen(false);
      }
    };
    window.addEventListener('keydown', keyHandler);
    document.addEventListener('mousedown', clickHandler);
    return () => {
      window.removeEventListener('keydown', keyHandler);
      document.removeEventListener('mousedown', clickHandler);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside
        className={`hidden md:flex flex-col bg-[#1a1f36] text-white flex-shrink-0 transition-all duration-200 ${
          open ? 'w-56' : 'w-14'
        }`}
      >
        <div className={`flex items-center border-b border-white/10 ${open ? 'px-4 py-4' : 'px-0 py-4 justify-center'}`}>
          {open ? (
            <>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Image src="/logos/tripot.svg" alt="トライポット" width={28} height={28} className="shrink-0 rounded" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white/70 uppercase tracking-wider leading-none mb-0.5">Coaris AI</div>
                  <div className="text-sm font-semibold text-white leading-tight truncate">
                    {currentUser.companyName.replace('株式会社', '').trim()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <NotificationCenter
                  currentMemberId={currentUser.id}
                />
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setOpen(true)} title="サイドバーを開く">
              <Image src="/logos/tripot.svg" alt="トライポット" width={28} height={28} className="rounded" />
            </button>
          )}
        </div>

        {open && (
          <div className="px-2 pt-2 pb-0 border-b border-white/10 relative">
            <div className="w-full flex items-center gap-2 px-2 py-2">
              <div className={`w-7 h-7 rounded-full ${currentUser.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                {currentUser.initial}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white truncate leading-tight">{session?.user?.name ?? currentUser.name}</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="アクティブ" />
                </div>
                <div className="text-xs text-white/50 truncate leading-tight mt-0.5">
                  {sessionRole === 'owner' ? 'オーナー' : sessionRole === 'manager' ? 'マネージャー' : currentUser.role === 'president' ? '代表' : currentUser.role === 'hq_member' ? '本部' : 'メンバー'}
                </div>
              </div>
              {session && (
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  title="ログアウト"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}
        {open && (
          <div className="px-2 py-2 border-b border-white/10">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors text-sm"
            >
              <SearchIcon />
              <span className="flex-1 text-left">検索</span>
              <kbd className="text-xs text-white/30 bg-white/10 border border-white/20 rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
          </div>
        )}

        {!open && (
          <div className="px-0 py-2 border-b border-white/10 flex justify-center">
            <button
              onClick={() => setSearchOpen(true)}
              title="検索 (⌘K)"
              className={navIconClass(false)}
            >
              <SearchIcon />
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto">
          {open ? (
            <>
              <div className="px-2 pt-3 space-y-0.5">
              <div className="pt-1 pb-1 px-3">
                <span className="text-xs uppercase tracking-widest text-white/40">個人</span>
              </div>
              {MEMBERS.map((m) => (
                <div key={m.id}>
                  <Link
                    href={`/home/${m.id}`}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeMemberId === m.id
                        ? 'bg-white/10 text-white'
                        : 'text-white/75 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0`}>
                      {m.initial}
                    </div>
                    <span>{m.name}</span>
                  </Link>
                  {activeMemberId === m.id && (
                    <Link
                      href={`/home/${m.id}/deals`}
                      className="flex items-center gap-1.5 pl-12 pr-3 py-1 text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span className="text-white/40">→</span>
                      案件一覧
                    </Link>
                  )}
                </div>
              ))}
              <button onClick={() => setAddMemberOpen(true)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors w-full">
                <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center shrink-0">
                  <PlusIcon />
                </div>
                <span>メンバー追加</span>
              </button>

              <div className="border-t border-white/10 pt-3 mt-1">
                <Link href="/monthly" className={navLinkClass(isMonthly)}>
                  <MonthlyIcon /><span>月次ダッシュボード</span>
                </Link>
                <Link href="/weekly" className={navLinkClass(isWeekly)}>
                  <WeeklyIcon /><span>週次ダッシュボード</span>
                </Link>
                <Link href="/production" className={navLinkClass(isProduction)}>
                  <ProductionIcon /><span>制作ダッシュボード</span>
                </Link>
              </div>

              <div className="border-t border-white/10 pt-3 mt-1">
                <Link href="/approval" className={navLinkClass(isApproval)}>
                  <ApprovalIcon />
                  <span>申請</span>
                  {APPROVAL_COUNT > 0 && (
                    <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-xs font-semibold rounded-full tabular-nums">
                      {APPROVAL_COUNT}
                    </span>
                  )}
                </Link>
              </div>

              <div className="border-t border-white/10 pt-3 mt-1">
                <Link href="/customers" className={navLinkClass(isCustomers)}>
                  <CustomersIcon /><span>顧客</span>
                </Link>
                {sessionRole === 'owner' && (
                  <Link href="/settings?tab=members" className={navLinkClass(isSettings)}>
                    <SettingsIcon /><span>アカウント一覧</span>
                  </Link>
                )}
                <Link href="/guide" className={navLinkClass(pathname === '/guide')}>
                  <span className="w-5 h-5 flex items-center justify-center text-base">🗺️</span><span>はじめてガイド</span>
                </Link>
              </div>
              </div>
            </>
          ) : (
            <div className="px-2 py-3 space-y-0.5">
              {MEMBERS.map((m) => (
                <div key={m.id} className="flex justify-center">
                  <Link
                    href={`/home/${m.id}`}
                    title={m.name}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                      activeMemberId === m.id ? 'bg-white/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[11px] font-semibold text-white`}>
                      {m.initial}
                    </div>
                  </Link>
                </div>
              ))}
              <div className="border-t border-white/10 my-2" />
              <div className="flex justify-center">
                <Link href="/monthly" title="月次ダッシュボード" className={navIconClass(isMonthly)}><MonthlyIcon /></Link>
              </div>
              <div className="flex justify-center">
                <Link href="/weekly" title="週次ダッシュボード" className={navIconClass(isWeekly)}><WeeklyIcon /></Link>
              </div>
              <div className="flex justify-center">
                <Link href="/production" title="制作ダッシュボード" className={navIconClass(isProduction)}><ProductionIcon /></Link>
              </div>
              <div className="border-t border-white/10 my-2" />
              <div className="flex justify-center">
                <Link href="/approval" title="申請" className={navIconClass(isApproval)}><ApprovalIcon /></Link>
              </div>
              <div className="border-t border-white/10 my-2" />
              <div className="flex justify-center">
                <Link href="/customers" title="顧客" className={navIconClass(isCustomers)}><CustomersIcon /></Link>
              </div>
              {sessionRole === 'owner' && (
              <div className="flex justify-center">
                <Link href="/settings?tab=members" title="アカウント一覧" className={navIconClass(isSettings)}><SettingsIcon /></Link>
              </div>
              )}
              <div className="flex justify-center">
                <Link href="/guide" title="はじめてガイド" className={navIconClass(pathname === '/guide')}><span className="text-base">🗺️</span></Link>
              </div>
            </div>
          )}
        </nav>

        <div className="border-t border-white/10 relative" data-member-switcher>
          {memberSwitcherOpen && open && (
            <div className="absolute bottom-full left-3 right-3 mb-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">メンバーを切り替え</p>
              </div>
              {MEMBERS.map((m) => {
                const isCurrent = pathname.startsWith(`/home/${m.id}`);
                return (
                  <button
                    key={m.id}
                    onClick={() => { setMemberSwitcherOpen(false); setCurrentMember(m.id); router.push(`/home/${m.id}`); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors active:scale-[0.98] ${isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0`}>
                      {m.initial}
                    </div>
                    <span className="font-semibold">{m.name}</span>
                    {isCurrent && (
                      <svg className="w-4 h-4 ml-auto text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {open ? (
            <button
              onClick={() => setMemberSwitcherOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors active:scale-[0.98]"
              aria-label="メンバーを切り替える"
            >
              {(() => {
                const activeMember = MEMBERS.find(mb => pathname.startsWith(`/home/${mb.id}`));
                const displayMember = activeMember ?? currentUser;
                return (
                  <>
                    <div className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                      {displayMember.initial}
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="text-sm font-semibold text-white truncate">{displayMember.name}</div>
                      <div className="text-xs text-white/60 truncate">メンバーを切り替える</div>
                    </div>
                    <svg className={`w-4 h-4 text-white/40 shrink-0 transition-transform ${memberSwitcherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </>
                );
              })()}
            </button>
          ) : (
            <div className="flex justify-center py-3">
              <button
                onClick={() => setMemberSwitcherOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white active:scale-[0.98] transition-transform"
                aria-label="メンバーを切り替える"
              >
                {(() => { const m = MEMBERS.find(mb => pathname.startsWith(`/home/${mb.id}`)); return m ? m.initial : currentUser.initial; })()}
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden bg-[#1a1f36] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/logos/tripot.svg" alt="トライポット" width={24} height={24} className="rounded" />
            <div>
              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider leading-none">Coaris AI</div>
              <div className="text-sm font-semibold text-white leading-tight">
                {currentUser.companyName.replace('株式会社', '').trim()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <SearchIcon />
            </button>
            <NotificationCenter
              currentMemberId={currentUser.id}
            />
            <div className="relative" data-member-switcher>
              <button
                onClick={() => setMemberSwitcherOpen((v) => !v)}
                className={`w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white active:scale-[0.98] transition-transform`}
                aria-label="メンバーを切り替える"
              >
                {(() => { const m = MEMBERS.find(mb => pathname.startsWith(`/home/${mb.id}`)); return m ? m.initial : currentUser.initial; })()}
              </button>
              {memberSwitcherOpen && (
                <div className="absolute right-0 top-10 w-52 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">メンバーを切り替え</p>
                  </div>
                  {MEMBERS.map((m) => {
                    const isCurrent = pathname.startsWith(`/home/${m.id}`);
                    return (
                      <button
                        key={m.id}
                        onClick={() => { setMemberSwitcherOpen(false); setCurrentMember(m.id); router.push(`/home/${m.id}`); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors active:scale-[0.98] ${isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                      >
                        <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-[11px] font-semibold text-white shrink-0`}>
                          {m.initial}
                        </div>
                        <span className="font-semibold">{m.name}</span>
                        {isCurrent && (
                          <svg className="w-4 h-4 ml-auto text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex">
            {[
              { href: `/home/${currentUser.id}`, label: '個人', icon: (
                <div className={`w-5 h-5 rounded-full ${currentUser.color} flex items-center justify-center text-xs font-semibold text-white`}>
                  {currentUser.initial}
                </div>
              ), active: isPersonalSection },
              { href: '/monthly', label: '月次', icon: <MonthlyIcon />, active: isMonthly },
              { href: '/weekly', label: '週次', icon: <WeeklyIcon />, active: isWeekly },
              { href: '/production', label: '制作', icon: <ProductionIcon />, active: isProduction },
              { href: '/approval', label: '申請', icon: <ApprovalIcon />, active: isApproval },
            ].map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-semibold transition-colors min-h-[56px] justify-center ${
                  tab.active ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {addMemberOpen && <AddMemberModal onClose={() => setAddMemberOpen(false)} />}
      {searchOpen && (
        <GlobalSearch
          onSelect={() => {}}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex h-screen bg-gray-50">
        <aside className="hidden md:flex flex-col bg-[#1a1f36] w-56 flex-shrink-0" />
        <div className="flex-1" />
      </div>
    }>
      <SidebarInner>{children}</SidebarInner>
    </Suspense>
  );
}
