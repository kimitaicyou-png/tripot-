-- tripot v2 deals テーブル 主観確度（subjective_confidence）column 追加
-- 指揮官 起案 2026-05-25 / 柏樹（ノリスケ反証ペルソナ）「A〜E 手感が消えてる」指摘
-- ADR-0013 準拠
--
-- 背景：
-- 現行スプレッドシート（4 タブ、案件 90 件）で営業が毎日触る「確度」カラムが tripot v2 に欠落。
-- 既存の deals.stage（9 段、書類/タスク状態で自動進行）+ TRIPOT_CONFIG.stages.cashflowWeight（10〜95%）
-- は客観事実、営業の主観温度感（A〜E）は別軸で表現不能。
--
-- 既存設計：
--   - deals.stage = enum 9 段（prospect/proposing/ordered/in_production/delivered/acceptance/invoiced/paid/lost）
--   - cashflowWeight = config 側の固定数字（10/30/70/80/95%）
--   - 営業の判断材料（A: 見積以降、B: 補助金待ち、C: 提案中、D: アポ、E: 見込み、想定、継続）が消えてる
--
-- 本 migration の解：
--   subjective_confidence enum + nullable column
--   現行シートと 1:1 対応：a/b/c/d/e は A〜E、expected = 想定、continuing = 継続
--   中止は stage='lost' で表現（DRY 原則）
--   confidence_updated_at / confidence_updated_by で最新状態を deals 単体で即取得
--   index で確度別パイプライン金額クエリを高速化
--
-- 適用前提（必読）：
-- 1. 既存 deals row は subjective_confidence = NULL で初期化される
--    （運用で営業が順次設定、既存案件は柏樹判断で A〜E を入れていく）
-- 2. 別 table reconciliations.confidence (integer) は MF 仕訳照合の別 concept、衝突なし
-- 3. drizzle-kit migration とは衝突しない（手動 psql 適用想定、scripts/ 配下）
-- 4. schema.ts への drizzle 定義反映は同時実施
--
-- 隊長明示承認：2026-05-25 23:26「GO 全 6 件受領（A〜F 全部 GO）」
-- 実適用は朝立会で実施、本ファイルは起案のみ

-- ============================================================
-- Stage 1. subjective_confidence enum 型作成
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subjective_confidence') THEN
    CREATE TYPE subjective_confidence AS ENUM (
      'a',          -- 見積段階以降、受注確度高
      'b',          -- ヒアリング・補助金申請待ち、根拠あり
      'c',          -- 提案段階、検討中
      'd',          -- アポ段階、初期
      'e',          -- 見込み顧客、温度感低
      'expected',   -- 想定（構築中等の計画段階）
      'continuing'  -- 継続（既存顧客の追加受注）
    );
  END IF;
END
$$;

COMMENT ON TYPE subjective_confidence IS
  '営業主観の温度感ラベル（現行シート A/B/C/D/E + 想定/継続）。stage と直交する補完軸。中止は stage=lost で表現するため含めない。';

-- ============================================================
-- Stage 2. deals テーブルに 3 列追加
-- ============================================================

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS subjective_confidence subjective_confidence;

COMMENT ON COLUMN deals.subjective_confidence IS
  '営業主観の温度感（A/B/C/D/E/想定/継続）。nullable。stage（客観事実）と独立した補完軸。';

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS confidence_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN deals.confidence_updated_at IS
  '主観確度の最終更新時刻。長期未更新案件のアラート用。';

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS confidence_updated_by UUID REFERENCES members(id);

COMMENT ON COLUMN deals.confidence_updated_by IS
  '主観確度の最終更新者。誰の判断かを追える。';

-- ============================================================
-- Stage 3. インデックス追加（確度別パイプライン集計用）
-- ============================================================

CREATE INDEX IF NOT EXISTS deals_subjective_confidence_idx
  ON deals (company_id, subjective_confidence);

-- ============================================================
-- 4. 確認クエリ（適用後の検証用）
-- ============================================================

-- 4.1 enum 型作成確認
-- SELECT enumlabel FROM pg_enum
-- WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'subjective_confidence')
-- ORDER BY enumsortorder;
--
-- 期待結果：a / b / c / d / e / expected / continuing の 7 行

-- 4.2 列追加確認
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'deals'
--   AND column_name IN ('subjective_confidence', 'confidence_updated_at', 'confidence_updated_by');
--
-- 期待結果：
--   subjective_confidence | USER-DEFINED | YES
--   confidence_updated_at | timestamp with time zone | YES
--   confidence_updated_by | uuid | YES

-- 4.3 既存 row 確認
-- SELECT id, title, stage, subjective_confidence
-- FROM deals
-- WHERE deleted_at IS NULL
-- LIMIT 5;
--
-- 期待：subjective_confidence = NULL（全件）

-- 4.4 update テスト
-- UPDATE deals
-- SET subjective_confidence = 'a',
--     confidence_updated_at = NOW(),
--     confidence_updated_by = (SELECT id FROM members LIMIT 1)
-- WHERE id = (SELECT id FROM deals LIMIT 1);

-- 4.5 確度別パイプライン集計テスト
-- SELECT
--   subjective_confidence,
--   COUNT(*) AS deal_count,
--   SUM(amount) AS pipeline_amount,
--   SUM(gross_profit) AS pipeline_gross_profit
-- FROM deals
-- WHERE company_id = '<company_uuid>'
--   AND stage NOT IN ('paid', 'lost')
--   AND deleted_at IS NULL
-- GROUP BY subjective_confidence
-- ORDER BY subjective_confidence NULLS LAST;

-- ============================================================
-- 5. ロールバック（緊急時のみ、隊長明示承認必須）
-- ============================================================
-- 別ファイル `scripts/teardown-subjective-confidence.sql` に分離

-- ============================================================
-- 6. 関連実装の同時タスク
-- ============================================================
-- 本 migration apply と同時に以下を実装：
--   a. schema.ts に subjectiveConfidence pgEnum + deals 3 列追加 + index 定義
--   b. actions/deals.ts に updateDealConfidence server action 追加（requirePermission('deals.update')）
--   c. UI 4 か所追加：
--      - /deals/[dealId] overview-tab → 大 badge + dropdown 編集
--      - /deals Kanban カード → 小 badge（隅）
--      - /deals List view → inline dropdown 編集（G7 と統合）
--      - /home/[memberId] 担当案件一覧 → 行頭の色帯
--   d. 集計：/weekly + /monthly に「確度別パイプライン金額」セクション追加
--   e. AI: morning-brief prompt に確度別優先順位を加味（A 案件優先表示）
