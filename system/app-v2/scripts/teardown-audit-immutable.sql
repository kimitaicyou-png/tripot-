-- tripot v2 audit_logs immutable 化 緊急ロールバック
-- 🌸 美桜 起案 2026-05-04 / ADR-0009 緊急時用
--
-- ⚠️ 🚨 destructive action：本適用は隊長明示承認必須 🚨 ⚠️
--
-- 本ファイルは setup-audit-immutable.sql で設置した
-- audit_logs の immutable trigger を全て解除する。
--
-- 解除すると audit_logs は再び DELETE/UPDATE/TRUNCATE/DROP 可能になる。
-- 監査証跡の物理保護が失われるため、以下の局面でのみ実行する：
--
-- 1. テスト環境のクリーンアップ（fixture リセット時）
-- 2. setup-audit-immutable.sql 適用後に重大バグが発覚した時
-- 3. 監査スキーマ大規模変更（次世代 audit 設計への移行時）
-- 4. その他、隊長 + セバス + 美桜 の 3者全員一致での合議承認時
--
-- ⚠️ 適用前提（必読）：
-- 1. 隊長明示承認（口頭/Notion/HANDOFF.md いずれかで証跡）
-- 2. 適用前に audit_logs 全 row の pg_dump 取得（証跡保護）
-- 3. 解除後の作業完了タイミングで setup-audit-immutable.sql を再適用
--    （= teardown は一時的、永久解除ではない）
-- 4. teardown 〜 再 setup の間の全操作を別途記録（手動でも）
--
-- 🚨 superuser からの実行を必須とする（trigger DROP 権限）

-- ============================================================
-- 解除確認プロンプト（必ず手動実行）
-- ============================================================
-- 以下を一度チェックしてから本 SQL を流す：
--
-- [ ] 隊長承認確認済み（誰がいつ承認したか HANDOFF.md に記録済）
-- [ ] pg_dump バックアップ取得済み（ファイル名・場所メモ済）
-- [ ] teardown 後の再 setup 予定時刻が決まっている（無期限解除は禁止）
-- [ ] teardown 中に audit_logs に影響を与える作業内容が明確
-- [ ] セバス + 美桜 のうち 1名が立会
--
-- 上記すべて [x] でなければここで止まる。

-- ============================================================
-- Stage 1 解除：ROW-level trigger DROP
-- ============================================================

DROP TRIGGER IF EXISTS audit_logs_immutable_row ON audit_logs;
DROP FUNCTION IF EXISTS audit_logs_prevent_modify();

-- ============================================================
-- Stage 2 解除：STATEMENT-level trigger DROP
-- ============================================================

DROP TRIGGER IF EXISTS audit_logs_immutable_truncate ON audit_logs;
DROP FUNCTION IF EXISTS audit_logs_prevent_truncate();

-- ============================================================
-- Stage 3 解除：EVENT TRIGGER DROP
-- ============================================================

DROP EVENT TRIGGER IF EXISTS audit_logs_immutable_drop;
DROP FUNCTION IF EXISTS audit_logs_prevent_drop();

-- ============================================================
-- Stage 4 解除：role 権限復元（Stage 4 を有効化していた場合のみ）
-- ============================================================

-- GRANT UPDATE, DELETE, TRUNCATE ON audit_logs TO tripot_app;
-- ※ DATABASE_URL の実 role 名に合わせて調整、Stage 4 未適用なら不要

-- ============================================================
-- 確認クエリ（teardown 後）
-- ============================================================

-- trigger が消えた確認
-- SELECT trigger_name, event_object_table FROM information_schema.triggers
-- WHERE event_object_table = 'audit_logs';
-- 期待結果：0 rows

-- event trigger が消えた確認
-- SELECT evtname FROM pg_event_trigger WHERE evtname LIKE '%audit%';
-- 期待結果：0 rows

-- ============================================================
-- 再 setup
-- ============================================================
-- teardown 作業完了後、必ず以下を実行：
--   psql -f scripts/setup-audit-immutable.sql
--
-- 再 setup 完了確認まで teardown セッションは終了しないこと。
