'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { loadAllDeals, fetchDeals } from '@/lib/dealsStore';
import { loadProductionCards, fetchProductionCards } from '@/lib/productionCards';

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeKpi(deals: ReturnType<typeof loadAllDeals>, cards: ReturnType<typeof loadProductionCards>, memberId: string, memberName: string) {
  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const myDeals = memberName ? deals.filter((d) => d.assignee === memberName) : [];
  const myOrdered = myDeals.filter((d) => orderedStages.includes(d.stage));
  const rev = myOrdered.reduce((s, d) => {
    const running = (d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0;
    return s + num(d.amount) + running;
  }, 0);
  const myDealIds = new Set(myOrdered.map((d) => d.id));
  const myCost = cards
    .filter((c) => myDealIds.has(c.dealId))
    .reduce((s, c) => s + c.tasks.reduce((a, t) => a + num(t.estimatedCost), 0), 0);
  const gross = myCost > 0 ? rev - myCost : null;
  const meetings = myDeals.filter((d) => d.stage === 'meeting').length;
  const newDeals = myDeals.filter((d) => d.stage === 'lead').length;
  const today = new Date().toISOString().slice(0, 10);
  const myTasks = cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === memberId && t.status !== 'done');
  const urgent = myTasks.filter((t) => t.dueDate && t.dueDate < today).length;
  return { revenue: Math.round(rev / 10000), revenueTarget: 0, gross: gross !== null ? Math.round(gross / 10000) : null, grossTarget: 0, meetings, newDeals, tasks: myTasks.length, urgent };
}

function useMemberKpi(memberId: string) {
  const [kpi, setKpi] = useState<{ revenue: number; revenueTarget: number; gross: number | null; grossTarget: number; meetings: number; newDeals: number; tasks: number; urgent: number }>({ revenue: 0, revenueTarget: 0, gross: null, grossTarget: 0, meetings: 0, newDeals: 0, tasks: 0, urgent: 0 });
  useEffect(() => {
    let memberName = '';
    fetch('/api/members')
      .then((r) => r.json())
      .then((d) => {
        const found = (d.members ?? []).find((m: { id: string; name: string }) => m.id === memberId);
        memberName = found?.name ?? '';
        const deals = loadAllDeals();
        const cards = loadProductionCards();
        setKpi(computeKpi(deals, cards, memberId, memberName));
        Promise.all([fetchDeals(), fetchProductionCards()]).then(([freshDeals, freshCards]) => setKpi(computeKpi(freshDeals, freshCards, memberId, memberName)));
      })
      .catch(() => {
        const deals = loadAllDeals();
        const cards = loadProductionCards();
        setKpi(computeKpi(deals, cards, memberId, ''));
      });
  }, [memberId]);
  return kpi;
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const memberId = params.memberId as string;
  const pathname = usePathname();

  const MEMBERS: Record<string, { name: string; company: string }> = {};

  const member = MEMBERS[memberId] ?? { name: memberId, company: '' };
  const kpi = useMemberKpi(memberId);

  const tabs = [
    { href: `/home/${memberId}`, label: 'ダッシュボード', exact: true },
    { href: `/home/${memberId}/attack`, label: 'アタック' },
    { href: `/home/${memberId}/deals`, label: '案件管理' },
    { href: `/home/${memberId}/production`, label: '制作マイタスク' },
  ];

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  const revPct = kpi.revenueTarget > 0 ? Math.round((kpi.revenue / kpi.revenueTarget) * 100) : 0;
  const grossPct = kpi.grossTarget > 0 && kpi.gross !== null ? Math.round((kpi.gross / kpi.grossTarget) * 100) : 0;

  return (
    <div>
      <div className="px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-gray-900">{member.name}</p>
        <p className="text-xs text-gray-500">{member.company}</p>
      </div>

      <div className="flex items-center justify-between border-b border-gray-200 px-4 gap-4 flex-wrap">
        <div className="flex">
          {tabs.map(tab => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
                isActive(tab.href, tab.exact)
                  ? 'text-gray-900 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-700'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {kpi && (
          <div className="hidden md:flex items-center gap-5 py-1.5 ml-auto">
            <div className="text-right">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest leading-none">今月売上</p>
              <p className="text-base font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">¥{kpi.revenue}<span className="text-xs text-gray-500 ml-0.5">万</span></p>
              <p className="text-[9px] text-gray-500 tabular-nums leading-none">{revPct}%</p>
            </div>
            <div className="w-px h-9 bg-gray-200" />
            <div className="text-right">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest leading-none">今月粗利</p>
              <p className="text-base font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">{kpi.gross !== null ? <>¥{kpi.gross}<span className="text-xs text-gray-500 ml-0.5">万</span></> : <span className="text-xs text-gray-400">原価未登録</span>}</p>
              <p className="text-[9px] text-gray-500 tabular-nums leading-none">{kpi.gross !== null ? `${grossPct}%` : '—'}</p>
            </div>
            <div className="w-px h-9 bg-gray-200" />
            <div className="text-right">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest leading-none">商談</p>
              <p className="text-base font-semibold text-gray-900 tabular-nums leading-tight mt-0.5">{kpi.meetings}</p>
              <p className="text-[9px] text-gray-500 leading-none">新規 {kpi.newDeals}</p>
            </div>
            <div className="w-px h-9 bg-gray-200" />
            <div className="text-right">
              <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest leading-none">残タスク</p>
              <p className={`text-base font-semibold tabular-nums leading-tight mt-0.5 ${kpi.urgent > 0 ? 'text-red-600' : 'text-gray-900'}`}>{kpi.tasks}</p>
              <p className="text-[9px] text-gray-500 leading-none">至急 {kpi.urgent}</p>
            </div>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
