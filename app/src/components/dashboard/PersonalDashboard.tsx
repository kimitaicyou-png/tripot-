'use client';

import { useMemo } from 'react';
import type { Deal, ProductionCard } from '@/lib/stores/types';
import type { MemberInfo } from '@/lib/stores/types';
import { PersonalActionList } from './PersonalActionList';
import { STAGE_LABEL, STAGE_BADGE } from '@/lib/constants/stages';
import { formatYen } from '@/lib/format';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);
const SALES_STAGES = new Set(['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation']);

type Props = {
  member: MemberInfo;
  deals: Deal[];
  cards: ProductionCard[];
};

export function PersonalDashboard({ member, deals, cards }: Props) {
  const myDeals = useMemo(() => deals.filter((d) => d.assignee === member.name), [deals, member.name]);
  const myCards = useMemo(() => cards.filter((c) => c.pmId === member.id || c.teamMemberIds.includes(member.id)), [cards, member.id]);
  const myTasks = useMemo(() => cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === member.id), [cards, member.id]);

  const pipeline = myDeals.filter((d) => SALES_STAGES.has(d.stage));
  const ordered = myDeals.filter((d) => ORDERED_STAGES.has(d.stage));
  const activeTasks = myTasks.filter((t) => t.status !== 'done');
  const doneTasks = myTasks.filter((t) => t.status === 'done');

  const dateStr = (() => {
    const d = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  })();

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-xs text-gray-500">{dateStr}</p>
        <h2 className="text-lg font-semibold text-gray-900 mt-1">{member.name} のダッシュボード</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
          <p className="text-xs text-gray-500">パイプライン</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{pipeline.length}<span className="text-sm text-gray-500 ml-1">件</span></p>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{formatYen(pipeline.reduce((s, d) => s + d.amount, 0))}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
          <p className="text-xs text-gray-500">受注済</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{ordered.length}<span className="text-sm text-gray-500 ml-1">件</span></p>
          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">{formatYen(ordered.reduce((s, d) => s + d.amount, 0))}</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
          <p className="text-xs text-gray-500">制作タスク</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{activeTasks.length}<span className="text-sm text-gray-500 ml-1">残</span></p>
          <p className="text-xs text-gray-500 mt-0.5">完了 {doneTasks.length}件</p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 shadow-sm bg-white">
          <p className="text-xs text-gray-500">担当案件</p>
          <p className="text-xl font-semibold text-gray-900 tabular-nums mt-1">{myCards.length}<span className="text-sm text-gray-500 ml-1">件</span></p>
          <p className="text-xs text-gray-500 mt-0.5">稼働中</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">今日のアクション</h3>
          <PersonalActionList deals={deals} cards={cards} memberName={member.name} memberId={member.id} />
        </div>

        <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">直近の案件（{myDeals.slice(0, 5).length}件）</h3>
          {myDeals.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">担当案件がありません</p>
          ) : (
            <div className="space-y-2">
              {myDeals.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{d.dealName}</p>
                    <p className="text-xs text-gray-500">{d.clientName}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${STAGE_BADGE[d.stage]}`}>
                    {STAGE_LABEL[d.stage]}
                  </span>
                  <span className="text-xs text-gray-700 tabular-nums shrink-0">{formatYen(d.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
