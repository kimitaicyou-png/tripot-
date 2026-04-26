import type { AiUsageRecord } from './types';

type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
};

const PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-7': { inputPerMillion: 15, outputPerMillion: 75 },
  'claude-sonnet-4-6': { inputPerMillion: 3, outputPerMillion: 15 },
  'claude-haiku-4-5-20251001': { inputPerMillion: 0.8, outputPerMillion: 4 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  'whisper-1': { inputPerMillion: 0, outputPerMillion: 0 },
};

const FALLBACK: ModelPricing = { inputPerMillion: 3, outputPerMillion: 15 };

export function calculateCost(
  model: string,
  tokensIn: number,
  tokensOut: number
): AiUsageRecord {
  const pricing = PRICING[model] ?? FALLBACK;
  const dollarsIn = (tokensIn / 1_000_000) * pricing.inputPerMillion;
  const dollarsOut = (tokensOut / 1_000_000) * pricing.outputPerMillion;
  const totalDollars = dollarsIn + dollarsOut;
  return {
    tokensIn,
    tokensOut,
    costMicroUsd: Math.round(totalDollars * 1_000_000),
  };
}
