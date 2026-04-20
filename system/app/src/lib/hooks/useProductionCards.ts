'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProductionCard, ProductionCardTask, Phase } from '@/lib/stores/types';
import {
  loadCards, addCard as addCardStore, updateCard as updateCardStore,
  updateTask as updateTaskStore, addTask as addTaskStore, removeTask as removeTaskStore,
  movePhase as movePhaseStore, removeCard as removeCardStore,
} from '@/lib/stores/productionStore';

export function useProductionCards() {
  const [cards, setCards] = useState<ProductionCard[]>([]);

  useEffect(() => {
    setCards(loadCards());
  }, []);

  const refresh = useCallback(() => setCards(loadCards()), []);

  const add = useCallback((card: ProductionCard) => {
    addCardStore(card);
    refresh();
  }, [refresh]);

  const update = useCallback((id: string, patch: Partial<ProductionCard>) => {
    updateCardStore(id, patch);
    refresh();
  }, [refresh]);

  const updateTask = useCallback((cardId: string, taskId: string, patch: Partial<ProductionCardTask>) => {
    updateTaskStore(cardId, taskId, patch);
    refresh();
  }, [refresh]);

  const addTask = useCallback((cardId: string, task: ProductionCardTask) => {
    addTaskStore(cardId, task);
    refresh();
  }, [refresh]);

  const removeTask = useCallback((cardId: string, taskId: string) => {
    removeTaskStore(cardId, taskId);
    refresh();
  }, [refresh]);

  const moveToPhase = useCallback((cardId: string, phase: Phase) => {
    movePhaseStore(cardId, phase);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    removeCardStore(id);
    refresh();
  }, [refresh]);

  return { cards, add, update, updateTask, addTask, removeTask, moveToPhase, remove, refresh };
}
