# ADR-0012: 退職者 JWT 即時無効化は `members.status` DB 再確認方式で実装

- **Status**: Accepted (2026-05-04 22:45、基盤実装完了 — ADR-0011 と同一基盤に統合)
- **Author**: 🌸 美桜（起案、夏美戦略判断ベース）
- **Strategic Decision**: 🎖️ 夏美（2026-05-04 22:31、Phase B Updated 権限）
- **Reviewer**: 🎩 セバスチャン（セキュリティ整合性）/ 🎩 碧（secret governance 整合性）
- **Approver**: 隊長 GO（2026-05-04 22:39、トランザムモード GO）
- **Source**: P0-2「退職者 JWT 即時無効化」（栗尾 G/P0 audit 観点）

---

## Context

### 残課題 P0-2 の背景

5/4 17:30 完成合議準備資料「§1-C 残作業 6件」より：

> P0-2: 退職者 JWT 即時無効化 / 工数 4h / 関門 🎖️ 夏美 GO 必須（セキュリティ設計）/ 5月リリース必須度 🟡 高

### 設計書読み込み（2026-05-04 22:39 隊長指示で発見）

**P0-2 は signIn 時には既に対応済**（auth.ts:105-115）：

```typescript
// 既存の signIn callback
if (member.status !== 'active') {
  await logAudit({ ..., action: 'sign_in.rejected.inactive' });
  return '/login?error=inactive';
}
```

**穴**：これは **新規ログイン時のみ** member.status を確認する。既に JWT を持っているユーザは status='inactive' に変更されても **30日 maxAge 切れまで有効**。

### `memberStatus` enum 既存（schema.ts:36）

```typescript
export const memberStatus = pgEnum('member_status', ['active', 'pending', 'inactive']);
```

**新規 column 追加なし**で revoke 表現可能。`status === 'inactive'` で「退職・無効化」を表現できる。前案の `revoked_at` カラム新規追加は **過剰設計**だった。

### 設計判断（夏美 22:31）

> 8時間短縮は運用ストレスが高い（8時間ごとに再ログイン）。DB に `user_revoked_at` カラムを持たせ、API リクエスト時に照合する方式。Better Auth 移行後もこのカラムは引き継げる。

→ 設計書読み込みで**既存 `members.status` を活用すれば新規カラム不要**と判明。夏美設計の「DB 再確認」核心は維持、表現手段だけ既存資産活用に変更。

---

## Decision

### **既存 `members.status` enum を活用、API 実行時に DB 再確認**

#### 既存 schema（変更なし）

```typescript
// src/db/schema.ts:36, 126（既存）
memberStatus: pgEnum('member_status', ['active', 'pending', 'inactive']);
members: {
  // ...
  status: memberStatus('status').notNull().default('active'),
  deleted_at: timestamp(...) | null,
}
```

**migration 不要**（前案の `revoked_at` カラム追加を撤回）。

#### Phase 12-A 実装（ADR-0011 と同一基盤、22:45 完了）

`src/lib/rbac/auth-guard.ts` の `requireActiveMember` で実装：

```typescript
export async function requireActiveMember(): Promise<AuthGuardResult> {
  const session = await auth();
  if (!session?.user?.member_id || !session.user.company_id) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const member = await db
    .select({ status: members.status, deleted_at: members.deleted_at })
    .from(members)
    .where(and(
      eq(members.id, session.user.member_id),
      eq(members.company_id, session.user.company_id)
    ))
    .limit(1)
    .then((rows) => rows[0]);

  if (!member || member.deleted_at) {
    return { ok: false, reason: 'deleted' };
  }
  if (member.status !== 'active') {
    return { ok: false, reason: 'inactive' };
  }

  await setTenantContext(session.user.company_id);
  return { ok: true, session: session as ActiveSession };
}
```

**ADR-0011 の `requirePermission` 内部で自動的に呼ばれる**ため、各 Server Action は `requirePermission({resource, action})` 1行だけで P0-2 + G-1 両方成立。

