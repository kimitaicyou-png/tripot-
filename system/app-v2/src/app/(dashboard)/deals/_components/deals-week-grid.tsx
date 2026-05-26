/**
 * 案件グリッド view（旧「月別週グリッド」、隊長明示 2026-05-27 02:02 で週列を廃止）
 *
 * 「グリッド自体はいい、日にちの部分はいらん」直撃。
 * sticky 左カラム + table 形式は残し、12 週カラムを削除。
 * 案件 / 顧客 / 担当 / 確度 / 段階 / 金額 が触れる table として残る。
 */

import Link from 'next/link';
import { InlineStageChanger } from '../[dealId]/_components/inline-stage-changer';
import { InlineConfidenceSelect } from './inline-confidence-select';
import { InlineAmountInput } from './inline-amount-input';
import { InlineAssigneeSelect, type MemberOption } from './inline-assignee-select';
import type { WeekGridDeal } from '@/lib/deals/week-grid';

export function DealsWeekGrid({
  deals,
  members,
}: {
  deals: WeekGridDeal[];
  members: MemberOption[];
}) {
  if (deals.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
        <p className="text-sm text-gray-700">表示する案件がありません。</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th
                className="sticky left-0 z-20 bg-gray-50 px-3 py-2 text-left text-[11px] font-medium text-gray-700 border-r border-gray-200"
                style={{ minWidth: 240 }}
              >
                案件
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-700" style={{ minWidth: 120 }}>
                顧客
              </th>
              <th className="px-2 py-2 text-left text-[11px] font-medium text-gray-700" style={{ minWidth: 110 }}>
                担当
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-700" style={{ minWidth: 68 }}>
                確度
              </th>
              <th className="px-2 py-2 text-center text-[11px] font-medium text-gray-700" style={{ minWidth: 100 }}>
                段階
              </th>
              <th className="px-2 py-2 text-right text-[11px] font-medium text-gray-700" style={{ minWidth: 120 }}>
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {deals.map((deal, i) => (
              <tr
                key={deal.id}
                className={`border-b border-gray-100 hover:bg-slate-50 ${
                  i % 2 === 1 ? 'bg-gray-50/30' : ''
                }`}
              >
                <td
                  className="sticky left-0 z-10 bg-white px-3 py-2 border-r border-gray-200"
                  style={{ minWidth: 240 }}
                >
                  <Link
                    href={`/deals/${deal.id}`}
                    className="text-xs text-gray-900 font-medium truncate block max-w-[220px] hover:underline decoration-gray-400"
                  >
                    {deal.title}
                  </Link>
                </td>
                <td className="px-2 py-2 text-[11px] text-gray-700 truncate" style={{ maxWidth: 140 }}>
                  {deal.customer_name ?? '—'}
                </td>
                <td className="px-2 py-2 text-[11px]" style={{ maxWidth: 130 }}>
                  <InlineAssigneeSelect dealId={deal.id} initial={deal.assignee_id} members={members} />
                </td>
                <td className="px-2 py-2 text-center">
                  <InlineConfidenceSelect dealId={deal.id} initial={deal.subjective_confidence} />
                </td>
                <td className="px-2 py-2 text-center">
                  <InlineStageChanger dealId={deal.id} currentStage={deal.stage} />
                </td>
                <td className="px-2 py-2 text-right">
                  <InlineAmountInput dealId={deal.id} initialAmount={deal.amount} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
