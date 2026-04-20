'use client';

import type { Deal, ProductionCard } from '@/lib/stores/types';
import { formatYen } from '@/lib/format';
import { matchesAssignee } from '@/lib/dealsStore';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
  memberName: string;
  memberId: string;
};

export function PersonalKpiBar({ deals, cards, memberName, memberId }: Props) {
  const myDeals = memberName ? deals.filter((d) => matchesAssignee(d.assignee, memberName)) : [];
  const myOrdered = myDeals.filter((d) => ORDERED_STAGES.has(d.stage));
  const revenue = myOrdered.reduce((s, d) => {
    const running = (d.revenueType === 'running' || d.revenueType === 'both') ? num(d.monthlyAmount) : 0;
    return s + num(d.amount) + running;
  }, 0);
  const myDealIds = new Set(myOrdered.map((d) => d.id));
  const myCost = cards
    .filter((c) => myDealIds.has(c.dealId))
    .reduce((s, c) => s + c.tasks.reduce((a, t) => a + num(t.estimatedCost), 0), 0);
  const grossProfit = myCost > 0 ? revenue - myCost : null;
  const meetings = myDeals.filter((d) => d.stage === 'meeting').length;
  const leads = myDeals.filter((d) => d.stage === 'lead').length;
  const myTasks = cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === memberId && t.status !== 'done');
  const today = new Date().toISOString().slice(0, 10);
  const urgentTasks = myTasks.filter((t) => t.dueDate && t.dueDate < today);

  const items = [
    { label: '売上', value: formatYen(revenue), sub: grossProfit !== null ? `粗利 ${formatYen(grossProfit)}` : '粗利 ー（原価未登録）' },
    { label: '商談', value: `${meetings}`, sub: `新規 ${leads}` },
    { label: '残タスク', value: `${myTasks.length}`, sub: urgentTasks.length > 0 ? `至急 ${urgentTasks.length}` : '', urgent: urgentTasks.length > 0 },
  ];

  return (
    <div className="flex items-center gap-5">
      {items.map((item, i) => (
        <div key={item.label} className="flex items-center gap-5">
          {i > 0 && <div className="w-px h-9 bg-gray-200" />}
          <div className="text-right">
            <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{item.label}</p>
            <p className={`text-base font-semibold tabular-nums ${item.urgent ? 'text-red-600' : 'text-gray-900'}`}>{item.value}</p>
            {item.sub && <p className="text-[10px] text-gray-500">{item.sub}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
