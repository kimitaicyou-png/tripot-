# ADR-0010: deals テーブル 粗利関連 column 追加（外注費・粗利・粗利率）

- **Status**: Proposed (2026-05-04)
- **Author**: 🌸 美桜（起案）
- **Reviewer**: 🍁 秋美（数字観点・粗利計算ロジック検証）/ ❄️ 美冬（UI 4箇所 デザイン）
- **Approver**: 美桜・夏美 同等権限で判断・執行（Phase B Updated 2026-05-04 17:22 隊長明示準拠、隊長は事後報告のみ）
- **Source**: 柏樹 P1-1 致命「粗利表示」（5/2 D-day 20turn 経営者ロープレ抽出）+ 経営哲学「粗利→営業利益→売上」（隊長 7原則）

---

## Context

### 経営哲学との不整合

隊長の経営哲学は「**粗利→営業利益→売上**」（feedback_taicho_management_style.md）。
売上ではなく粗利を起点に経営判断する設計が tripot v2 の基盤思想。

### 既存 schema の課題

現状の `deals` テーブル（src/db/schema.ts line 165-190）には：

- `amount`（受注金額 = 売上）あり
- `monthly_amount`（running 月額）あり
- **粗利・コスト系 column なし**

会社レベル（`monthly_summaries.actual_gross` / `weekly_summaries.actual_gross`）と制作レベル（`production_cards.actual_cost`）には粗利・コスト概念があるが、**deal 単体には欠落**。

### 柏樹の指摘（5/2 D-day 20turn ロープレ）

> 「経営者観点で deal 一覧を見たとき、**粗利が一目でわからない**。
> 売上だけ見せられても経営判断できない。
> 経営哲学で粗利優先と言いながら、画面では売上が主役になってる。
> これは取引先・IR・社内会議の全局面で**致命**。」

→ P1-1 致命級。隊長承認を経て migration が必要。
記録：`tripot-v2-may2-remaining-tasks.md` line 83
> 「柏樹 P1-1 粗利表示: 経営哲学「粗利→営業利益→売上」未対応、deals.gross_profit_rate 列なし、4-6h、隊長承認 + migration（5/2 デモで指摘リスク高）」

---

## Decision

### 設計方針：PostgreSQL Generated Column で自動計算

deals テーブルに 3列追加：

| 列名 | 型 | 種別 | 計算式 / 用途 |
|---|---|---|---|
| `external_cost` | BIGINT | 手動入力 | 外注費・仕入原価・直接費の合計（円）|
| `gross_profit` | BIGINT | Generated（STORED）| `amount - external_cost` |
| `gross_profit_rate` | NUMERIC(5,2) | Generated（STORED）| `gross_profit / amount * 100`（0除算ガード）|

### Generated Column を採用する理由

1. **自動整合性**：amount または external_cost が変わると粗利・粗利率が**必ず**追従する
2. **アプリ層に計算を持ち込まない**：複数 actions / UI でロジック重複しない（DRY）
3. **設計書 0040 「safeMath 経由」規律と整合**：DB 側で 0除算ガード（CASE WHEN amount > 0）
4. **インデックス可能**：粗利率順ソートが O(log n)、案件一覧の高速ソート対応
5. **既存 row 自動移行**：STORED は migration apply 時に既存 row も自動計算

### 既存 row の扱い

- `external_cost = 0`（default）が入る
- `gross_profit = amount`（売上 = 粗利として扱われる）
- `gross_profit_rate = 100.00`（amount > 0 の場合）

これは「過去の deals は外注費未入力 = 全額粗利として扱う」という運用判断。
適用後、運用フローで個別 deal の external_cost を入力していく。

### 関連実装（Phase 2 で同時実施）

| # | 対象 | 内容 |
|---|---|---|
| a | `src/db/schema.ts` | deals 定義に 3列追加（drizzle generated column 表記） |
| b | `src/lib/actions/deals.ts` | `external_cost` 更新 server action 追加 |
| c | `src/app/(dashboard)/home/[memberId]/deals/page.tsx` | 案件一覧 行に粗利率 badge |
| d | `src/app/(dashboard)/deals/[dealId]/page.tsx` | 案件詳細 4ブロック表示（受注金額/外注費/粗利/粗利率） |
| e | `src/app/(dashboard)/home/[memberId]/page.tsx` | 個人ダッシュボード 担当案件粗利合計 KPI |
| f | `src/app/(dashboard)/monthly/finance/page.tsx` | 既存集計との整合確認 |
| g | `src/lib/bridge/translator.ts` | ブリッジ KPI に粗利反映（本部連携）|
| h | `src/app/api/ai/generate-proposal/route.ts` 等 | AI 生成 prompt に external_cost プレースホルダ |

---

## Consequences

### Positive

1. **経営哲学の schema 体現**：「粗利→営業利益→売上」が DB 構造で表現される
2. **デモ即対応**：5/2 デモで指摘されても「ここに粗利率出てます」即答可
3. **取引先・IR 信頼性**：粗利率順ソートで案件評価が可能
4. **13社展開時のテンプレ正典**：deraforce / wise-assist 派生時にも標準装備
5. **会社レベル集計との整合**：deal 粗利の合計 = `monthly_summaries.actual_gross` の追跡可能
6. **計算重複排除**：UI 側で「amount - cost」を毎回書かなくて済む

### Negative / Trade-offs

1. **既存 row の運用漏れリスク**：external_cost が 0 のままの deal は「100%粗利」と表示される
   - **対策**：UI に「外注費未入力」warning badge、月次バッチで未入力 deal リスト通知
