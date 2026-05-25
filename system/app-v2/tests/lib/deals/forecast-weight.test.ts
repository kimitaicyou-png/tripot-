import { describe, it, expect } from 'vitest';
import {
  getDealForecastWeight,
  getDealForecastAmount,
  CONFIDENCE_WEIGHT,
} from '@/lib/deals/forecast-weight';

describe('getDealForecastWeight', () => {
  describe('失注・入金済の境界', () => {
    it('lost は 0', () => {
      expect(getDealForecastWeight('lost', null)).toBe(0);
      expect(getDealForecastWeight('lost', 'a')).toBe(0);
    });

    it('paid は 1.0', () => {
      expect(getDealForecastWeight('paid', null)).toBe(1.0);
      expect(getDealForecastWeight('paid', 'a')).toBe(1.0);
    });
  });

  describe('受注以降の stage（stage CF 加重採用）', () => {
    it('ordered は stage CF（70%）、主観確度無視', () => {
      expect(getDealForecastWeight('ordered', null)).toBeCloseTo(0.7, 2);
      // 受注済なのに confidence='e' でも、stage 70% 採用
      expect(getDealForecastWeight('ordered', 'e')).toBeCloseTo(0.7, 2);
    });

    it('in_production は 80%', () => {
      expect(getDealForecastWeight('in_production', null)).toBeCloseTo(0.8, 2);
    });

    it('delivered は 90%', () => {
      expect(getDealForecastWeight('delivered', null)).toBeCloseTo(0.9, 2);
    });

    it('invoiced は 95%', () => {
      expect(getDealForecastWeight('invoiced', null)).toBeCloseTo(0.95, 2);
    });
  });

  describe('提案中（境界 stage 加重平均）', () => {
    it('confidence=a + proposing → 主観 0.7 + stage 0.3 加重平均', () => {
      // CONFIDENCE_WEIGHT.a = 1.0、stage proposing = 0.3
      // 1.0 * 0.7 + 0.3 * 0.3 = 0.79
      expect(getDealForecastWeight('proposing', 'a')).toBeCloseTo(0.79, 2);
    });

    it('confidence=e + proposing → 加重平均で控えめ', () => {
      // 0.1 * 0.7 + 0.3 * 0.3 = 0.16
      expect(getDealForecastWeight('proposing', 'e')).toBeCloseTo(0.16, 2);
    });

    it('confidence=null + proposing → stage CF のみ', () => {
      expect(getDealForecastWeight('proposing', null)).toBeCloseTo(0.3, 2);
    });
  });

  describe('見込み（主観確度優先 fallback）', () => {
    it('confidence=a + prospect → A の 1.0', () => {
      expect(getDealForecastWeight('prospect', 'a')).toBeCloseTo(1.0, 2);
    });

    it('confidence=e + prospect → E の 0.1', () => {
      expect(getDealForecastWeight('prospect', 'e')).toBeCloseTo(0.1, 2);
    });

    it('confidence=null + prospect → stage CF（10%）', () => {
      expect(getDealForecastWeight('prospect', null)).toBeCloseTo(0.1, 2);
    });

    it('confidence=expected + prospect → 想定 0.3', () => {
      expect(getDealForecastWeight('prospect', 'expected')).toBeCloseTo(0.3, 2);
    });

    it('confidence=continuing + prospect → 継続 0.7', () => {
      expect(getDealForecastWeight('prospect', 'continuing')).toBeCloseTo(0.7, 2);
    });
  });

  describe('CONFIDENCE_WEIGHT 定数', () => {
    it('全 7 値の重みが定義されてる（A〜E + 想定 + 継続）', () => {
      expect(Object.keys(CONFIDENCE_WEIGHT)).toHaveLength(7);
      expect(CONFIDENCE_WEIGHT.a).toBe(1.0);
      expect(CONFIDENCE_WEIGHT.e).toBe(0.1);
      expect(CONFIDENCE_WEIGHT.expected).toBe(0.3);
      expect(CONFIDENCE_WEIGHT.continuing).toBe(0.7);
    });

    it('A〜E は降順', () => {
      expect(CONFIDENCE_WEIGHT.a).toBeGreaterThan(CONFIDENCE_WEIGHT.b);
      expect(CONFIDENCE_WEIGHT.b).toBeGreaterThan(CONFIDENCE_WEIGHT.c);
      expect(CONFIDENCE_WEIGHT.c).toBeGreaterThan(CONFIDENCE_WEIGHT.d);
      expect(CONFIDENCE_WEIGHT.d).toBeGreaterThan(CONFIDENCE_WEIGHT.e);
    });
  });
});

describe('getDealForecastAmount', () => {
  it('amount × weight を整数で返す', () => {
    // ordered + null = 70%、1,000,000 × 0.7 = 700,000
    expect(getDealForecastAmount(1_000_000, 'ordered', null)).toBe(700_000);
  });

  it('amount=null は 0', () => {
    expect(getDealForecastAmount(null, 'paid', null)).toBe(0);
  });

  it('lost は 0', () => {
    expect(getDealForecastAmount(5_000_000, 'lost', 'a')).toBe(0);
  });

  it('paid は amount そのまま', () => {
    expect(getDealForecastAmount(1_234_567, 'paid', null)).toBe(1_234_567);
  });

  it('proposing + A の境界加重平均（790,000）', () => {
    // 1,000,000 × 0.79 = 790,000
    expect(getDealForecastAmount(1_000_000, 'proposing', 'a')).toBe(790_000);
  });

  it('整数丸め（四捨五入）', () => {
    // 1,000 × 0.79 = 790、整数なのでそのまま
    expect(getDealForecastAmount(1_000, 'proposing', 'a')).toBe(790);
  });
});
