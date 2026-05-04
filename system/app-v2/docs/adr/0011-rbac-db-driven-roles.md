# ADR-0011: rbac は DB 参照型ロール定義を採用（13社展開対応）

- **Status**: Accepted (2026-05-04 22:45、基盤実装完了)
- **Author**: 🌸 美桜（起案、夏美戦略判断ベース）
- **Strategic Decision**: 🎖️ 夏美（2026-05-04 22:31、Phase B Updated 権限）
- **Reviewer**: 🎩 セバスチャン（整合性・13社展開影響評価）/ 🍁 秋美（権限マトリクス数字検証）
- **Approver**: 隊長 GO（2026-05-04 22:39、「当たり前やんか？ハードコードは絶対NG」）
- **Source**: G-1「rbac 36 Action 適用」（柏樹 + 栗尾級 5/2 D-day ロープレ）/ 13社展開要件

---

## Context

### 残課題 G-1 の背景

5/4 17:30 完成合議準備資料「§1-C 残作業 6件」より：

> G-1: rbac 36 Action 適用 / 工数 8h / 関門 🎖️ 夏美 GO 必須（設計判断）/ 5月リリース必須度 🟡 高

### 設計書読み込み（2026-05-04 22:39 隊長指示「設計書読み込め」で発見）

**G-1 の基盤は既に存在していた**：

1. **`role_permissions` table**（schema.ts:964-978、`(company_id, role, resource, action, allowed)` triplet unique、整数 0/1 型）
2. **`role-permissions-meta.ts`** に `RESOURCES`（17種）/ `ACTIONS_BY_RESOURCE` / `ROLES`（president/hq_member/member）/ `DEFAULT_MATRIX` 完備
3. **`seedDefaultRolePermissions`** action: 初期 seed 投入
4. **`updateRolePermission`** action: 動的編集
5. **`/settings/roles`** 管理画面で president/hq_member が動的編集可能

つまり **DB 参照型は既に基盤完備**、残作業は「Action 36本に check を挿入する」だけ。

### 設計判断（夏美 22:31）

> ハードコード型は 13社展開で破綻する。各社でロール定義が微妙に違う（例: deraforce は「営業マネージャー」が tripot の「チーフ」相当）。DB 参照型にしておけばテナントごとのカスタムロールに対応できる。実装コストが増えるが、それを後から変えるコストの方が大きい。

### 隊長承認（22:39）

> 「当たり前やんか？ハードコードは絶対NG」

---

## Decision

### **DB 参照型を採用、既存 `role_permissions` テーブルを活用**

#### 既存 schema（変更なし）

```typescript
// src/db/schema.ts:964-978（既存）
role_permissions: {
  id: uuid PK,
  company_id: uuid (RLS),
  role: memberRole enum,    // 'president' | 'hq_member' | 'member'
  resource: text,            // 'deal' | 'estimate' | ... 17種
  action: text,              // 'create' | 'read' | ... resource 別
  allowed: integer (0 | 1),  // ON/OFF
  created_at: timestamptz,
  // unique(company_id, role, resource, action)
}
```

#### Phase 11-A 実装（2026-05-04 22:45 完了、本ADR成立時）

新規 3ファイル（合計約120行）：

```
src/lib/rbac/
  ├── check-permission.ts    — checkPermission(companyId, role, resource, action)
  ├── auth-guard.ts          — requireActiveMember() + requirePermission({resource, action})
  └── index.ts               — re-export
```

#### 各 Server Action での使い方

**Before**:
```typescript
export async function deleteDeal(dealId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);
  // ... 業務処理
}
```

**After**:
```typescript
import { requirePermission } from '@/lib/rbac';

export async function deleteDeal(dealId: string): Promise<void> {
  const guard = await requirePermission({ resource: 'deal', action: 'delete' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;
  // ... 業務処理（auth + tenant context + 権限 + revoke 検知 全部済）
}
```

