-- tripot v2 deals 粗利 column 緊急ロールバック
-- 🌸 美桜 起案 2026-05-04 / ADR-0010 緊急時用
--
-- ⚠️ 🚨 destructive action：本適用は隊長明示承認必須 🚨 ⚠️
--
-- 本ファイルは setup-deals-gross-profit.sql で追加した
-- external_cost / gross_profit / gross_profit_rate 3列と関連 index を削除する。
--
-- 削除すると粗利表示が DB から消える。UI 側の表示は壊れる。
-- 以下の局面でのみ実行する：
--
-- 1. setup-deals-gross-profit.sql 適用後に重大バグが発覚した時
-- 2. external_cost 設計を別案（例：別 table 化）に変更する移行時
-- 3. 隊長 + 夏美 + 美桜 + 秋美 の合議承認時
--
-- ⚠️ 適用前提（必読）：
-- 1. 隊長明示承認確認済み（HANDOFF.md に記録）
-- 2. 既存 deals.external_cost に入った業務データ（外注費）の保全先確認済み
--    → 削除前に CSV export 必須：
--      \copy (SELECT id, title, amount, external_cost FROM deals) TO 'deals-cost-backup.csv' CSV HEADER
-- 3. UI 側で粗利表示を呼んでいる箇所のロールバック計画あり
-- 4. 関連 schema.ts / actions の revert commit を準備

-- ============================================================
-- 解除確認プロンプト（手動チェック）
-- ============================================================
-- [ ] 隊長承認証跡（HANDOFF.md / Notion 記録済）
-- [ ] external_cost CSV export 完了（ファイルパス記録）
-- [ ] schema.ts revert commit 準備完了
-- [ ] UI 側 gross_profit 表示の hide 計画策定済
-- [ ] 5姉妹+執事 のうち 2名以上立会

-- ============================================================
-- Stage 1: index DROP
-- ============================================================

DROP INDEX IF EXISTS deals_gross_profit_idx;
DROP INDEX IF EXISTS deals_gross_profit_rate_idx;

-- ============================================================
-- Stage 2: Generated Column DROP（依存関係順）
-- ============================================================

ALTER TABLE deals DROP COLUMN IF EXISTS gross_profit_rate;
ALTER TABLE deals DROP COLUMN IF EXISTS gross_profit;

-- ============================================================
-- Stage 3: external_cost DROP（業務データ消失、要 CSV export 完了確認）
-- ============================================================

ALTER TABLE deals DROP COLUMN IF EXISTS external_cost;

-- ============================================================
-- 確認クエリ
-- ============================================================

-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'deals'
--   AND column_name IN ('external_cost', 'gross_profit', 'gross_profit_rate');
-- 期待結果：0 rows

-- ============================================================
-- 後続作業
-- ============================================================
-- 1. schema.ts から該当列を削除（commit）
-- 2. actions/deals.ts から external_cost 入力ロジック削除
-- 3. UI 4箇所から粗利表示を削除（または hide）
-- 4. ブリッジAPI translator.ts の粗利集計を hide
-- 5. HANDOFF.md に teardown 経緯と次の移行設計を記録
