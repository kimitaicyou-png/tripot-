# ADR-0001: Drizzle ORM の採用

**Status**: Accepted
**Date**: 2026-04-26
**Deciders**: 🌸美桜・🍁秋美（明朝レビュー前提）

## Context

旧 tripot v1 は `@neondatabase/serverless` を直接叩いてた。型安全性なし、migration 管理なし、AI まかせでスキーマがズレる事故の温床だった。

v2 では DB 先行設計の方針を立て、ORM を導入する必要があった。候補：Drizzle / Prisma / Kysely。

## Decision

**Drizzle ORM を採用する。**

## Rationale

| 比較項目 | Drizzle | Prisma | Kysely |
|---|---|---|---|
| Bundle size | **7.4kb**（依存ゼロ） | 1.6MB（v7、85-90%軽量化済） | ~30kb |
| edge-native | ◎ | ○（Accelerate or 直接接続） | ○ |
| Neon Serverless 相性 | **◎** | ○ | ○ |
| Schema 管理 | TypeScript ファイル | `.prisma` DSL | TypeScript |
| Migration | `drizzle-kit` で TS | Prisma Migrate | 自前 |
| 型推論 | ◎ | ◎ | **◎**（SQL寄り） |
| 学習コスト | 中 | 低 | 高 |

### 決め手

- 2026年 Vercel + Neon プロジェクトの**デファクト**
- **edge-native**（Vercel Edge Runtime で動く）
- bundle 7.4kb は Prisma の **200分の1**（Cold start 速い）
- TypeScript ファイルで schema 完結 = 型キャストなしで全部入る

## Consequences

### Positive

- Schema が TypeScript で型安全、IDE 補完効く
- migration を `drizzle-kit push` 一発で Neon に反映
- bundle軽量で Vercel Edge で動く
- 用語統一表（deal/customer/member）を schema レベルで強制

### Negative

- `inArray` の enum型 vs string[] 不一致など、型システムの細かい制約あり（`[...const_array] as Type[]` で展開が必要）
- relational queries の API が Prisma に比べて若干劣る（v0.44系で改善中）

## Alternatives Considered

- **Prisma v7**：bundle 1.6MB、Cold start 遅延が serverless で気になる
- **Kysely**：SQL寄り、型安全だが ORM の便利さは欠ける、業務システムには冗長

## References

- [Drizzle vs Prisma 2026 - makerkit](https://makerkit.dev/blog/tutorials/drizzle-vs-prisma)
- `~/.claude/memory/shared/tripot-v2-tech-research.md`
