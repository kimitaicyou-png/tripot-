'use client';

import { useEffect } from 'react';

export async function syncBudgetPlan(): Promise<void> {
  try {
    const r = await fetch('/api/budget');
    if (!r.ok) return;
    const data = await r.json();
    if (data.plan) {
      try { localStorage.setItem('budget_plan', JSON.stringify(data.plan)); } catch {}
    }
  } catch {}
}

export function useBudgetPlanSync() {
  useEffect(() => {
    syncBudgetPlan();
  }, []);
}
