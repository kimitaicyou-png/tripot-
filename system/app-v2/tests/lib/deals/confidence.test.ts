/**
 * 主観確度（subjective_confidence）helper のテスト
 *
 * ADR-0013（G3、2026-05-25）
 */

import { describe, it, expect } from 'vitest';
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_DESCRIPTION,
  CONFIDENCE_BADGE_CLASS,
  CONFIDENCE_NULL_BADGE_CLASS,
  SUBJECTIVE_CONFIDENCE_VALUES,
  getConfidenceLabel,
  getConfidenceFullLabel,
  type SubjectiveConfidence,
} from '@/lib/deals/confidence';

describe('SUBJECTIVE_CONFIDENCE_VALUES', () => {
  it('現行スプレッドシート 7 値を網羅', () => {
    expect(SUBJECTIVE_CONFIDENCE_VALUES).toEqual([
      'a', 'b', 'c', 'd', 'e', 'expected', 'continuing',
    ]);
  });

  it("中止（'lost'）は含めない（stage='lost' で表現する DRY 原則）", () => {
    expect(SUBJECTIVE_CONFIDENCE_VALUES).not.toContain('lost');
  });
});

describe('CONFIDENCE_LABEL', () => {
  it('A〜E は大文字、想定・継続は日本語', () => {
    expect(CONFIDENCE_LABEL.a).toBe('A');
    expect(CONFIDENCE_LABEL.e).toBe('E');
    expect(CONFIDENCE_LABEL.expected).toBe('想定');
    expect(CONFIDENCE_LABEL.continuing).toBe('継続');
  });

  it('全 7 値にラベル定義あり（網羅性チェック）', () => {
    for (const v of SUBJECTIVE_CONFIDENCE_VALUES) {
      expect(CONFIDENCE_LABEL[v]).toBeTruthy();
    }
  });
});

describe('CONFIDENCE_DESCRIPTION', () => {
  it('全 7 値に説明あり', () => {
    for (const v of SUBJECTIVE_CONFIDENCE_VALUES) {
      expect(CONFIDENCE_DESCRIPTION[v]).toBeTruthy();
      expect(CONFIDENCE_DESCRIPTION[v].length).toBeGreaterThan(2);
    }
  });
});

describe('CONFIDENCE_BADGE_CLASS', () => {
  it('全 7 値に Tailwind class あり', () => {
    for (const v of SUBJECTIVE_CONFIDENCE_VALUES) {
      expect(CONFIDENCE_BADGE_CLASS[v]).toMatch(/bg-/);
      expect(CONFIDENCE_BADGE_CLASS[v]).toMatch(/text-/);
    }
  });

  it('design rules 準拠（font-bold/font-black/shadow-md+ 不使用）', () => {
    for (const v of SUBJECTIVE_CONFIDENCE_VALUES) {
      expect(CONFIDENCE_BADGE_CLASS[v]).not.toMatch(/font-bold|font-black/);
      expect(CONFIDENCE_BADGE_CLASS[v]).not.toMatch(/shadow-(md|lg|xl|2xl)/);
    }
  });

  it('未設定 badge class が定義済（dashed border で「未設定」を視覚化）', () => {
    expect(CONFIDENCE_NULL_BADGE_CLASS).toMatch(/dashed/);
  });
});

describe('getConfidenceLabel', () => {
  it("null/undefined は '未設定' を返す", () => {
    expect(getConfidenceLabel(null)).toBe('未設定');
    expect(getConfidenceLabel(undefined)).toBe('未設定');
  });

  it("'a' は 'A' を返す", () => {
    expect(getConfidenceLabel('a')).toBe('A');
  });

  it("'expected' は '想定' を返す", () => {
    expect(getConfidenceLabel('expected')).toBe('想定');
  });
});

describe('getConfidenceFullLabel', () => {
  it("null は '確度未設定' を返す", () => {
    expect(getConfidenceFullLabel(null)).toBe('確度未設定');
  });

  it("'a' は 'A（見積以降・受注確度高）' のような形式", () => {
    const result = getConfidenceFullLabel('a');
    expect(result).toContain('A');
    expect(result).toContain(CONFIDENCE_DESCRIPTION.a);
  });

  it('継続は説明とセット', () => {
    const result = getConfidenceFullLabel('continuing');
    expect(result).toContain('継続');
    expect(result).toContain(CONFIDENCE_DESCRIPTION.continuing);
  });
});

describe('SubjectiveConfidence 型網羅', () => {
  it('全 7 値が TypeScript 型として通る（コンパイル時チェック）', () => {
    const values: SubjectiveConfidence[] = [
      'a', 'b', 'c', 'd', 'e', 'expected', 'continuing',
    ];
    expect(values).toHaveLength(7);
  });
});
