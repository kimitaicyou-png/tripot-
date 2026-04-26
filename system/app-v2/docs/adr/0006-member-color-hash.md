# ADR-0006: メンバー識別色の決定論的生成

**Status**: Accepted
**Date**: 2026-04-26
**Deciders**: ❄️美冬・🎩セバスチャン

## Context

旧 tripot v1：

```js
const MEMBER_COLORS = ['bg-pink-500', 'bg-emerald-500', ...全8色];
const color = MEMBER_COLORS[i % MEMBER_COLORS.length];
```

**並び順依存**で、新メンバー追加すると全員の色が変わる事故。  
昨日「ピンクの人」が今日「青の人」になり、視覚的識別が崩壊。

## Decision

**`memberId` 文字列を hash して色を決定論的に生成する。**

```typescript
// src/lib/member-color.ts
const PALETTE = ['bg-pink-500', 'bg-emerald-500', ...];

export function getMemberColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash << 5) - hash + memberId.charCodeAt(i);
    hash = hash & hash;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
```

## Consequences

### Positive

- **memberId が同じなら色は永遠に同じ**
- メンバー追加・削除でも他人の色が変わらない
- DB に色列を持たせる必要なし（ハッシュは決定論的）

### Negative

- 8色しかないので、9人目以降は色が衝突する
  - → 衝突率：4人で約20%、8人で約64%（誕生日問題類似）
  - → ただし衝突しても人間は名前で識別するので致命的でない
- パレット拡張時は ハッシュ結果が変わる ＝ 既存メンバーの色が一斉に変わるリスク
  - → 拡張は慎重に、年単位で

## Alternatives Considered

- **DB に color列追加**：永続化される、衝突しない、ただしメンバー登録時に色決定が必要
- **Tailwind Avatar 自動生成系ライブラリ**：依存追加コスト

## References

- セバス設計：`~/.claude/memory/shared/tripot-v2-auth-design.md`
