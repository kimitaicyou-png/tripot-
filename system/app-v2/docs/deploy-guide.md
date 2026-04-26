# tripot v2 — Vercel 本番デプロイガイド

> 2026-04-26 美桜起草、5/2 D-day 本番デプロイ用。
> 本部 `coaris.ai` Multi-Zones 構造（ADR-0003 / ADR-0008）に従う。

## 🎯 目標構造

```
ユーザー
  ↓
coaris.ai/tripot/...     ← 本部 Vercel project (coaris-ai or coaris-hq)
  ↓ (rewrites)
tripot-v2-coaris.vercel.app/...   ← この project (root 動作、basePath なし)
```

## 📋 隊長承認案件（実行前必須）

1. ✅ Google OAuth v2 クライアント発行（k.toki@coaris.ai 配下、4/26 完了）
2. ⏳ Vercel project `tripot-v2-coaris` 新規作成（隊長承認）
3. ⏳ 本部 `coaris-ai` project の `next.config.ts` に rewrites 追加（隊長承認）
4. ⏳ Google OAuth に本番 redirect URI 追加（`https://tripot-v2-coaris.vercel.app/api/auth/callback/google`）
5. ⏳ `git push` 承認（origin に commit を上げる）

## 🚀 デプロイ手順

### Step 1: Vercel project 作成

```bash
cd ~/projects/coaris/companies/tripot/system/app-v2
vercel
```

対話プロンプト：
- `Set up and deploy?` → Yes
- **`Link to existing project?` → No**（重要、既存に link すると事故る）
- `What's your project's name?` → `tripot-v2-coaris`
- `In which directory is your code located?` → `./`
- Framework は Next.js auto-detect で OK
- Root Directory: `./`（ルート）
- Build Command / Output Directory はデフォルトで OK

### Step 2: 環境変数を Vercel に設定

```bash
# DB
vercel env add DATABASE_URL production
# → tripot-v2 ブランチの connection string を入力

# NextAuth
vercel env add AUTH_SECRET production
# → openssl rand -base64 32 で生成した値

vercel env add AUTH_GOOGLE_ID_V2 production
# → 4/26 発行済の Client ID

vercel env add AUTH_GOOGLE_SECRET_V2 production
# → 4/26 発行済の Client Secret（Sensitive Env Policy 対象）

vercel env add NEXTAUTH_URL production
# → https://tripot-v2-coaris.vercel.app（本番）

vercel env add AUTH_URL production
# → https://tripot-v2-coaris.vercel.app/api/auth

# Mem0（aiAssistant 機能、既存サーバ流用）
vercel env add MEM0_API_URL production
vercel env add MEM0_API_KEY production

# Bridge（本部接続用）
vercel env add BRIDGE_SERVICE_TOKEN production
# → 本番用に強固なトークン生成（openssl rand -hex 32）
```

### Step 3: 初回本番デプロイ

```bash
vercel --prod
```

成功すると `https://tripot-v2-coaris.vercel.app` に到達可能。

### Step 4: Google OAuth に本番 URI 追加（隊長手動）

🔗 https://console.cloud.google.com/auth/clients?project=jovial-branch-494501-c8

`tripot-v2-local` クライアント → 承認済みリダイレクト URI に追加：
- `https://tripot-v2-coaris.vercel.app/api/auth/callback/google`

または最終的にユーザーが見る URL に対応：
- `https://coaris.ai/tripot/api/auth/callback/google` ← 本部 rewrite 経由でも動くようにする場合

### Step 5: 本部 coaris-ai project に rewrites 追加

本部 Vercel project の `next.config.ts`：

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/tripot/:path*',
        destination: 'https://tripot-v2-coaris.vercel.app/:path*',
      },
      // 13社展開時はここに各社追加
      // { source: '/deraforce/:path*', destination: 'https://deraforce-coaris.vercel.app/:path*' },
    ];
  },
};