`requirePermission` 内で以下が一括処理：
1. `auth()` 認証チェック
2. `members.status === 'active' AND deleted_at IS NULL` DB 再確認（**ADR-0012 P0-2 統合**）
3. `setTenantContext(company_id)` （RLS）
4. `role_permissions` 参照で権限照合（president は早期 return true）

### Phase 構成

| Phase | 内容 | 工数 | 状態 |
|---|---|---|---|
| 11-A | rbac/ 基盤3ファイル + 1Action 試験適用 + 型検証 | 30分 | ✅ **2026-05-04 22:45 完了** |
| 11-B | 残35 Action へ requirePermission 適用（grep+edit バッチ）| 2-3h | 5/5 朝着手 |
| 11-C | E2E テスト（president/hq_member/member 各ロール × 主要パス）| 1h | 5/5 |
| 11-D | seed-default 動作確認（13社展開時のチェックリスト）| 30分 | 5/5-5/6 |

**合計実態 4-5h**（夏美見積もり 8h を半減）。

---

## Consequences

### Positive

- **13社展開耐性**：各社ロール差異を `role_permissions` で吸収、`coaris.config.ts` の `customRoles` で上書き可能
- **動的変更可能**：管理画面 `/settings/roles` から編集、コードリリース不要
- **Better Auth 移行整合**（ADR-0002）：DB 参照型は Better Auth 標準パターン
- **G-3 audit immutable 整合**（ADR-0009）：`role_permission.update` / `seed` は logAudit で記録済
- **P0-2 統合**：`requirePermission` 内で revoke 検知（ADR-0012）も同時成立、各 Action で2重ガード不要

### Negative

- **DB 1 query 追加** per Action（president 以外）：レイテンシ +5-10ms、KV cache layer は Phase 後に検討
- **seed 整合性**：新会社立ち上げ時に default roles seed 忘れリスク → tripotテンプレガイド SKILL に必須項目化推奨

### Risks

- カスタムロール乱立 → admin 機能で監査・統合必須、`/settings/roles` で可視化済
- `allowed=0` の row が存在する vs row 自体が無い → 同じ「拒否」扱い（`(row?.allowed ?? 0) === 1`）

---

## 実装コード抜粋

### checkPermission（src/lib/rbac/check-permission.ts）

```typescript
export async function checkPermission(
  companyId: string,
  role: Role,
  resource: string,
  action: string
): Promise<boolean> {
  if (role === 'president') return true; // 全権、DB 引かない

  const row = await db
    .select({ allowed: role_permissions.allowed })
    .from(role_permissions)
    .where(and(
      eq(role_permissions.company_id, companyId),
      eq(role_permissions.role, role),
      eq(role_permissions.resource, resource),
      eq(role_permissions.action, action)
    ))
    .limit(1)
    .then((rows) => rows[0]);

  return (row?.allowed ?? 0) === 1;
}
```

### requirePermission（auth-guard.ts、ADR-0012 統合）

```typescript
export async function requirePermission(params: {
  resource: string;
  action: string;
}): Promise<RequirePermissionResult> {
  const member = await requireActiveMember(); // ADR-0012 P0-2 DB 再確認
  if (!member.ok) {
    return { ok: false, error: ..., reason: member.reason };
  }

  const allowed = await checkPermission(
    member.session.user.company_id,
    member.session.user.role,
    params.resource,
    params.action
  );

  if (!allowed) {
    return { ok: false, error: 'この操作の権限がありません', reason: 'forbidden' };
  }

  return { ok: true, session: member.session };
}
```

---

## 次のアクション

1. ✅ 美桜：本 ADR を docs/adr/ に追加（本コミット）
2. ⏳ 美桜：Phase 11-B（残35 Action 適用）を 5/5 朝着手
3. ⏳ セバス：13社展開時の rbac seed 監査をスナップショット監視項目に追加
4. ⏳ 秋美：3ロール × 主要パス E2E テスト（5/5）

*この ADR は夏美の戦略判断 + 隊長承認下、美桜が起案・基盤実装まで完走。実装は今夜 22:45 時点で Phase 11-A 完了。*
