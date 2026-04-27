# RLS Rollout Guide（B0.4 適用手順書）

> 🚨 **destructive action：適用は隊長明示承認必須**
> 適用前に必ずバックアップ、ロールバック手順を確認してから本番反映する。

## 全体像

tripot v2 は **DB層でテナント分離を物理保証**する設計。Postgres RLS（Row Level Security）と `current_setting('app.current_company_id')` を組み合わせ、アプリ層のミスでもクロステナント漏洩しない。

## 適用順序（必須）

### Phase 0：準備（現状）

- [x] `setup-rls.sql` 起草（手書き 13 + 自動拡張で 56 テーブル全対応）
- [x] `src/lib/db.ts` に `setTenantContext(companyId)` ヘルパー実装済
- [x] migrations/0002_b1_10_deal_resources.sql 適用後に RLS 適用する順序を確定

### Phase 1：Server Actions / Route Handlers に setTenantContext 一括挿入

**現状未挿入**（2026-04-28 時点）。RLS を ON にする前に、全 30+ Server Actions の `auth()` 直後に以下を入れる：

```ts
import { setTenantContext } from '@/lib/db';

export async function someAction(...) {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);  // ← ここ

  // 既存のビジネスロジック
  ...
}
```

**対象（推定）**：
- `src/lib/actions/*.ts` 全 30 ファイル
- `src/app/api/**/route.ts` 約 7 ファイル

**バッチ作戦**：grep + sed で機械的挿入も可能だが、各ファイルの auth check 形式が微妙に違うので **手動で1ファイルずつ**確認しながら入れるのが安全。

### Phase 2：本番 DB に setup-rls.sql 適用（隊長承認後）

```bash
# 1. バックアップ
pg_dump $DATABASE_URL --schema=public > backup_pre_rls_$(date +%Y%m%d).sql

# 2. RLS 有効化
psql $DATABASE_URL -f scripts/setup-rls.sql

# 3. 確認
psql $DATABASE_URL -c "
  SELECT schemaname, tablename, rowsecurity
  FROM pg_tables WHERE schemaname = 'public'
  ORDER BY tablename;
"
```

### Phase 3：E2E 検証（必須）

- [ ] /home /deals /customers /tasks /weekly /monthly 全画面で空表示にならないこと（setTenantContext が効いている証拠）
- [ ] 別テナント（13社シミュレーション）からアクセスして空結果が返ること
- [ ] audit_logs INSERT が成功すること
- [ ] /api/bridge/kpi が正常に動作すること

### Phase 4（緊急時）：ロールバック

```bash
# 個別ロールバック
psql $DATABASE_URL -c "
  ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
  DROP POLICY tenant_isolation_deals ON deals;
"

# 全テーブル無効化（隊長承認必須）
psql $DATABASE_URL -c "
  DO \$\$
  DECLARE r RECORD;
  BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
      EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
  END \$\$;
"
```

## チェックリスト（隊長承認用）

承認時、以下を確認：

- [ ] バックアップ取得済（`backup_pre_rls_YYYYMMDD.sql`）
- [ ] 全 Server Actions に setTenantContext 挿入済（Phase 1 完了）
- [ ] dev 環境で全画面動作確認済
- [ ] ロールバック手順を全姉妹が把握
- [ ] 適用時刻が業務時間外（深夜推奨）

## なぜこの順序か

setup-rls.sql 適用後、setTenantContext が呼ばれていない Server Action から DB アクセスすると：

```
PG ERROR: invalid input syntax for type uuid: ""
（current_setting('app.current_company_id') が空文字を返す）
```

→ 全画面が一斉に壊れる。**Phase 1 完了が物理的な前提**。

## なぜこれが重要か

13社展開時、たとえば「tripot のメンバーが誤って deraforce のデータを見る/更新する」事故をアプリ層のバグだけで防ぐのは脆弱。RLS で **DB 層に物理的な壁** を作ることで、コードレビュー漏れがあってもクロステナント漏洩しない。

これが「13社の信頼を1人で受け止める」ための最後のセーフティネット。

## 関連 ADR

- ADR-0004 RLS 採用（Phase 0 V4）
- ADR-0008 basePath 撤去（Multi-Zones の整合）

## 参考

- `scripts/setup-rls.sql`（実SQL）
- `src/lib/db.ts` の `setTenantContext` 実装
- 設計書 B0.4 / B0.5 ブロック
