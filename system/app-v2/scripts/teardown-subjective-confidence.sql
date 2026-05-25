-- tripot v2 deals テーブル 主観確度（subjective_confidence）column ロールバック
-- 指揮官 起案 2026-05-25 / ADR-0013 ロールバック手順
--
-- 用途：setup-subjective-confidence.sql の適用後に問題が発生した場合の緊急 revert
-- 隊長明示承認必須、destructive action
--
-- 順序：index → column → enum type の順で安全に剥がす
-- column 削除前に subjective_confidence データの export を推奨（運用済の場合）

-- ============================================================
-- Stage 0. 事前バックアップ推奨（運用開始後の場合）
-- ============================================================
-- 別セッションで実行：
-- COPY (SELECT id, subjective_confidence, confidence_updated_at, confidence_updated_by
--       FROM deals
--       WHERE subjective_confidence IS NOT NULL)
-- TO '/tmp/deals-subjective-confidence-backup-YYYYMMDD.csv'
-- WITH CSV HEADER;

-- ============================================================
-- Stage 1. インデックス削除
-- ============================================================

DROP INDEX IF EXISTS deals_subjective_confidence_idx;

-- ============================================================
-- Stage 2. deals テーブルから 3 列削除
-- ============================================================

ALTER TABLE deals
  DROP COLUMN IF EXISTS confidence_updated_by;

ALTER TABLE deals
  DROP COLUMN IF EXISTS confidence_updated_at;

ALTER TABLE deals
  DROP COLUMN IF EXISTS subjective_confidence;

-- ============================================================
-- Stage 3. enum 型削除
-- ============================================================
-- ※ deals.subjective_confidence 以外で参照してる column が無いこと前提
-- 他で使ってる場合は DROP TYPE が失敗する（CASCADE は危険なので使わない）

DROP TYPE IF EXISTS subjective_confidence;

-- ============================================================
-- 4. ロールバック確認クエリ
-- ============================================================

-- 4.1 enum 型削除確認
-- SELECT typname FROM pg_type WHERE typname = 'subjective_confidence';
-- 期待結果：0 行

-- 4.2 列削除確認
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'deals'
--   AND column_name IN ('subjective_confidence', 'confidence_updated_at', 'confidence_updated_by');
-- 期待結果：0 行

-- 4.3 インデックス削除確認
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'deals' AND indexname = 'deals_subjective_confidence_idx';
-- 期待結果：0 行
