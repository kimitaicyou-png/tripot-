-- tripot v2 deals テーブル 粗利関連 column 追加
-- 🌸 美桜 起案 2026-05-04 / 柏樹 P1-1 致命「粗利表示」
-- ADR-0010 準拠
--
-- 背景：
-- 経営哲学「粗利→営業利益→売上」（隊長 7原則の3つ目）を schema レベルで体現する。
-- 既存 deals テーブルには amount（受注金額）のみで、粗利の概念がない。
-- 経営者・取引先・IR から「粗利どこ？」と聞かれた時に即答できない。
--
-- 既存設計：
--   - deals.amount = 受注金額（売上）
--   - production_cards.actual_cost = 制作実費
--   - tasks.estimated_cost = タスク見込みコスト
--   - 月次 / 週次 summaries に actual_gross あり（会社レベル）
--   → deal レベルでの粗利が欠落 = 柏樹 P1-1 の致命指摘
--
-- 本 migration の解：
--   PostgreSQL Generated Column（STORED）で amount - external_cost を自動計算
--   external_cost は手動入力（外注費・仕入原価・直接費）
--   既存 row には external_cost = 0 が default で入る = 既存粗利率は 100%（売上 = 粗利）
--   後続で actions.update_external_cost で運用フローに乗せる
--
-- ⚠️ 適用前提（必読）：
-- 1. 既存 deals row は全て external_cost = 0 で初期化される
--    （受注金額 = 粗利金額 として扱われる、運用で個別更新）
-- 2. Generated Column は PostgreSQL 12+ で利用可能（Neon は 15+ 対応済）
-- 3. STORED の generated は migration apply 時に既存 row も自動再計算
-- 4. drizzle-kit migration 0003 とは衝突しない（手動 psql 適用想定、scripts/ 配下）
-- 5. schema.ts への drizzle 定義反映は Phase 2 で同時実施
--
-- 🚨 destructive action：本適用は隊長明示承認必須

-- ============================================================
-- Stage 1. external_cost 列追加（手動入力用）
-- ============================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS external_cost BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN deals.external_cost IS
  '外注費・仕入原価・直接費の合計（円）。粗利計算の引き算項。手動入力。';

-- ============================================================
-- Stage 2. gross_profit 列追加（Generated Column、自動計算）
-- ============================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS gross_profit BIGINT
  GENERATED ALWAYS AS (
    COALESCE(amount, 0) - COALESCE(external_cost, 0)
  ) STORED;

COMMENT ON COLUMN deals.gross_profit IS
  '粗利金額（円）= amount - external_cost。Generated Column、自動計算。';

-- ============================================================
-- Stage 3. gross_profit_rate 列追加（Generated Column、自動計算）
-- ============================================================
-- 粗利率 = (amount - external_cost) / amount * 100
-- amount = 0 のケースは 0 を返す（0除算ガード、設計書 0040 safeMath 規律準拠）

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS gross_profit_rate NUMERIC(5, 2)
  GENERATED ALWAYS AS (
    CASE
      WHEN COALESCE(amount, 0) > 0 THEN
        ROUND(
          (COALESCE(amount, 0) - COALESCE(external_cost, 0)) * 100.0
          / COALESCE(amount, 1),
          2
        )
      ELSE 0
    END
  ) STORED;

COMMENT ON COLUMN deals.gross_profit_rate IS
  '粗利率（%、小数2桁）= gross_profit / amount * 100。0除算は0を返す。Generated Column。';

-- ============================================================
-- Stage 4. インデックス追加（検索・並び替え対応）
-- ============================================================

CREATE INDEX IF NOT EXISTS deals_gross_profit_idx
  ON deals (company_id, gross_profit DESC);

CREATE INDEX IF NOT EXISTS deals_gross_profit_rate_idx
  ON deals (company_id, gross_profit_rate DESC);

-- ============================================================
-- 5. 確認クエリ（Phase 2 適用後の検証用）
-- ============================================================

-- 5.1 列追加確認
-- SELECT column_name, data_type, is_generated, generation_expression
-- FROM information_schema.columns
-- WHERE table_name = 'deals'
--   AND column_name IN ('external_cost', 'gross_profit', 'gross_profit_rate');
--
-- 期待結果：
--   external_cost     | bigint  | NEVER  | (null)
--   gross_profit      | bigint  | ALWAYS | (amount - external_cost)
--   gross_profit_rate | numeric | ALWAYS | (CASE WHEN amount > 0 ...)

-- 5.2 既存 row の粗利率確認
-- SELECT id, title, amount, external_cost, gross_profit, gross_profit_rate
-- FROM deals
-- WHERE deleted_at IS NULL
-- ORDER BY company_id, gross_profit DESC
-- LIMIT 10;
--
-- 期待：external_cost = 0、gross_profit = amount、gross_profit_rate = 100.00（amount > 0 の場合）

-- 5.3 update テスト
-- UPDATE deals SET external_cost = 100000 WHERE id = (SELECT id FROM deals LIMIT 1);
-- → gross_profit / gross_profit_rate が自動再計算されること

-- ============================================================
-- 6. ロールバック（緊急時のみ、隊長明示承認必須）
-- ============================================================
-- 別ファイル `scripts/teardown-deals-gross-profit.sql` に分離

-- ============================================================
-- 7. 関連実装の Phase 2 タスク
-- ============================================================
-- 本 migration apply と同時に以下を実装：
--   a. schema.ts の deals に external_cost / gross_profit / gross_profit_rate 追加
--      （drizzle generated column 表記、Phase 2 で正確に反映）
--   b. actions/deals.ts に external_cost 更新 server action 追加
--   c. UI 4箇所追加（柏樹 P1-1 指摘範囲）：
--      - 案件一覧（/home/[memberId]/deals）→ 行に粗利率 badge
--      - 案件詳細（/deals/[dealId]）→ 受注金額/外注費/粗利/粗利率の4ブロック
--      - 個人ダッシュボード（/home/[memberId]）→ 担当案件の粗利合計 KPI
--      - 月次 finance（/monthly/finance）→ 既存集計との整合確認
--   d. ブリッジAPI translator.ts に粗利集計反映（本部 KPI 連携）
--   e. AI: 提案書/見積生成 prompt に external_cost プレースホルダ追加
