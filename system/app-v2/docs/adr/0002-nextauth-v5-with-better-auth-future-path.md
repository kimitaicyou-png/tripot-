# ADR-0002: NextAuth v5 採用、Better Auth 移行ロードマップ

**Status**: Accepted（5月後半に Better Auth 移行を再評価）
**Date**: 2026-04-26
**Deciders**: 🌸美桜・🎩セバスチャン

## Context

旧 tripot v1 の致命傷：`USERS = {toki, ono}` ハードコード + `localStorage["tripot_current_user"]` フォールバック構造で、NextAuth session が機能していてもメンバーが USERS に存在しないと「常に toki として動作」していた。本番なりきりモード残存の証明。

v2 では認証一元化必須。候補：NextAuth v5（Auth.js）/ Better Auth / Clerk。

## Decision

**5月リリースまでは NextAuth v5 を採用、5月後半に Better Auth 移行を再評価する。**

## Rationale

| 比較項目 | NextAuth v5 | Better Auth | Clerk |
|---|---|---|---|
| ライセンス | MIT | MIT | 商用 |
| ホスティング | self | self | hosted |
| 組織管理 | DB自前実装 | first-party plugin | 標準機能 |
| 2FA / Passkeys | 別途実装 | first-party plugin | 標準 |
| コスト | 0 | 0 | $0.02/MAU >10K |
| 5月リリース速度 | **◎**（既存設計あり） | ○ | ◎ |
| 13社展開耐性 | △ | **◎** | ◎ |
| Drizzle 相性 | ○ | ◎ | △ |

### 決め手

- セバスチャンの NextAuth v5 設計（`signIn` callback ドメイン制限、audit_logs、JWT strategy）が既に完成
- 5月2日 D-day までの速度優先
- Better Auth への移行は構造ほぼ同じで容易（5月後半に再評価）

## Consequences

### Positive

- セバス設計の即時実装可能、5月リリース間に合う
- 隊長の `@coaris.ai` Workspace との Google OAuth 連携が標準
- `audit_logs` テーブルで全認証イベント記録、なりきりモード絶滅

### Negative

- 13社展開時の組織管理は手動実装が必要（Better Auth なら plugin で済む）
- Passkeys/2FA は将来要件、現時点では先送り

## Migration Path（5月後半）

1. Better Auth セットアップ（`@better-auth/core`）
2. `auth.ts` を Better Auth API に書き換え（structure 似ている）
3. Drizzle adapter 公式サポートを利用
4. Organization plugin で `companies` を multi-tenant 化
5. NextAuth v5 を撤去

## References

- [Better Auth vs NextAuth vs Clerk - supastarter](https://supastarter.dev/blog/better-auth-vs-nextauth-vs-clerk)
- `~/.claude/memory/shared/tripot-v2-auth-design.md`
