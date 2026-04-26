# ADR-0008: Next.js 内部 basePath を持たず、Vercel Multi-Zones 外側で `/tripot` を吸収する

**Status**: Accepted（ADR-0003 を補足、`basePath: '/tripot'` 設定を撤回）
**Date**: 2026-04-26
**Deciders**: 🌸美桜（4/26 朝の OAuth 動作試験で発見）

## Context

ADR-0003 で「Vercel Multi-Zones（`basePath` + `rewrites`）」採用を決め、tripot v2 の `next.config.ts` に `basePath: '/tripot'` を設定していた。

ところが 4/26 朝、OAuth 動作試験で **NextAuth v5 と Next.js basePath が両立しない構造**が判明：

| 層 | 期待動作 | 実際 |
|---|---|---|
| Next.js basePath `/tripot` | route handler 到達時に URL から `/tripot` を strip | ✅ strip される |
| NextAuth が見る request.url | `/api/auth/...`（strip 後） | ✅ そう |
| NextAuth basePath `/api/auth` 設定時 | `/providers` `/csrf` `/signin/google` を action として parse | ✅ 動く |
| ただし NextAuth が組み立てる callback URL | `/tripot/api/auth/callback/google`（外向け公開 URL） | ❌ **`/tripot` 抜きの `/api/auth/callback/google`** が生成される |

→ Google OAuth 設定で `http://localhost:3100/tripot/api/auth/callback/google` を承認済み URI に登録しても、NextAuth が Google に伝える callback URL は `http://localhost:3100/api/auth/callback/google` で、Google からの redirect も後者に届く。Next.js basePath が外側で `/tripot` を要求するため、後者は **404**。

NextAuth basePath を `/tripot/api/auth` にすると今度は **handler 内で URL から `/tripot/api/auth` を strip しようとして失敗**（Next.js basePath が既に strip 済の `/api/auth/...` しか見えていないため）。

**`AUTH_URL` 環境変数で完全な認証ベース URL を指定**しても、NextAuth v5 は実行時の `request.url` を優先するため効かなかった。

## Decision

**tripot v2 の `next.config.ts` から `basePath` と `assetPrefix` を削除する。tripot v2 アプリは root（`/`）で動作し、`/tripot/*` への rewrite は本部 `coaris.ai` 側で吸収する。**

これは ADR-0003 で参照していた Vercel Multi-Zones 公式ドキュメントの **本来の運用形態** と一致する：

```
       本部 coaris.ai/
       ├── next.config.ts
       │   rewrites:
       │     /tripot/:path*  →  https://tripot-v2-coaris.vercel.app/:path*
       │
       └── tripot v2（独立 Vercel project）
           └── next.config.ts
               (basePath なし、root 動作)
```

つまり Multi-Zones は「**外側のホストアプリで rewrite、内側の zone は basePath 不要**」が正しい構造。tripot v2 の `next.config.ts` に `basePath` を入れたのが誤り。

## Consequences

### Positive

- NextAuth v5 が **completely 標準動作** で動く（callback URL も `localhost:3100/api/auth/callback/google` で一貫）
- 13社展開時の各社プロジェクトが basePath を意識しない（テンプレ化の摩擦が減る）
- `next/link` の href が basePath 自動付与/除去で混乱しない
- 開発時は `localhost:3100/login` で素直
- 本番時は `coaris.ai/tripot/login` のまま（rewrite で吸収）、ユーザー体感変わらず

### Negative

- 本部 `coaris.ai` 側の `next.config.ts` に各社の rewrites を集中管理する必要（13社で13行）
- 直接 `tripot-v2-coaris.vercel.app/login` でアクセスすると basePath なしの URL になる（`coaris.ai/tripot/login` でアクセスする運用前提）
- Cookie domain や CORS 設定で `coaris.ai` の親ドメイン共有が必要になる

### Migration

- `next.config.ts`：`basePath` と `assetPrefix` 削除
- `auth.ts`：NextAuth `basePath: '/api/auth'` で確定
- `.env.local`：
  - `NEXTAUTH_URL=http://localhost:3100`（`/tripot` 抜き）
  - `AUTH_URL=http://localhost:3100/api/auth`（`/tripot` 抜き）
- Google OAuth 承認済みリダイレクト URI：
  - 開発: `http://localhost:3100/api/auth/callback/google`
  - 本番: `https://tripot-v2-coaris.vercel.app/api/auth/callback/google` を本番デプロイ時に追加
- 旧登録 URI `http://localhost:3100/tripot/api/auth/callback/google` は削除可（残しても害なし）
- 既存の `next/link href`（例: `/home/${memberId}`、`/deals` 等）は basePath なし前提で書かれていたため変更不要

## Alternatives Considered

- **NextAuth basePath を `/tripot/api/auth` にして AUTH_URL を強制上書き**：v5 の内部仕様で実行時 `request.url` が優先されるため不可（試行・失敗確認済）
- **catch-all redirect で `/api/auth/*` を `/tripot/api/auth/*` に rewrite**：Next.js routing と認証フローが二重化する複雑性
- **Next.js basePath を外して `app/tripot/...` 階層に手動移植**：800+ 行の Server Components 移動コスト、本来意図と矛盾

## Verification

2026-04-26 12:08 JST、隊長の `k.toki@coaris.ai` で Google サインイン → `/home/20df36b2-be5d-4392-ba4e-28218d73d529` 到達確認。`audit_logs` に `sign_in` イベント記録。

## References

- [Vercel Multi-Zones 公式](https://vercel.com/docs/microfrontends/path-routing)
- [NextAuth.js Issue: basePath callback URL](https://github.com/nextauthjs/next-auth/issues/discussions)
- ADR-0003 Vercel Multi-Zones 採用（補足対象）
