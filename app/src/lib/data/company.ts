import type { Deal, Member, MonthlyTarget, MonthlyActual, MemberActual } from './types';

export const COMPANY = {
  id: 'tripot',
  name: 'トライポット株式会社',
  logo: '/logos/tripot.svg',
};

export const MEMBERS: Member[] = [];

export const MONTHLY_TARGETS: Record<string, MonthlyTarget> = {
  '2026-04': {
    revenue:          12000000,
    cogs:              6480000,
    grossProfit:       5520000,
    sga:               3500000,
    operatingProfit:   2020000,
    ordinaryProfit:    1920000,
  },
};

export const DEALS: Deal[] = [];

export function calculateShotRevenue(deals: Deal[], month: string): number {
  return deals
    .filter((d) => d.revenueType === 'shot')
    .filter((d) => ['ordered', 'invoiced', 'paid'].includes(d.stage))
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
}

export function calculateRunningRevenue(deals: Deal[], month: string): number {
  return deals
    .filter((d) => d.revenueType === 'running' && d.stage === 'ordered')
    .filter((d) => d.runningStartDate != null && d.runningStartDate <= month)
    .reduce((sum, d) => sum + (d.monthlyAmount ?? 0), 0);
}

export function calculateMonthlyActual(month: string, sgaOverride?: number): MonthlyActual {
  const shotRevenue     = calculateShotRevenue(DEALS, month);
  const runningRevenue  = calculateRunningRevenue(DEALS, month);
  const totalRevenue    = shotRevenue + runningRevenue;
  const cogs            = Math.round(totalRevenue * 0.543);
  const grossProfit     = totalRevenue - cogs;
  const grossMarginRate = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const target          = MONTHLY_TARGETS[month];
  const sga             = sgaOverride ?? target?.sga ?? 3200000;
  const operatingProfit = grossProfit - sga;
  const ordinaryProfit  = operatingProfit - 100000;

  return {
    shotRevenue,
    runningRevenue,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginRate,
    sga,
    operatingProfit,
    ordinaryProfit,
  };
}

export function calculateMemberActuals(month: string): MemberActual[] {
  const memberNames: string[] = [];

  return memberNames.map((name) => {
    const memberDeals = DEALS.filter((d) => d.assignee === name);
    const shotRevenue     = calculateShotRevenue(memberDeals, month);
    const runningRevenue  = calculateRunningRevenue(memberDeals, month);
    const totalRevenue    = shotRevenue + runningRevenue;
    const cost            = Math.round(totalRevenue * 0.543);
    const grossProfit     = totalRevenue - cost;
    const grossMarginRate = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const member          = MEMBERS.find((m) => m.name === name);

    return {
      memberId: member?.id ?? name,
      memberName: name,
      shotRevenue,
      runningRevenue,
      totalRevenue,
      cost,
      grossProfit,
      grossMarginRate,
    };
  });
}

export function checkDataConsistency(month: string): void {
  const actual  = calculateMonthlyActual(month);
  const members = calculateMemberActuals(month);
  const target  = MONTHLY_TARGETS[month];

  const memberTotalRevenue    = members.reduce((s, m) => s + m.totalRevenue, 0);
  const memberTotalGrossProfit = members.reduce((s, m) => s + m.grossProfit, 0);

  console.log(`=== データ整合チェック (${month}) ===`);
  console.log(`会社PL 総売上:  ¥${actual.totalRevenue.toLocaleString()}`);
  console.log(`個人別 総売上:  ¥${memberTotalRevenue.toLocaleString()}`);
  console.log(`差異（売上）:   ¥${(memberTotalRevenue - actual.totalRevenue).toLocaleString()}`);
  console.log(`会社PL 粗利:    ¥${actual.grossProfit.toLocaleString()}`);
  console.log(`個人別 粗利計:  ¥${memberTotalGrossProfit.toLocaleString()}`);
  console.log(`差異（粗利）:   ¥${(memberTotalGrossProfit - actual.grossProfit).toLocaleString()}`);
  if (target) {
    console.log(`目標 売上:      ¥${target.revenue.toLocaleString()}`);
    console.log(`目標 粗利:      ¥${target.grossProfit.toLocaleString()}`);
  }
}
