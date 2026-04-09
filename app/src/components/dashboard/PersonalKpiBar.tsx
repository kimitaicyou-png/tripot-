'use client';

import type { Deal, ProductionCard } from '@/lib/stores/types';
import { formatYen } from '@/lib/format';
import { safePercent } from '@/lib/safeMath';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);
const GROSS_RATE = 0.457;

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
  memberName: string;
  memberId: string;
};

export function PersonalKpiBar({ deals, cards, memberName, memberId }: Props) {
  const myDeals = deals.filter((d) => d.assignee === memberName);
  const myOrdered = myDeals.filter((d) => ORDERED_STAGES.has(d.stage));
  const revenue = myOrdered.reduce((s, d) => s + d.amount, 0);
  const grossProfit = Math.round(revenue * GROSS_RATE);
  const meetings = myDeals.filter((d) => d.stage === 'meeting').length;
  const leads = myDeals.filter((d) => d.stage === 'lead').length;
  const myTasks = cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === memberId && t.status !== 'done');
  const today = new Date().toISOString().slice(0, 10);
  const urgentTasks = myTasks.filter((t) => t.dueDate && t.dueDate < today);

  const items = [
    { label: '売上', value: formatYen(revenue), sub: `粗利 ${formatYen(grossProfit)}` },
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
