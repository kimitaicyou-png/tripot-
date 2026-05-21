import { describe, expect, test } from 'vitest';
import { calculateCost } from '@/lib/ai/cost';

/**
 * AI コスト計算の単体テスト。
 *
 * `/settings/ai-usage` 画面と audit_logs に記録される金額の正確性を保証する。
 * 11 AI route 全てで使われる core ロジック、誤算は経営判断のコスト把握に直結する。
 */

describe('calculateCost', () => {
  test('claude-sonnet-4-6: 入力 1M トークン = $3 = 3,000,000 micro USD', () => {
    const result = calculateCost('claude-sonnet-4-6', 1_000_000, 0);
    expect(result.costMicroUsd).toBe(3_000_000);
    expect(result.tokensIn).toBe(1_000_000);
    expect(result.tokensOut).toBe(0);
  });

  test('claude-sonnet-4-6: 出力 1M トークン = $15 = 15,000,000 micro USD', () => {
    const result = calculateCost('claude-sonnet-4-6', 0, 1_000_000);
    expect(result.costMicroUsd).toBe(15_000_000);
  });

  test('claude-sonnet-4-6: 入出力混合 (10k in + 2k out) = $0.06', () => {
    const result = calculateCost('claude-sonnet-4-6', 10_000, 2_000);
    // (10_000 / 1M) * 3 + (2_000 / 1M) * 15 = 0.030 + 0.030 = 0.060
    expect(result.costMicroUsd).toBe(60_000);
  });

  test('claude-opus-4-7: より高い単価（in $15, out $75）', () => {
    const result = calculateCost('claude-opus-4-7', 1_000_000, 1_000_000);
    // 15 + 75 = $90
    expect(result.costMicroUsd).toBe(90_000_000);
  });

  test('claude-haiku-4-5-20251001: 最安（in $0.8, out $4）', () => {
    const result = calculateCost('claude-haiku-4-5-20251001', 1_000_000, 1_000_000);
    // 0.8 + 4 = $4.8
    expect(result.costMicroUsd).toBe(4_800_000);
  });

  test('whisper-1: 無料（input/output ともに 0）', () => {
    const result = calculateCost('whisper-1', 1_000_000, 1_000_000);
    expect(result.costMicroUsd).toBe(0);
  });

  test('未知モデルは fallback price (sonnet 同等)', () => {
    const result = calculateCost('unknown-model', 1_000_000, 0);
    expect(result.costMicroUsd).toBe(3_000_000);
  });

  test('0 トークン入力 → 0 円', () => {
    const result = calculateCost('claude-sonnet-4-6', 0, 0);
    expect(result.costMicroUsd).toBe(0);
  });

  test('丸め誤差：100 トークンの非整数 micro USD は四捨五入', () => {
    const result = calculateCost('claude-sonnet-4-6', 100, 100);
    // (100/1M)*3 = 0.0003 USD = 300 micro USD
    // (100/1M)*15 = 0.0015 USD = 1500 micro USD
    // 合計 1800 micro USD
    expect(result.costMicroUsd).toBe(1800);
  });
});