export default nextConfig;
```

本部 project に commit & deploy。

### Step 6: 動作確認

```bash
curl -sS -o /dev/null -w "GET https://coaris.ai/tripot          → HTTP %{http_code}\n" https://coaris.ai/tripot
curl -sS -o /dev/null -w "GET https://coaris.ai/tripot/login    → HTTP %{http_code}\n" https://coaris.ai/tripot/login
curl -sS https://coaris.ai/tripot/api/auth/providers
```

ブラウザで `https://coaris.ai/tripot/login` → Google サインイン → `/home/{member_id}` 到達確認。

## 🚨 デプロイ前チェックリスト（事故防止）

- [ ] `npm run build` がローカルで成功する（exit 0）
- [ ] `npm run type-check` で 0 errors
- [ ] `package.json` の `name` が `coaris-tripot-v2`（汎用名 NG）
- [ ] `.vercel/project.json` を Git 追跡（過去事故再発防止）
- [ ] `.env.local` を絶対に commit しない（.gitignore 確認済）
- [ ] secret 値を Vercel env に登録するときは Sensitive policy ON
- [ ] 既存 `tripot-system` / `tripot-ten` Vercel project に上書きしない（**Link to existing → No**）

## 🚦 ロールアウト戦略

**Phase 1（5/2 D-day 当日）**：
- tripot-v2-coaris.vercel.app 単独で動かす
- 本部 rewrites は未設定でも tripot 単体で動作確認
- 隊長デモ用 URL: `https://tripot-v2-coaris.vercel.app/login`

**Phase 2（5/2 隊長承認後）**：
- 本部 coaris-ai に rewrites 追加
- 公開 URL: `https://coaris.ai/tripot/login`
- 旧 `tripot-ten.vercel.app` は当面残す（隊長判断で削除 or legacy 化）

**Phase 3（5月リリース後、5/12〜）**：
- RLS 適用（`scripts/setup-rls.sql`、Server Actions に setTenantContext 一括挿入後）
- PostHog 観測 ON
- bridge/kpi で本部に KPI 集約開始
- Mem0 統合 / aiAssistant feature ON

## ⚠️ 既知の制約（5/2 デモまでに対処予定 or 容認）

| 項目 | 状態 | 対処 |
|---|---|---|
| RLS policy 未適用 | 容認（tripot 1社のみなら実害なし） | 5/4 までに setTenantContext 一括挿入 + SQL 適用 |
| home/[memberId] 以外の company_id フィルタ整合 | 確認推奨 | Server Actions は session 経由で OK、横断 page も session 経由 |
| middleware deprecation warning | 容認（動作問題なし） | Next.js 16 の proxy convention 移行は来週 |
| Server Actions の Click イベント発火が稀に遅延 | dev のみ、prod 未確認 | 本番デプロイ後に再検証 |
| MFクラウド / PostHog / Anthropic / Resend env | 未設定 | 5月リリース後に順次追加 |

## 🎩 セバスチャン整合性監査ポイント

- [ ] `vercel.json` の `headers` 設定が CSP / X-Frame-Options / Referrer-Policy で本番準拠
- [ ] AUTH_SECRET は dev 値と完全分離
- [ ] AUTH_GOOGLE_SECRET_V2 が Sensitive 扱いで Vercel 上に保存
- [ ] BRIDGE_SERVICE_TOKEN が dev placeholder のまま本番に上がってない
- [ ] HSTS / HTTPS リダイレクトが Vercel auto で機能
- [ ] 旧 jtravel.group OAuth クライアント（v1 用）が v2 で誤用されてない（env 名で分離済）

## 📚 参考

- ADR-0001 Drizzle ORM
- ADR-0002 NextAuth v5
- ADR-0003 Vercel Multi-Zones
- ADR-0004 RLS でテナント分離
- ADR-0008 内部 basePath を持たない（4/26 追加）
- `~/.claude/skills/デプロイ安全ルール/`
- `~/.claude/memory/shared/tripot-v2-bridge-design.md`