#### 即時無効化フロー（管理者操作）

1. 管理画面 `/team/[memberId]/edit` から `status` を `'active'` → `'inactive'` に変更（既存UIで対応済 or 軽微追加）
2. または DB 直接：`UPDATE members SET status = 'inactive' WHERE id = ?`
3. 退職者の **次回 API request** で `requireActiveMember` が `'inactive'` 検知 → `error: 'アカウントが無効化されています'` 返却

**遅延：ゼロ**（cache 未導入のため、即時反映）。後日 KV cache 5min layer を被せる場合は cache invalidation で対応。

### Phase 構成

| Phase | 内容 | 工数 | 状態 |
|---|---|---|---|
| 12-A | requireActiveMember 実装（ADR-0011 統合）| 0.5h | ✅ **2026-05-04 22:45 完了** |
| 12-B | 残35 Action への requirePermission 適用（ADR-0011 11-B と同一バッチ）| — | ADR-0011 11-B に統合 |
| 12-C | `/team/[memberId]/edit` で status 変更UI 確認・必要なら追加 | 0.5h | 5/5 |
| 12-D | E2E テスト（active→inactive 後即時 401 確認）| 0.5h | 5/5 |

**合計実態 1.5h**（夏美見積もり 4h を 1/3 に圧縮、ADR-0011 と統合実装で重複ゼロ）。

---

## Consequences

### Positive

- **30日 maxAge 維持**：再ログイン頻度ストレスなし（隊長 UX 維持）
- **即時性確保**：cache 未導入なら次 request で即反映、致命級は数秒以内に無効化反映
- **新規 column 追加ゼロ**：既存 `memberStatus` enum 活用、migration 不要
- **schema変更なし**：drizzle journal 整合性の追加負担なし
- **ADR-0011 と統合**：1つのガード関数 `requirePermission` で G-1 + P0-2 両方成立
- **G-3 audit immutable 整合**：member status 変更は `member.deactivate` action として logAudit 記録済（既存）
- **Better Auth 移行整合**（ADR-0002）：Better Auth は `user.status` または `user.banned` 標準サポート、`memberStatus` enum マッピング容易

### Negative

- **DB 1 query 追加** per request（KV cache 未導入）：レイテンシ +5-10ms
- **cache 未導入**：将来 KV cache 5min を被せる際は cache invalidation pattern を設計必要

### Risks

- DB 接続障害時 → fail-closed（`reason: 'deleted'` 相当）が安全側
- 'pending' status の扱い：active 以外は全部拒否なので、初回ログイン待ちユーザは API 不可（仕様として明示）

---

## 前案（過剰設計）の撤回理由

前案では `members.revoked_at` 新規カラム追加 + `revoked_reason` 列追加 + Vercel KV cache layer を提案。実態調査の結果：

1. **`members.status` enum 既存** → 新規カラム不要
2. **`memberStatus` の `'inactive'` 値** が既に「退職・無効化」セマンティクスを担う設計だった
3. **既存 signIn callback** が同じ列で同じ判定を実装 → API 側でも同じ列を見れば対称性確保
4. **KV cache 未導入でも 1 query/request は許容範囲**（req tail 上で 5-10ms）

→ **既存資産を最大活用**するのが最高品質（隊長指示「最高のものを今つくれ」遵守）。

---

## 次のアクション

1. ✅ 美桜：本 ADR を docs/adr/ に追加（本コミット）
2. ⏳ 美桜：`/team/[memberId]/edit` の status 変更UI を確認（5/5）
3. ⏳ 美桜：E2E テスト（active→inactive 即時無効化）を ADR-0011 11-C と統合実施（5/5）
4. ⏳ 碧：将来 KV cache layer 導入時の secret governance 整合性レビュー（リリース後）

*この ADR は夏美の戦略判断 + 隊長承認下、美桜が起案・基盤実装まで完走。実装は今夜 22:45 時点で Phase 12-A 完了。ADR-0011 と統合実装により総工数 12h → 5.5h に圧縮。*
