import type { Deal, CommRecord } from './types';
import { COMM_TYPE_LABEL } from './constants';
import { MOCK_COMMS } from './mockData';

export function gatherDealContext(deal: Deal): string {
  const comms = MOCK_COMMS[deal.id] ?? [];
  const commsNeeds = comms.flatMap((c) => c.needs ?? []);

  const storedNeeds: string[] = typeof window !== 'undefined'
    ? (() => { try { const v = localStorage.getItem(`coaris_needs_${deal.id}`); return v ? JSON.parse(v) : []; } catch { return []; } })()
    : [];

  const storedMinutes: string[] = typeof window !== 'undefined'
    ? (() => { try { const v = localStorage.getItem(`coaris_minutes_${deal.id}`); return v ? JSON.parse(v) : []; } catch { return []; } })()
    : [];

  const allNeeds = [...new Set([...storedNeeds, ...commsNeeds])];

  let ctx = `【顧客情報】\nクライアント: ${deal.clientName}\n業種: ${deal.industry}\n案件: ${deal.dealName}\n`;

  if (deal.memo) ctx += `\nメモ: ${deal.memo}\n`;

  if (comms.length > 0) {
    ctx += `\n【打ち合わせ・やり取り履歴】\n`;
    comms.forEach((c) => {
      const typeLabel = COMM_TYPE_LABEL[c.type];
      ctx += `${c.date} [${typeLabel}] ${c.title}\n${c.summary}\n\n`;
    });
  }

  if (storedMinutes.length > 0) {
    ctx += `\n【議事録（直近）】\n`;
    storedMinutes.slice(0, 3).forEach((m, i) => {
      ctx += `--- 議事録${i + 1} ---\n${m}\n\n`;
    });
  }

  if (allNeeds.length > 0) {
    ctx += `\n【抽出されたニーズ】\n`;
    allNeeds.forEach((n, i) => { ctx += `${i + 1}. ${n}\n`; });
  }

  return ctx;
}
