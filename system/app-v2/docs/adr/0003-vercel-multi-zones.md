# ADR-0003: Vercel Multi-Zones 採用（`withMicrofrontends` 不採用）

**Status**: Accepted
**Date**: 2026-04-26
**Deciders**: 🌸美桜・🎩セバスチャン

## Context

隊長宣言：「本部に事業会社をつなぎこむ。`coaris.ai/tripot` 構造」。Vercel が提供する Microfrontends 機能には2方式：

1. **Multi-Zones**（`basePath` + `rewrites`）：従来からある、安定
2. **`withMicrofrontends` ラッパー**：新しい、宣言的

## Decision

**Multi-Zones（`basePath: '/tripot'` + 本部側 `rewrites`）を採用する。**

## Rationale

### 重要な制約発見

公式ドキュメントより：
> Next.js applications that use basePath are not supported right now when using the `withMicrofrontends` wrapper.

→ tripot は `coaris.ai/tripot` パス階層が前提なので **basePath 必須** → `withMicrofrontends` 使用不可。

### Multi-Zones の構成

```typescript
// tripot 側 next.config.ts
const nextConfig: NextConfig = {
  basePath: '/tripot',
};

// 本部 coaris.ai/ 側 next.config.ts
const nextConfig: NextConfig = {
  async rewrites() {
    return [{
      source: '/tripot/:path*',
      destination: 'https://tripot-v2-coaris.vercel.app/tripot/:path*',
    }];
  },
};
```

### 13社展開時のテンプレ

新会社（deraforce 等）追加時：
1. 各社独立 Vercel project 作成
2. `coaris.config.ts` 書き換え + `basePath: '/deraforce'`
3. 本部 `next.config.ts` の rewrites に1行追加
4. 半日〜1日で1社追加可能

## Consequences

### Positive

- **各社の独立性**：tripot がデプロイ失敗しても deraforce は無事
- **UX統合**：ユーザーは `coaris.ai` 1ドメインで全社を行き来
- **段階移行**：旧 `tripot-ten.vercel.app` を当面残しつつ、`coaris.ai/tripot` で v2 を立ち上げ
- **認証 SSO**：`coaris.ai` ドメインで NextAuth session cookie 共有、全path で同じセッション

### Negative

- 各社の独立Vercel project 管理コスト（13社で13プロジェクト）
- rewrites の維持管理（本部側で各社のURLを集中管理）

## Alternatives Considered

- **`withMicrofrontends`**：basePath 非対応で却下
- **Subdomain（`tripot.coaris.ai`）**：UX分断、SSO設定複雑
- **Monolith**：1Next.jsプロジェクトに全社含める、独立性ゼロで却下

## References

- [Vercel Microfrontends Path Routing](https://vercel.com/docs/microfrontends/path-routing)
- `~/.claude/memory/shared/tripot-v2-bridge-design.md`
