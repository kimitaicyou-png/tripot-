export type CfInputs = {
  currentCash: number;
  arDays: number;
  apDays: number;
  loanMonthlyRepayment: number;
  taxRate: number;
  monthlyRevenue: number[];
  monthlyCogs: number[];
  monthlySga: number[];
};

export type CfWeek = {
  weekIdx: number;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
  alert: 'safe' | 'caution' | 'danger';
};

export function simulate13WeekCf(inputs: CfInputs): CfWeek[] {
  const weeks: CfWeek[] = [];
  const weekFactor = 7 / 30;

  const arLagWeeks = Math.round((inputs.arDays / 7));
  const apLagWeeks = Math.round((inputs.apDays / 7));

  let balance = inputs.currentCash;
  const startDate = new Date();
  const currentMonthIdx = startDate.getMonth();

  for (let w = 0; w < 13; w++) {
    const weekDate = new Date(startDate);
    weekDate.setDate(startDate.getDate() + w * 7);
    const monthOfWeek = (currentMonthIdx + Math.floor(w / 4)) % 12;
    const fiscalMonthIdx = monthOfWeek;

    const revenueThisMonth = inputs.monthlyRevenue[fiscalMonthIdx] ?? 0;
    const cogsThisMonth = inputs.monthlyCogs[fiscalMonthIdx] ?? 0;
    const sgaThisMonth = inputs.monthlySga[fiscalMonthIdx] ?? 0;

    const inflowWeekly = Math.round(revenueThisMonth * weekFactor);
    const cogsOutWeekly = Math.round(cogsThisMonth * weekFactor);
    const sgaOutWeekly = Math.round(sgaThisMonth * weekFactor);
    const loanOutWeekly = w % 4 === 0 ? inputs.loanMonthlyRepayment : 0;

    const adjInflow = w >= arLagWeeks ? inflowWeekly : 0;
    const adjCogsOut = w >= apLagWeeks ? cogsOutWeekly : 0;

    const outflow = adjCogsOut + sgaOutWeekly + loanOutWeekly;
    const net = adjInflow - outflow;
    balance += net;

    const label = `W${w + 1} (${weekDate.getMonth() + 1}/${weekDate.getDate()})`;
    const alert: CfWeek['alert'] = balance < 0 ? 'danger' : balance < inputs.currentCash * 0.3 ? 'caution' : 'safe';

    weeks.push({ weekIdx: w, label, inflow: adjInflow, outflow, net, balance, alert });
  }

  return weeks;
}

export function calcEffectiveTax(operatingProfit: number, taxRate: number): number {
  if (operatingProfit <= 0) return 0;
  return Math.round(operatingProfit * taxRate);
}
