'use client';

import type { Deal, ProductionCard } from '@/lib/stores/types';

type ActionItem = {
  id: string;
  content: string;
  client: string;
  dueLabel: string;
  priority: 'urgent' | 'today' | 'upcoming';
  source: 'deal' | 'production';
};

function buildDueLabel(dateStr: string): { dueLabel: string; priority: ActionItem['priority'] } {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { dueLabel: `${Math.abs(diff)}日超過`, priority: 'urgent' };
  if (diff === 0) return { dueLabel: '今日', priority: 'today' };
  if (diff === 1) return { dueLabel: '明日', priority: 'upcoming' };
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return { dueLabel: `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`, priority: 'upcoming' };
}

type Props = {
  deals: Deal[];
  cards: ProductionCard[];
  memberName: string;
  memberId: string;
};

export function PersonalActionList({ deals, cards, memberName, memberId }: Props) {
  const actions: ActionItem[] = [];

  for (const d of deals.filter((d) => d.assignee === memberName)) {
    if (d.process?.tasks) {
      for (const t of d.process.tasks) {
        if (t.dueDate && t.internalMemberId === memberId) {
          const { dueLabel, priority } = buildDueLabel(t.dueDate);
          actions.push({
            id: `deal_${d.id}_${t.id}`,
            content: t.title,
            client: d.clientName,
            dueLabel,
            priority,
            source: 'deal',
          });
        }
      }
    }
  }

  for (const c of cards) {
    for (const t of c.tasks) {
      if (t.assigneeId === memberId && t.status !== 'done' && t.dueDate) {
        const { dueLabel, priority } = buildDueLabel(t.dueDate);
        actions.push({
          id: `prod_${c.id}_${t.id}`,
          content: t.title,
          client: c.clientName,
          dueLabel,
          priority,
          source: 'production',
        });
      }
    }
  }

  const sorted = actions.sort((a, b) => {
    const order = { urgent: 0, today: 1, upcoming: 2 };
    return order[a.priority] - order[b.priority];
  });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">期限のあるタスクはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {sorted.slice(0, 10).map((action) => (
        <div key={action.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            action.priority === 'urgent' ? 'bg-red-500' : action.priority === 'today' ? 'bg-amber-500' : 'bg-gray-300'
          }`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 truncate">{action.content}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="truncate">{action.client}</span>
              {action.source === 'production' && (
                <span className="bg-blue-50 text-blue-700 border border-blue-200 rounded px-1 py-0.5 text-[10px] shrink-0">制作</span>
              )}
            </div>
          </div>
          <span className={`text-xs shrink-0 tabular-nums ${
            action.priority === 'urgent' ? 'text-red-600 font-medium' : 'text-gray-500'
          }`}>
            {action.dueLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
