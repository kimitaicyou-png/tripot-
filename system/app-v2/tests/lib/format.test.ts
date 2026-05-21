import { describe, expect, test } from 'vitest';
import {
  formatYen,
  formatMan,
  formatShortYen,
  formatPercent,
  formatRate,
} from '@/lib/format';

/**
 * 金額・数値フォーマット helper の単体テスト。
 * 31 ファイルで重複定義されている format 関数の共通基盤テスト、
 * 全画面の数値表示の正確性を 1 箇所で保証する。
 */

describe('formatYen', () => {
  test('正の整数 → ¥ 千区切り', () => {
    expect(formatYen(1234567)).toBe('¥1,234,567');
  });
  test('0 → ¥0', () => {
    expect(formatYen(0)).toBe('¥0');
  });
  test('null → ¥0', () => {
    expect(formatYen(null)).toBe('¥0');
  });
  test('undefined → ¥0', () => {
    expect(formatYen(undefined)).toBe('¥0');
  });
  test('1 桁 → ¥9', () => {
    expect(formatYen(9)).toBe('¥9');
  });
  test('100 億単位 → 千区切り維持', () => {
    expect(formatYen(99_999_999_999)).toBe('¥99,999,999,999');
  });
});

describe('formatMan', () => {
  test('100,000 → 10万', () => {
    expect(formatMan(100_000)).toBe('10万');
  });
  test('1,234,567 → 123万（四捨五入）', () => {
    expect(formatMan(1_234_567)).toBe('123万');
  });
  test('5,000 → 1万（四捨五入で切り上げ）', () => {
    expect(formatMan(5_000)).toBe('1万');
  });
  test('null → 0万', () => {
    expect(formatMan(null)).toBe('0万');
  });
  test('10,000,000 → 1,000万 (千区切り)', () => {
    expect(formatMan(10_000_000)).toBe('1,000万');
  });
});

describe('formatShortYen', () => {
  test('1000 万以上 → ¥X.X千万', () => {
    expect(formatShortYen(12_345_678)).toBe('¥1.2千万');
    expect(formatShortYen(10_000_000)).toBe('¥1.0千万');
  });
  test('1 万以上 → ¥X万', () => {
    expect(formatShortYen(123_456)).toBe('¥12万');
    expect(formatShortYen(10_000)).toBe('¥1万');
  });
  test('1 万未満 → ¥千区切り', () => {
    expect(formatShortYen(9_999)).toBe('¥9,999');
    expect(formatShortYen(100)).toBe('¥100');
  });
  test('0 / null → ¥0', () => {
    expect(formatShortYen(0)).toBe('¥0');
    expect(formatShortYen(null)).toBe('¥0');
  });
});

describe('formatPercent', () => {
  test('0.15 → +15.0%', () => {
    expect(formatPercent(0.15)).toBe('+15.0%');
  });
  test('-0.123 → -12.3%', () => {
    expect(formatPercent(-0.123)).toBe('-12.3%');
  });
  test('0 → +0.0%', () => {
    expect(formatPercent(0)).toBe('+0.0%');
  });
  test('null → +0.0%', () => {
    expect(formatPercent(null)).toBe('+0.0%');
  });
  test('1 → +100.0%', () => {
    expect(formatPercent(1)).toBe('+100.0%');
  });
});

describe('formatRate', () => {
  test('12.5 → 13%（四捨五入）', () => {
    expect(formatRate(12.5)).toBe('13%');
  });
  test('100 → 100%', () => {
    expect(formatRate(100)).toBe('100%');
  });
  test('0 → 0%', () => {
    expect(formatRate(0)).toBe('0%');
  });
  test('null → —', () => {
    expect(formatRate(null)).toBe('—');
  });
  test('undefined → —', () => {
    expect(formatRate(undefined)).toBe('—');
  });
});
