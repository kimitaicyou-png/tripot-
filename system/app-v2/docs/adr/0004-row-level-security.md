# ADR-0004: 行レベルセキュリティ（RLS）で 13社テナント分離

**Status**: Accepted
**Date**: 2026-04-26
**Deciders**: 🍁秋美・🎩セバスチャン

## Context

13社展開時、tripot のデータと deraforce のデータは絶対に混じってはいけない。実装ミスで他社データが見える事故は致命的。

## Decision

**全テーブルに `company_id` を含め、PostgreSQL Row-Level Security（RLS）で物理分離する。**

## Implementation

### Schema

```sql
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_deals ON deals
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);
```

全テーブル（deals / customers / members / tasks / actions / budgets / weekly_summaries / monthly_summaries / approvals / mf_journals / mf_invoices）に同一パターンを適用。

### API ルート

```typescript
import { setTenantContext } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });
  await setTenantContext(session.user.company_id);
  // 以降のクエリ全部に company_id フィルタが自動適用
  const deals = await db.select().from(deals);
  return Response.json(deals);
}
```

## Consequences

### Positive

- **アプリケーション層のバグでも他社データ漏洩しない**（DB側で物理ブロック）
- 13社追加のたびに RLS ポリシーを書き直す必要なし
- 監査担当（外部監査人含む）が SQL で直接見ても tenant 別に区切られる

### Negative

- `setTenantContext()` を全 API ルートで呼び出す必要あり（middleware で自動化検討）
- パフォーマンス：RLS による index 利用効率の確認必要（次フェーズ）

## Alternatives Considered

- **アプリケーション層での company_id フィルタのみ**：実装ミスで漏洩リスク
- **テナント別 schema**：13社で13schema は管理コスト高
- **テナント別 DB**：完全分離だが Neon のbranch でも管理コスト高

## References

- セバス設計：`~/.claude/memory/shared/tripot-v2-auth-design.md`
- 秋美設計：`~/.claude/memory/shared/tripot-v2-db-design.md`
