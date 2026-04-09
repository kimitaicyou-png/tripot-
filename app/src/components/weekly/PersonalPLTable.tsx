export type MemberPL = {
  name: string;
  shotRevenue: number;
  runningRevenue: number;
  cost: number;
};

type Props = {
  members: MemberPL[];
};

// TODO: company.ts の calculateMemberActuals('2026-04') から取得する
export const MOCK_MEMBER_PL: MemberPL[] = [
  { name: '柏樹 久美子', shotRevenue: 3500000, runningRevenue: 300000, cost: 2063400 },
  { name: '犬飼 智之',   shotRevenue: 4200000, runningRevenue:      0, cost: 2280600 },
  { name: '和泉 阿委璃', shotRevenue: 2270000, runningRevenue: 230000, cost: 1355550 },
];

function formatJPY(value: number): string {
  const man = value / 10000;
  return `¥${man.toLocaleString('ja-JP')}万`;
}

function grossProfitColor(rate: number): string {
  if (rate >= 40) return 'text-blue-600';
  if (rate < 30) return 'text-red-600';
  return 'text-gray-800';
}

export function PersonalPLTable({ members }: Props) {
  const rows = members.map((m) => {
    const totalRevenue = m.shotRevenue + m.runningRevenue;
    const grossProfit = totalRevenue - m.cost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    return { ...m, totalRevenue, grossProfit, grossMargin };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      shotRevenue: acc.shotRevenue + r.shotRevenue,
      runningRevenue: acc.runningRevenue + r.runningRevenue,
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      cost: acc.cost + r.cost,
      grossProfit: acc.grossProfit + r.grossProfit,
    }),
    { shotRevenue: 0, runningRevenue: 0, totalRevenue: 0, cost: 0, grossProfit: 0 }
  );

  const totalMargin =
    totals.totalRevenue > 0 ? (totals.grossProfit / totals.totalRevenue) * 100 : 0;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            {[
              'メンバー',
              'ショット売上',
              'ランニング売上',
              '合計売上',
              'コスト',
              '粗利',
              '粗利率',
            ].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider text-right first:text-left whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.name}</td>
              <td className="px-3 py-2 tabular-nums text-right font-medium text-gray-800">
                {formatJPY(r.shotRevenue)}
              </td>
              <td className="px-3 py-2 tabular-nums text-right font-medium text-gray-800">
                {formatJPY(r.runningRevenue)}
              </td>
              <td className="px-3 py-2 tabular-nums text-right font-medium text-gray-800">
                {formatJPY(r.totalRevenue)}
              </td>
              <td className="px-3 py-2 tabular-nums text-right font-medium text-gray-800">
                {formatJPY(r.cost)}
              </td>
              <td className="px-3 py-2 tabular-nums text-right font-medium text-gray-800">
                {formatJPY(r.grossProfit)}
              </td>
              <td className={`px-3 py-2 tabular-nums text-right font-medium ${grossProfitColor(r.grossMargin)}`}>
                {Math.round(r.grossMargin)}%
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 font-semibold">
            <td className="px-3 py-2 text-gray-800">合計</td>
            <td className="px-3 py-2 tabular-nums text-right text-gray-800">
              {formatJPY(totals.shotRevenue)}
            </td>
            <td className="px-3 py-2 tabular-nums text-right text-gray-800">
              {formatJPY(totals.runningRevenue)}
            </td>
            <td className="px-3 py-2 tabular-nums text-right text-gray-800">
              {formatJPY(totals.totalRevenue)}
            </td>
            <td className="px-3 py-2 tabular-nums text-right text-gray-800">
              {formatJPY(totals.cost)}
            </td>
            <td className="px-3 py-2 tabular-nums text-right text-gray-800">
              {formatJPY(totals.grossProfit)}
            </td>
            <td className={`px-3 py-2 tabular-nums text-right ${grossProfitColor(totalMargin)}`}>
              {Math.round(totalMargin)}%
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
