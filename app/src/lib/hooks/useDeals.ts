'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Deal } from '@/lib/stores/types';
import { loadDeals, saveDeals, addDeal as addDealStore, updateDeal as updateDealStore, removeDeal as removeDealStore } from '@/lib/stores/dealsStore';

export function useDeals() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    setDeals(loadDeals());
  }, []);

  const refresh = useCallback(() => setDeals(loadDeals()), []);

  const add = useCallback((deal: Deal) => {
    addDealStore(deal);
    refresh();
  }, [refresh]);

  const update = useCallback((id: string, patch: Partial<Deal>) => {
    updateDealStore(id, patch);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    removeDealStore(id);
    refresh();
  }, [refresh]);

  const save = useCallback((newDeals: Deal[]) => {
    saveDeals(newDeals);
    setDeals(newDeals);
  }, []);

  return { deals, add, update, remove, save, refresh };
}
