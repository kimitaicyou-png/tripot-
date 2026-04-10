import type { Deal, CommRecord } from './types';
import { COMM_TYPE_LABEL } from './constants';
import { MOCK_COMMS } from './mockData';

export function gatherDealContext(deal: Deal): string {
  const comms = MOCK_COMMS[deal.id] ?? [];
  const needs = comms.flatMap((c) => c.needs ?? []);

  let ctx = `【顧客情報】\nクライアント: ${deal.clientName}\n業種: ${deal.industry}\n案件: ${deal.dealName}\n`;

  if (deal.memo) ctx += `\nメモ: ${deal.memo}\n`;

  if (comms.length > 0) {
    ctx += `\n【打ち合わせ・やり取り履歴】\n`;
    comms.forEach((c) => {
      const typeLabel = COMM_TYPE_LABEL[c.type];
      ctx += `${c.date} [${typeLabel}] ${c.title}\n${c.summary}\n\n`;
    });
  }

  if (needs.length > 0) {
    ctx += `\n【抽出されたニーズ】\n`;
    needs.forEach((n, i) => { ctx += `${i + 1}. ${n}\n`; });
  }

  return ctx;
}
