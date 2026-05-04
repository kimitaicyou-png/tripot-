# ADR-0009: audit_logs テーブル immutable 化（DELETE/UPDATE/TRUNCATE 物理ブロック）

- **Status**: Proposed (2026-05-04)
- **Author**: 🌸 美桜（起案）
- **Reviewer**: 🎩 セバス（監査）/ 🍁 秋美（IR/監査整合性）
- **Approver**: 美桜・夏美 同等権限で判断・執行（Phase B Updated 2026-05-04 17:22 隊長明示準拠、隊長は事後報告のみ）
- **Source**: 栗尾 G-3 致命「監査ログ DB で本当に消せない化」（5/2 D-day 20turn ロープレ抽出）

---

## Context

### 監査ログの位置付け

`audit_logs` テーブルは、tripot v2 において**全 Server Action 経由のあらゆる業務操作の証跡**として `logAudit()` ヘルパー（`src/lib/db.ts`）で書き込まれる。

13社展開後、IR・監査・プロキシーファイト等の局面で「**誰がいつ何を改ざんしたか**」を物理的に証明する必要がある（特にホワイトベア IR 案件のような機密度極高の場面）。

### 既存防御の限界

`scripts/setup-rls.sql` には audit_logs に対する以下のポリシーが定義されている：

```sql
CREATE POLICY tenant_isolation_audit_select ON audit_logs FOR SELECT ...
CREATE POLICY tenant_isolation_audit_insert ON audit_logs FOR INSERT ...
```

これは **DELETE/UPDATE policy が存在しない**ことで、アプリ層からは事実上 DELETE/UPDATE できない状態を作る。

しかし以下のケースで履歴が消える/改ざんされる余地が残る：

1. **PostgreSQL superuser** からの直接 `DELETE FROM audit_logs WHERE ...`
2. **BYPASSRLS attribute を持つ role** からの直接操作
3. **TRUNCATE TABLE audit_logs**（policy で防げない、テーブル全消し）
4. **DROP TABLE audit_logs**（policy で防げない、テーブル消滅）
5. **オペミス**（pgAdmin / Neon Console の GUI から削除）
6. **DB role 奪取**シナリオでの攻撃者操作

### 栗尾の指摘（5/2 D-day 20turn ロープレ）

> 「監査ログが**論理的に消せる**ということは、IR 局面で『改ざんしてないと証明できない』。
> RLS policy だけでは superuser / TRUNCATE / DROP の前で無力。
> **物理的に append-only であること**が監査の前提。」

→ G-3 致命級。隊長承認を経て migration が必要。

---

## Decision

### 設計方針：4-stage 多層防御

| Stage | 内容 | 実装手段 | 防御対象 |
|---|---|---|---|
| 1 | ROW-level immutable trigger | `BEFORE DELETE OR UPDATE TRIGGER` + `RAISE EXCEPTION` | DELETE / UPDATE |
| 2 | STATEMENT-level immutable trigger | `BEFORE TRUNCATE TRIGGER` + `RAISE EXCEPTION` | TRUNCATE |
| 3 | EVENT TRIGGER（DDL block） | `ON sql_drop` + DROP TABLE 検出で `RAISE EXCEPTION` | DROP TABLE |
| 4 | role-based 権限剥奪 | `REVOKE UPDATE, DELETE, TRUNCATE` | アプリ role 多層防御 |

### Stage 1-3 が必須、Stage 4 は推奨

- Stage 1-3：DB 層で物理的に block。**superuser でも RAISE EXCEPTION 発生**（trigger は superuser を含む全 role に適用）
- Stage 4：アプリ用 role 自体に DELETE/UPDATE/TRUNCATE 権限を与えない。多層防御の追加層

### 実装ファイル

- `scripts/setup-audit-immutable.sql` ← 起案済（本 ADR と同時、5/4）
- `scripts/teardown-audit-immutable.sql` ← 緊急ロールバック用（Phase 2 で起案）
- `scripts/test-audit-immutable.sql` ← 動作確認テスト（Phase 2 で起案）

### 既存 setup-rls.sql との関係

**併用、直交関係**：

- `setup-rls.sql` policy = アプリ層の company_id 分離（**テナント間漏洩防止**）
- `setup-audit-immutable.sql` trigger = DB 層の immutable 保証（**履歴改ざん防止**）

両方の適用が栗尾 G-3 + ADR-0004 の両立条件。

---

## Consequences

### Positive

1. **IR・監査の信頼性確保**：「audit_logs は物理的に消せない」が技術保証になる
2. **プロキシーファイト耐性**：ホワイトベア級の機密案件でも証跡が残る
3. **オペミス保護**：pgAdmin/Neon Console での誤操作も block
4. **superuser 攻撃への耐性**：DB role 奪取シナリオでも履歴は守られる
5. **13社展開時のテンプレ整合性**：deraforce/wise-assist/他社展開時にも同 migration が標準装備となる

### Negative / Trade-offs

