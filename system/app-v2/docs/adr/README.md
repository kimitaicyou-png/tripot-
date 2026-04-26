# Architecture Decision Records — tripot v2

> 隊長思想「忘却対策」の実装。  
> 重要な技術決定の **理由** を残し、半年後・1年後の自分や13社展開時の他姉妹が読んで理解できるようにする。

## 一覧

| # | タイトル | Status | Date |
|---|---|---|---|
| [0001](./0001-drizzle-orm-adoption.md) | Drizzle ORM の採用 | Accepted | 2026-04-26 |
| [0002](./0002-nextauth-v5-with-better-auth-future-path.md) | NextAuth v5 採用、Better Auth 移行ロードマップ | Accepted | 2026-04-26 |
| [0003](./0003-vercel-multi-zones.md) | Vercel Multi-Zones 採用 | Accepted | 2026-04-26 |
| [0004](./0004-row-level-security.md) | 行レベルセキュリティ（RLS）で 13社テナント分離 | Accepted | 2026-04-26 |
| [0005](./0005-glossary-strict.md) | 用語統一の厳格遵守 | Accepted | 2026-04-26 |
| [0006](./0006-member-color-hash.md) | メンバー識別色の決定論的生成 | Accepted | 2026-04-26 |
| [0007](./0007-running-revenue-model-deferral.md) | running 売上モデルの簡略化と billing_periods Phase 2 送り | Accepted | 2026-04-26 |

## ADR を追加する時

1. `00XX-short-title.md` を作成
2. 以下のテンプレに従う
3. このREADMEに行追加

### テンプレ

```markdown
# ADR-00XX: タイトル

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Deciders**: 関わった姉妹

## Context
何があった？なぜこの判断が必要？

## Decision
何を決めた？

## Rationale
なぜそうした？比較した代替案は？

## Consequences
### Positive
良かったこと

### Negative
悪かったこと・トレードオフ

## Alternatives Considered
他の選択肢

## References
関連リンク・設計書
```

## 過去失敗の教訓

旧 tripot v1 では「自分が作ったのに半年後に忘れる」が多発した。ADR を残すことで：
- 新メンバーがコードベースに入った時、なぜそうなっているか理解できる
- 将来「これ変えていい？」と思った時、ADR を読めば変えるべきか判断できる
- Superseded ADR で経緯が追える

これが **「複雑性を制する」** ための最も強力な道具。