2. **複雑な原価構造に未対応**：間接費・人件費按分・原材料費は本 column では捉えきれない
   - **対策**：Phase 3 以降で deal_cost_breakdown 別 table 検討、本 column は「外部直接費」のみに限定
3. **Generated STORED は disk 容量増**：3列追加 + index 2本で 1 row あたり ~30 byte 増
   - **影響**：13社合計 100,000 deals 想定で ~3MB 増、Neon 課金影響軽微
4. **Generated Column の制約**：他テーブル参照不可、SUBQUERY 不可（PostgreSQL 仕様）
   - **影響**：tasks.estimated_cost / production_cards.actual_cost を join した「真の粗利」は別 view で実装する必要 → Phase 3 課題
5. **手動入力負担**：external_cost を担当者が入力する運用が必要
   - **対策**：見積確定時に AI で自動仮置き、PMが調整、UI フローで自然に入力されるように

### Operational Risk

- **destructive migration**：本番 deals テーブル ALTER（業務 critical table）
- **Phase 2 適用は深夜帯推奨**（5/2 D-day 後の通常運用時間外、G-3 audit immutable と同時 apply 可）
- **適用順序**：(a) pg_dump → (b) setup-deals-gross-profit.sql 適用 → (c) 確認クエリで列追加確認 → (d) UI deploy → (e) 本番 walk 16/16 → (f) 隊長 GO で完了
- **失敗時のロールバック**：teardown-deals-gross-profit.sql で 3列 + index DROP（external_cost CSV export を先に取得）

---

## Alternatives Considered

### A. アプリ層で都度計算（migration なし）

```ts
// actions/deals.ts
const grossProfit = deal.amount - (deal.external_cost ?? 0);
```

- ❌ external_cost 自体の column が無いと計算不能 → 結局 migration 必要
- ❌ 複数 UI で計算ロジック重複（DRY 違反）
- ❌ ソート不可（粗利率順表示が遅い）

### B. 計算 view（v_deals_with_gross）

```sql
CREATE VIEW v_deals_with_gross AS SELECT *, amount - external_cost AS gross_profit FROM deals;
```

- 🟡 deals 本体不変、軽量
- ❌ RLS policy を view にも適用する複雑さ
- ❌ index 効かない（view 経由のソートは遅い）
- 🟡 将来 deal_cost_breakdown 別 table 化する時の橋渡しに使える

### C. 別 table（deals_pricing）に粗利情報切り出し

```sql
CREATE TABLE deals_pricing (deal_id, external_cost, gross_profit, gross_profit_rate);
```

- 🟡 拡張性高い（人件費・間接費・段階別原価も追加可能）
- ❌ deal 一覧で必ず join 必要、画面ロード重くなる
- ❌ 既存 actions の書き換え範囲広い

### D. 本案（deals に Generated Column 追加）← 採用

- ✅ 経営哲学を schema レベルで体現
- ✅ 自動整合（amount/external_cost 変更で粗利自動再計算）
- ✅ index 効く（粗利率順ソート高速）
- ✅ アプリ層シンプル（DRY）
- ✅ 既存 row 自動移行
- 🟡 複雑な原価構造は別途（Phase 3 で deal_cost_breakdown 検討）

---

## Implementation Plan

### Phase 1（起案、5/4 美桜単独、destructive なし）

- [x] `scripts/setup-deals-gross-profit.sql` 起案
- [x] `scripts/teardown-deals-gross-profit.sql` 起案
- [x] `docs/adr/0010-deals-gross-profit-column.md` 起案（本ファイル）
- [ ] 秋美 数字観点監査（粗利計算ロジック・0除算ガード・運用未入力リスク）
- [ ] 美冬 UI 4箇所 デザイン草案（粗利率 badge / 4ブロック / KPI / monthly 整合）
- [ ] 夏美 戦略承認（経営哲学整合性・13社展開影響）
- [ ] 隊長承認 → Phase 2 移行

### Phase 2（実装、隊長承認後、destructive、深夜帯推奨）

- [ ] pg_dump バックアップ取得
- [ ] setup-deals-gross-profit.sql 適用
- [ ] schema.ts に 3列追加 + commit
- [ ] actions/deals.ts に external_cost 更新追加 + commit
- [ ] UI 4箇所実装 + commit（美冬 草案ベース）
- [ ] ブリッジ translator.ts 反映 + commit
- [ ] AI prompt 拡張 + commit
- [ ] production walk 16/16 確認
- [ ] 動作確認：sample deal で external_cost 入力 → 粗利率自動更新確認

### Phase 3（運用フロー反映）

- [ ] 「外注費未入力」warning badge / 月次バッチ通知
- [ ] AI 提案書/見積生成時の external_cost プレースホルダ運用化
- [ ] 13社展開チェックリスト追加
- [ ] Phase 4 検討：deal_cost_breakdown 別 table（人件費按分・間接費反映）

---

## References

- 柏樹 P1-1「粗利表示」（5/2 D-day 20turn 経営者ロープレ）
- 隊長 7原則「粗利→営業利益→売上」（feedback_taicho_management_style.md）
- `tripot-v2-may2-remaining-tasks.md` line 83
- `src/db/schema.ts` line 165-190（deals 定義）
- `src/db/schema.ts` line 263-299（weekly/monthly_summaries の actual_gross 既存実装）
- ADR-0009「audit_logs immutable」（同 5/4 起案、Phase 2 同時適用候補）
- 起動ファイル `~/.claude/memory/shared/session-handoff-2026-05-04-tripot-v2-completion-launch.md` 残作業 #1
- PostgreSQL Generated Columns 公式：https://www.postgresql.org/docs/current/ddl-generated-columns.html
