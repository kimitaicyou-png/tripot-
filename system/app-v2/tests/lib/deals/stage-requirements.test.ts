import { describe, expect, test } from 'vitest';
import { isStageAdvancement } from '@/lib/deals/stage-requirements';

/**
 * stage-requirements.ts の純粋関数 isStageAdvancement の単体テスト。
 *
 * 目的：「後退しないルール」が正しく機能することを保証する。
 * これは案件ステージ自動進行（7 段、思想実装）の安全弁。
 * バグると prod の deal.stage が誤って戻る可能性があり、PL/CF にも影響する CRITICAL ロジック。
 */

describe('isStageAdvancement', () => {
  // 前方遷移：true を返す
  test('prospect → proposing は前進', () => {
    expect(isStageAdvancement('prospect', 'proposing')).toBe(true);
  });
  test('proposing → ordered は前進', () => {
    expect(isStageAdvancement('proposing', 'ordered')).toBe(true);
  });
  test('ordered → in_production は前進', () => {
    expect(isStageAdvancement('ordered', 'in_production')).toBe(true);
  });
  test('in_production → delivered は前進', () => {
    expect(isStageAdvancement('in_production', 'delivered')).toBe(true);
  });
  test('delivered → acceptance は前進', () => {
    expect(isStageAdvancement('delivered', 'acceptance')).toBe(true);
  });
  test('acceptance → invoiced は前進', () => {
    expect(isStageAdvancement('acceptance', 'invoiced')).toBe(true);
  });
  test('invoiced → paid は前進', () => {
    expect(isStageAdvancement('invoiced', 'paid')).toBe(true);
  });

  // スキップ遷移（複数段先行）：true
  test('prospect → ordered は前進（スキップ可）', () => {
    expect(isStageAdvancement('prospect', 'ordered')).toBe(true);
  });
  test('prospect → paid は前進（スキップ可）', () => {
    expect(isStageAdvancement('prospect', 'paid')).toBe(true);
  });

  // 後退：false（後退しないルールの核心）
  test('proposing → prospect は後退（false）', () => {
    expect(isStageAdvancement('proposing', 'prospect')).toBe(false);
  });
  test('ordered → proposing は後退（false）', () => {
    expect(isStageAdvancement('ordered', 'proposing')).toBe(false);
  });
  test('paid → ordered は後退（false）', () => {
    expect(isStageAdvancement('paid', 'ordered')).toBe(false);
  });

  // 同一 stage：false（変化なし、進行扱いしない）
  test('proposing → proposing は false（同一）', () => {
    expect(isStageAdvancement('proposing', 'proposing')).toBe(false);
  });

  // 存在しない stage：false（安全側）
  test('不正な currentStage：false', () => {
    expect(isStageAdvancement('invalid_stage', 'proposing')).toBe(false);
  });
  test('不正な targetStage：false', () => {
    expect(isStageAdvancement('prospect', 'invalid_stage')).toBe(false);
  });

  // lost (order=999) との関係
  test('lost → prospect は後退（false、lost が order=999 で最大）', () => {
    expect(isStageAdvancement('lost', 'prospect')).toBe(false);
  });
  test('prospect → lost は前進判定（true、ただし通常は recordLostDeal を使う）', () => {
    // 本関数はあくまで order 比較。lost への自動遷移は maybeAdvanceDealStage で
    // 別途ブロックされる（lost を target にしない）
    expect(isStageAdvancement('prospect', 'lost')).toBe(true);
  });
});
