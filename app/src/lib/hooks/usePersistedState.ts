'use client';

import { useState, useCallback } from 'react';

const PREFIX = 'tripot_';

export function usePersistedState<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const storageKey = `${PREFIX}${key}`;

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : defaultValue;
    } catch (err) {
      console.error(`usePersistedState load failed [${storageKey}]:`, err);
      return defaultValue;
    }
  });

  const setPersistedState = useCallback((v: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (err) {
        console.error(`usePersistedState save failed [${storageKey}]:`, err);
      }
      return next;
    });
  }, [storageKey]);

  return [state, setPersistedState];
}
