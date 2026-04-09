'use client';

import { useMemo } from 'react';
import type { Deal } from '@/lib/stores/types';
import { formatYen } from '@/lib/format';

type CfRow = {
  label: string;
  inflow: number;
  outflow: number;
  balance: number;
};

type Props = {
  deals: Deal[];
};

export function MonthlyCashFlow({ deals }: Props) {
  const cfData = useMemo(() => {
    const invoiced = deals.filter((d) => d.stage === 'invoiced' || d.stage === 'accounting');
    const paid = deals.filter((d) => d.stage === 'paid');
    const inflowExpected = invoiced.reduce((s, d) => s + d.amount, 0);
    const inflowReceived = paid.reduce((s, d) => s + d.amount, 0);
    const r = (v: number) => Math.round(v / 10000);

    const rows: CfRow[] = [
      { label: '入金済', inflow: r(inflowReceived), outflow: 0, balance: r(inflowReceived) },
      { label: '入金予定', inflow: r(inflowExpected), outflow: 0, balance: r(inflowReceived + inflowExpected) },
    ];
    return { rows, inflowReceived: r(inflowReceived), inflowExpected: r(inflowExpected), total: r(inflowReceived + inflowExpected) };
  }, [deals]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900">キャッシュフロー</h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">入金済</p>
          <p className="text-lg font-semibold text-emerald-600 tabular-nums mt-1">¥{cfData.inflowReceived.toLocaleString()}<span className="text-xs text-gray-500 ml-1">万</span></p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">入金予定</p>
          <p className="text-lg font-semibold text-blue-600 tabular-nums mt-1">¥{cfData.inflowExpected.toLocaleString()}<span className="text-xs text-gray-500 ml-1">万</span></p>
        </div>
        <div className="p-3 rounded-lg border border-gray-200 bg-white">
          <p className="text-xs text-gray-500">合計</p>
          <p className="text-lg font-semibold text-gray-900 tabular-nums mt-1">¥{cfData.total.toLocaleString()}<span className="text-xs text-gray-500 ml-1">万</span></p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 text-gray-500">
              <th className="text-left py-2 font-medium">区分</th>
              <th className="text-right py-2 font-medium">入金（万）</th>
              <th className="text-right py-2 font-medium">残高（万）</th>
            </tr>
          </thead>
          <tbody>
            {cfData.rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100">
                <td className="py-2 text-gray-700">{row.label}</td>
                <td className="py-2 text-right tabular-nums text-emerald-600">¥{row.inflow.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums text-gray-900 font-medium">¥{row.balance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
