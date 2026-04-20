export type BudgetAlert = {
  level: 'info' | 'warning' | 'danger';
  label: string;
  budget: number;
  actual: number;
  diffPct: number;
};

export function checkBudgetVariance(
  label: string,
  budget: number,
  actual: number,
  options?: { reverse?: boolean; dangerThresholdPct?: number; warningThresholdPct?: number }
): BudgetAlert | null {
  if (budget === 0) return null;
  const { reverse = false, dangerThresholdPct = 15, warningThresholdPct = 5 } = options ?? {};
  const diff = actual - budget;
  const diffPct = Math.round((diff / budget) * 100);

  const adverse = reverse ? diffPct > 0 : diffPct < 0;
  if (!adverse) return null;

  const absDiff = Math.abs(diffPct);
  const level: BudgetAlert['level'] = absDiff >= dangerThresholdPct ? 'danger' : absDiff >= warningThresholdPct ? 'warning' : 'info';
  if (level === 'info') return null;

  return { level, label, budget, actual, diffPct };
}

export function collectBudgetAlerts(args: {
  budgetRevenue: number;
  actualRevenue: number;
  budgetGross: number;
  actualGross: number;
  budgetOp: number;
  actualOp: number;
  budgetSga: number;
  actualSga: number;
}): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  const a1 = checkBudgetVariance('売上', args.budgetRevenue, args.actualRevenue);
  const a2 = checkBudgetVariance('粗利', args.budgetGross, args.actualGross);
  const a3 = checkBudgetVariance('営業利益', args.budgetOp, args.actualOp);
  const a4 = checkBudgetVariance('販管費', args.budgetSga, args.actualSga, { reverse: true });
  for (const a of [a1, a2, a3, a4]) if (a) alerts.push(a);
  return alerts;
}
