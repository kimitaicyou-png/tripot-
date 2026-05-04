# 13社展開チェックリスト（tripot v2 → 各事業会社）

> tripot v2 を deraforce / wise-assist / 他11社に展開する際の必須項目。
> 起案: 2026-05-05 02:18 美桜（Phase 11-D 緊急対応で本番 role_permissions seed 漏れ顕在化を起点に整備）

---

## 0. 前提：tripot v2 が「基準値プロジェクト」

- ADR 0001-0012 完備（drizzle / NextAuth / Multi-Zones / RLS / 監査ログ / 粗利 / rbac / JWT 即時無効化）
- 36 Action ファイル全件 `requirePermission` 適用済（Phase 11-B、`50f118e`）
- 経営哲学「粗利→営業利益→売上」DB schema レベルで体現（ADR-0010）

各社展開時は本チェックリストに沿って初期化する。

---

## 1. リポジトリ複製（10分）

### Step 1-1: 新規ディレクトリ複製

```bash
# tripot をコピー、.vercel と node_modules 除外
rsync -av --exclude='.vercel' --exclude='node_modules' \
  /Users/tokikimito/projects/coaris/companies/tripot/system/app-v2/ \
  /Users/tokikimito/projects/coaris/companies/<新社名>/system/app-v2/
```

### Step 1-2: package.json の name を会社名に変更

```json
{
  "name": "<新社名>-app-v2",
  ...
}
```

`tripot-v2` のような汎用名 NG。事業会社名を含めること。

### Step 1-3: coaris.config.ts を会社別カスタマイズ

```typescript
// coaris.config.ts
export const TRIPOT_CONFIG = {
  branding: {
    companyName: '<新社名>',
    accentColorHex: '#XXXXXX', // 各社ブランドカラー
    // ...
  },
  auth: {
    allowedEmailDomains: ['<新社ドメイン>'], // 例: ['deraforce.co.jp']
  },
  // ...
};
```

---

## 2. インフラ初期化（30分）

### Step 2-1: 新規 Vercel プロジェクト作成

```bash
cd /Users/tokikimito/projects/coaris/companies/<新社名>/system/app-v2
vercel
```

対話プロンプト：
- `Set up and deploy? → Yes`
- **`Link to existing project? → No`**（既存にリンクすると tripot 上書き事故）
- `What's your project's name? → <新社名>-system`
- `In which directory? → ./`

### Step 2-2: .vercel/project.json を Git 追跡

```bash
# .gitignore に !.vercel/ と !.vercel/project.json を追記
git add .vercel/project.json
git commit -m "Link to new Vercel project"
```

### Step 2-3: Neon DB 新規 branch 作成

Neon コンソールで `<新社名>` branch を tripot main から派生：
- branch name: `<新社名>-main`
- compute size: 0.25 CU（最小、コスト最適化）
- DATABASE_URL を vercel env に投入

### Step 2-4: Google OAuth クライアント発行

Google Cloud Console で：
- OAuth 2.0 クライアント新規作成（**tripot のクライアント流用 NG、各社独立**）
- Authorized JavaScript origins: `https://<新社名>-system.vercel.app`
- Authorized redirect URIs: `https://<新社名>-system.vercel.app/api/auth/callback/google`
- AUTH_GOOGLE_ID_V2 / AUTH_GOOGLE_SECRET_V2 を vercel env に投入

---

## 3. DB Schema 初期化（15分）

### Step 3-1: drizzle migrations 全適用

```bash
cd /Users/tokikimito/projects/coaris/companies/<新社名>/system/app-v2
set -a && source .env.local && set +a
npm run db:migrate
```

`migrations/0000` 〜 `0003_phase_2a_alignment.sql` まで全適用される（Phase 2-A の手動 SQL も IF NOT EXISTS で no-op）。

### Step 3-2: scripts/setup-rls.sql 適用

```bash
/opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -f scripts/setup-rls.sql
```

→ 57 RLS policies 適用、tenant 分離確立。

### Step 3-3: scripts/setup-audit-immutable.sql 適用

```bash
/opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -f scripts/setup-audit-immutable.sql
```

→ TRIGGER × 2 + EVENT TRIGGER × 1 + FUNCTION × 3、audit_logs immutable 化。

