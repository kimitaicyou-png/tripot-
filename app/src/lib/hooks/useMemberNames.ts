'use client';

import { useState, useEffect } from 'react';

type MemberEntry = { id: string; name: string };

const CACHE_KEY = 'tripot_members_cache';
const CACHE_TTL = 5 * 60 * 1000;

export function useMemberNames(): string[] {
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: MemberEntry[]; ts: number };
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setNames(parsed.data.map((m) => m.name));
          return;
        }
      }
    } catch {}

    fetch('/api/members')
      .then((r) => r.json())
      .then((d) => {
        const members: MemberEntry[] = d.members ?? [];
        setNames(members.map((m) => m.name));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: members, ts: Date.now() }));
        } catch {}
      })
      .catch(() => {});
  }, []);

  return names;
}