1. **正当な audit_logs cleanup の手段を失う**：例えば「テスト環境で fixture 投入後の reset」に TRUNCATE が使えなくなる
   - **対策**：test 環境用に `teardown-audit-immutable.sql` を整備、テスト前に「dropping immutable for test, will restore」プロトコル明文化
2. **migration を間違えると緊急 cleanup 不能**：誤投入 audit_logs の修正が手動 INSERT 補正のみになる
   - **対策**：Phase 2 適用前に必ず pg_dump バックアップ、隊長 + セバス 立会
3. **trigger の RAISE EXCEPTION が大量発生するとパフォーマンス影響**：通常の INSERT/SELECT には影響しないが、攻撃時のログが膨らむ可能性
   - **対策**：Stage 4 role 剥奪を併用すれば、そもそも trigger まで到達しない（最も推奨）

### Operational Risk

- **destructive migration**：本番 DB に trigger 追加 = 既存挙動変更
- **Phase 2 適用は深夜帯推奨**（5/2 D-day 後の通常運用時間外）
- **適用順序**：(a) pg_dump → (b) setup-rls.sql 適用済確認 → (c) setup-audit-immutable.sql 適用 → (d) test-audit-immutable.sql で動作確認 → (e) 本番 walk 16/16 → (f) 隊長 GO で完了
- **失敗時のロールバック**：teardown-audit-immutable.sql で trigger DROP（隊長明示承認、深夜立会）

---

## Alternatives Considered

### A. PostgreSQL の `CREATE RULE ... DO INSTEAD NOTHING`（旧式）

- ❌ PostgreSQL 公式が**非推奨**（trigger に置換すべき）
- ❌ TRUNCATE には効かない

### B. アプリ層で DELETE/UPDATE 関数を一切書かない（現状）

- ❌ DB superuser/BYPASSRLS/TRUNCATE/DROP に対して無力
- ❌ 「論理的にはアプリで防いでる」≠「物理的に消せない」

### C. 別 DB（読み取り専用 replica）に audit_logs を export

- 🟡 重い、運用複雑、tripot v2 の Neon シンプル構成と整合しない
- 🟡 13社展開時にテンプレ化困難
- 5月リリース後の Phase 2 拡張時に再検討余地

### D. 本案（trigger + event trigger + role 多層防御）← 採用

- ✅ DB 層で物理的に block
- ✅ superuser でも RAISE EXCEPTION
- ✅ シンプル、Neon HTTP 接続でも動作
- ✅ 13社展開時にテンプレ化可能（同 SQL を deraforce/wise-assist にも適用）
- ✅ 緊急時の teardown も明示的 SQL 必要 = 「うっかり」では戻せない

---

## Implementation Plan

### Phase 1（起案、5/4 美桜単独、destructive なし）

- [x] `scripts/setup-audit-immutable.sql` 起案
- [x] `docs/adr/0009-audit-logs-immutable.md` 起案（本ファイル）
- [ ] セバス監査要請（記録整合性 + 13社展開影響）
- [ ] 夏美 戦略承認（IR/監査整合性、Phase 2 タイミング判断）
- [ ] 秋美 数字観点監査（パフォーマンス影響、role 戦略）
- [ ] 隊長承認 → Phase 2 移行

### Phase 2（実装、隊長承認後、destructive）

- [ ] pg_dump バックアップ取得
- [ ] `scripts/test-audit-immutable.sql` 起案（DELETE/UPDATE/TRUNCATE/DROP 4種の block 動作確認）
- [ ] `scripts/teardown-audit-immutable.sql` 起案（緊急ロールバック）
- [ ] Stage 1-3 適用（深夜帯、隊長 + セバス + 美桜 立会）
- [ ] test 実行 → 4種全 block 確認
- [ ] 本番 production walk 16/16 確認
- [ ] DATABASE_URL の実 role 名確認 → Stage 4 適用判断

### Phase 3（運用フロー反映）

- [ ] `docs/rls-rollout.md` に audit_logs immutable 章追加
- [ ] `tripotテンプレガイド` SKILL.md に「派生時 setup-audit-immutable.sql も適用」を明記
- [ ] 13社展開時のチェックリストに組み込み

---

## References

- 栗尾 G-3「監査ログ DB で本当に消せない化」（5/2 D-day 20turn ロープレ）
- ADR-0004「Row-Level Security で 13社テナント分離」
- `scripts/setup-rls.sql`（既存テナント分離）
- `src/db/schema.ts` line 322-343（audit_logs テーブル定義）
- `src/lib/db.ts` line 41-61（logAudit ヘルパー）
- 起動ファイル `~/.claude/memory/shared/session-handoff-2026-05-04-tripot-v2-completion-launch.md` 残作業 #3
- PostgreSQL 公式: [Trigger Procedures](https://www.postgresql.org/docs/current/plpgsql-trigger.html), [Event Triggers](https://www.postgresql.org/docs/current/event-triggers.html)