---

## 4. 初期データ seed（必須、20分）

### Step 4-1: 自社 company レコード投入

```sql
INSERT INTO companies (id, name, type, is_hq) VALUES
  ('<UUID>', '<新社名>', 'subsidiary', false);
```

### Step 4-2: 初期メンバー投入（管理者最低1名）

```sql
INSERT INTO members (id, company_id, email, name, role, status) VALUES
  ('<UUID>', '<会社UUID>', 'president@<新社ドメイン>', '<社長名>', 'president', 'active');
```

### Step 4-3: ⚠️ **rbac seed（必須、5/4 22:00 顕在化リスク）**

```bash
set -a && source .env.local && set +a
npx tsx scripts/seed-rbac.ts
```

**確認**：
```bash
npx tsx scripts/test-rbac.ts
# 9/9 全通過なら OK
```

🚨 **これを忘れると hq_member / member が全 Action 権限なしで死ぬ**。tripot v2 で本番初期投入し忘れリスク発覚済（5/4 22:00 検出、即対応）。

### Step 4-4: Quotes / ProjectTemplates seed（任意）

```bash
# /settings/quotes で「初期データ投入」ボタン押下
# /settings/templates で同様
```

---

## 5. 公開前検証（30分）

### Step 5-1: production deploy

```bash
vercel --prod
```

### Step 5-2: production walk 16/16

```bash
# .env.local の DATABASE_URL を本番 URL に切替
npx tsx scripts/e2e-walk.ts
# /tmp/e2e-walk-results/<timestamp>/ で全画面スクショ確認
```

### Step 5-3: 動作確認チェックリスト

- [ ] `/login` Google OAuth 成功（自社ドメイン）
- [ ] 他社ドメインの Google アカウントで login → `/login?error=domain_not_allowed`
- [ ] 招待外メールで login → `/login?error=not_invited`
- [ ] member.status='inactive' で login → `/login?error=inactive`
- [ ] 既存JWT 持ちで status='inactive' 化 → 次 API request で 401 系エラー（ADR-0012）
- [ ] member ロールで `/deals/<id>/edit` の削除ボタン → 「権限がありません」（ADR-0011）
- [ ] hq_member ロールで `/team/<member>/page` の無効化ボタン → 表示される
- [ ] member ロールで同上 → 表示されない

---

## 6. モニタリング（5分）

### Step 6-1: Sentry プロジェクト作成 + DSN 投入

```bash
vercel env add NEXT_PUBLIC_SENTRY_DSN production
```

### Step 6-2: PostHog プロジェクト作成 + Key 投入

```bash
vercel env add NEXT_PUBLIC_POSTHOG_KEY production
vercel env add NEXT_PUBLIC_POSTHOG_HOST production
```

### Step 6-3: 動作確認

- 故意に `/throw-error` 等でエラー発生 → Sentry に届く
- ページ遷移 → PostHog に届く

---

## 7. 運用引き渡し（任意、リリース後）

- [ ] バックアップ確認（Neon の point-in-time recovery 7日保持）
- [ ] 月次レポート設定（`/monthly` ページ）
- [ ] ブリッジ通知設定（本部 → 各社、`bridge_notices`）
- [ ] 各社管理者へのトレーニング 30分

---

## ✅ 完了基準

1. `/login` で自社メンバーがログイン可能
2. 主要16ページ全部 200 OK / console error 0
3. test-rbac.ts 9/9 通過
4. Sentry / PostHog にイベント到達確認
5. audit_logs に sign_in.success が記録されている

→ **完了したら HANDOFF.md に「<新社名> 展開完了 YYYY-MM-DD」と記録**。

---

## 📝 改訂履歴

- 2026-05-05 02:18 初版（美桜起案、Phase 11-D 緊急対応の知見反映）
- 5/4 22:00 本番 role_permissions seed 漏れ事案 → Step 4-3 に必須項目化

---

*tripot v2 が13社展開で「コピペで動く」ためには、本チェックリストの遵守が前提。
Step 4-3（rbac seed）は特に「忘れると死ぬ」項目なので、tripotテンプレガイド SKILL にも明記推奨。*
