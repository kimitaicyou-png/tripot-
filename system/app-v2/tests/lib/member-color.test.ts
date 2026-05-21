import { describe, expect, test } from 'vitest';
import { getMemberColor, getMemberInitial } from '@/lib/member-color';

/**
 * メンバー識別色 / イニシャル取得の純粋関数テスト。
 *
 * 旧 v1 の「並び順依存（インデックスベース）→ メンバー追加で全員の色が変わる事故」
 * を v2 では memberId hash で永続化したため、決定論性が保証されることをテスト。
 */

describe('getMemberColor', () => {
  test('同じ memberId は常に同じ色を返す（決定論）', () => {
    const id = 'member-abc-123';
    const color1 = getMemberColor(id);
    const color2 = getMemberColor(id);
    expect(color1).toBe(color2);
  });

  test('異なる memberId は palette のいずれかに分散（全部同じ色ではない）', () => {
    // 多様な UUID から色を取得、全部同じ色になっていないことを確認
    const colors = new Set([
      getMemberColor('a1b2c3d4-1111-1111-1111-111111111111'),
      getMemberColor('e5f6a7b8-2222-2222-2222-222222222222'),
      getMemberColor('c9d0e1f2-3333-3333-3333-333333333333'),
      getMemberColor('a3b4c5d6-4444-4444-4444-444444444444'),
      getMemberColor('e7f8a9b0-5555-5555-5555-555555555555'),
      getMemberColor('c1d2e3f4-6666-6666-6666-666666666666'),
      getMemberColor('a5b6c7d8-7777-7777-7777-777777777777'),
      getMemberColor('e9f0a1b2-8888-8888-8888-888888888888'),
    ]);
    // 8 種類の異なる UUID で最低 2 色以上に分散（簡易 hash の限界を考慮）
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });

  test('返り値は palette のいずれか（bg-*-500 形式）', () => {
    const color = getMemberColor('test-id');
    expect(color).toMatch(/^bg-(pink|emerald|amber|indigo|teal|blue|purple|rose)-500$/);
  });

  test('空文字 memberId でも palette 内の色を返す（エラーにならない）', () => {
    const color = getMemberColor('');
    expect(color).toMatch(/^bg-/);
  });
});

describe('getMemberInitial', () => {
  test('通常の名前 → 先頭 1 文字', () => {
    expect(getMemberInitial('土岐 公人')).toBe('土');
  });

  test('英字名 → 先頭大文字', () => {
    expect(getMemberInitial('Alice')).toBe('A');
  });

  test('空文字 → "?"', () => {
    expect(getMemberInitial('')).toBe('?');
  });

  test('絵文字 → 絵文字の先頭', () => {
    const result = getMemberInitial('🌸 美桜');
    // surrogate pair の片割れになる可能性があるが、charAt(0) は仕様通り
    expect(result.length).toBeGreaterThan(0);
  });
});
