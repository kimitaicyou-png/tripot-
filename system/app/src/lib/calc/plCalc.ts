import type { Deal, ProductionCard } from '@/lib/stores/types';
import { safePercent } from '@/lib/safeMath';

const ORDERED_STAGES = new Set(['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid']);

export type PlRow = {
  label: string;
  budget: number;
  actual: number;
  ytdBudget: number;
  ytdActual: number;
  reverse: boolean;
  kind: 'flow' | 'fixed';
};

export function calcPl(deals: Deal[], cards: ProductionCard[]): PlRow[] {
  const ordered = deals.filter((d) => ORDERED_STAGES.has(d.stage));
  const shotRevenue = ordered.filter((d) => d.revenueType === 'shot').reduce((s, d) => s + (d.amount ?? 0), 0);
  const runningRevenue = ordered.filter((d) => d.revenueType === 'running').reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);
  const totalRevenue = shotRevenue + runningRevenue;

  const prodCost = cards.reduce((s, c) => s + c.tasks.reduce((a, t) => a + (t.estimatedCost ?? 0), 0), 0);
  const cogs = prodCost;
  const grossProfit = cogs > 0 ? totalRevenue - cogs : 0;
  const operatingProfit = grossProfit;
  const ordinaryProfit = operatingProfit;

  const r = (v: number) => Math.round(v / 10000);

  return [
    { label: '売上総利益（粗利）', budget: 0, actual: r(grossProfit), ytdBudget: 0, ytdActual: r(grossProfit), reverse: false, kind: 'flow' },
    { label: '営業利益', budget: 0, actual: r(operatingProfit), ytdBudget: 0, ytdActual: r(operatingProfit), reverse: false, kind: 'flow' },
    { label: '売上', budget: 0, actual: r(totalRevenue), ytdBudget: 0, ytdActual: r(totalRevenue), reverse: false, kind: 'flow' },
    { label: '売上原価', budget: 0, actual: r(cogs), ytdBudget: 0, ytdActual: r(cogs), reverse: true, kind: 'flow' },
    { label: '経常利益', budget: 0, actual: r(ordinaryProfit), ytdBudget: 0, ytdActual: r(ordinaryProfit), reverse: false, kind: 'flow' },
  ];
}

export function calcShotRunning(deals: Deal[]) {
  const ordered = deals.filter((d) => ORDERED_STAGES.has(d.stage));
  const shot = ordered.filter((d) => d.revenueType === 'shot').reduce((s, d) => s + (d.amount ?? 0), 0);
  const running = ordered.filter((d) => d.revenueType === 'running').reduce((s, d) => s + (d.monthlyAmount ?? 0), 0);
  const r = (v: number) => Math.round(v / 10000);
  return [
    { label: 'ショット売上', budget: 0, actual: r(shot) },
    { label: 'ランニング売上', budget: 0, actual: r(running) },
  ];
}
