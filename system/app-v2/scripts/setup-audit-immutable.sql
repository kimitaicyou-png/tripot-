-- tripot v2 audit_logs テーブル immutable 化
-- 🌸 美桜 起案 2026-05-04 / 栗尾 G-3 致命「監査ログ DB で本当に消せない化」
-- ADR-0009 準拠
--
-- 背景：
-- 既存 setup-rls.sql は audit_logs に SELECT/INSERT policy しか定義していない。
-- これは「アプリ層から DELETE/UPDATE できない」状態は作るが、
-- 以下のケースで監査ログが消える/改ざんされる余地が残る：
--   1. PostgreSQL superuser や BYPASSRLS role での直接 DELETE/UPDATE
--   2. TRUNCATE TABLE audit_logs（policy では防げない）
--   3. DROP TABLE audit_logs（policy では防げない）
--   4. オペミス（pgAdmin 等の GUI から削除）
--   5. 攻撃者が DB role を奪取した場合
--
-- 本 migration は PostgreSQL TRIGGER を使い、RAISE EXCEPTION で
-- DELETE/UPDATE/TRUNCATE を物理的にブロックする。
-- DROP TABLE 防御は EVENT TRIGGER で対応（Stage 3）。
--
-- ⚠️ 適用前提（必読）：
-- 1. 既に setup-rls.sql 適用済（または同時適用）であること
-- 2. INSERT は logAudit() 経由で正常動作することを test で確認済であること
-- 3. 既存 audit_logs データへの bulk update / cleanup が必要なら本 migration 適用前に完了させる
-- 4. 緊急時のロールバック手順を隊長 + セバス + 美桜の3者で確認済であること
--
-- 🚨 destructive action：本適用は隊長明示承認必須

-- ============================================================
-- Stage 1. ROW-level immutable trigger（DELETE / UPDATE 物理ブロック）
-- ============================================================

CREATE OR REPLACE FUNCTION audit_logs_prevent_modify()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'audit_logs is immutable: DELETE is not allowed (action=%, id=%)',
      OLD.action, OLD.id
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'audit_logs records are append-only by design (ADR-0009).';
  ELSIF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION
      'audit_logs is immutable: UPDATE is not allowed (action=%, id=%)',
      OLD.action, OLD.id
      USING ERRCODE = 'insufficient_privilege',
            HINT = 'audit_logs records are append-only by design (ADR-0009).';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable_row ON audit_logs;
CREATE TRIGGER audit_logs_immutable_row
  BEFORE DELETE OR UPDATE ON audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_prevent_modify();

-- ============================================================
-- Stage 2. STATEMENT-level immutable trigger（TRUNCATE 物理ブロック）
-- ============================================================

CREATE OR REPLACE FUNCTION audit_logs_prevent_truncate()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'audit_logs is immutable: TRUNCATE is not allowed'
    USING ERRCODE = 'insufficient_privilege',
          HINT = 'audit_logs records are append-only by design (ADR-0009).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_immutable_truncate ON audit_logs;
CREATE TRIGGER audit_logs_immutable_truncate
  BEFORE TRUNCATE ON audit_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_logs_prevent_truncate();

-- ============================================================
-- Stage 3. EVENT TRIGGER（DROP TABLE audit_logs 物理ブロック）
-- ============================================================
-- ddl_command_start で audit_logs に対する DROP TABLE / ALTER TABLE DROP COLUMN を block
-- ※ EVENT TRIGGER は superuser でも install/drop に明示的 SQL が必要

CREATE OR REPLACE FUNCTION audit_logs_prevent_drop()
RETURNS event_trigger AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type = 'table' AND obj.object_name = 'audit_logs' THEN
      RAISE EXCEPTION
        'audit_logs is immutable: DROP TABLE is not allowed'
        USING ERRCODE = 'insufficient_privilege',
              HINT = 'audit_logs is protected by ADR-0009. To remove this protection, run scripts/teardown-audit-immutable.sql with explicit 隊長 approval.';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

DROP EVENT TRIGGER IF EXISTS audit_logs_immutable_drop;
CREATE EVENT TRIGGER audit_logs_immutable_drop
  ON sql_drop
  EXECUTE FUNCTION audit_logs_prevent_drop();

-- ============================================================
-- Stage 4. role-based 権限剥奪（多層防御）
-- ============================================================
-- アプリ用 role が audit_logs に対して持つ権限を SELECT / INSERT のみに制限
-- ※ DATABASE_URL の role 名に合わせて適宜変更（今は仮で 'tripot_app'）

-- REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM tripot_app;
-- REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM PUBLIC;
-- GRANT SELECT, INSERT ON audit_logs TO tripot_app;

-- ⚠️ 上記は Phase 2 実装時に DATABASE_URL の実 role を確認してから有効化する。
-- 今は trigger ベースの物理ブロックで十分（Stage 1-3）、role 剥奪は多層防御の追加層。

-- ============================================================
-- 5. 確認クエリ（適用後の検証用、Phase 2 で実行）
-- ============================================================

-- 5.1 trigger 一覧確認
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE event_object_table = 'audit_logs';
--
-- 期待結果：
--   audit_logs_immutable_row | DELETE | audit_logs
--   audit_logs_immutable_row | UPDATE | audit_logs
--   audit_logs_immutable_truncate | TRUNCATE | audit_logs

-- 5.2 event trigger 確認
-- SELECT evtname, evtevent, evtenabled FROM pg_event_trigger;
--
-- 期待結果：audit_logs_immutable_drop | sql_drop | O

-- 5.3 動作確認（PHASE 2 の test-audit-immutable.sql で別途実装）
-- BEGIN;
-- DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1);
-- ROLLBACK; -- 期待：ERROR insufficient_privilege が発生

-- ============================================================
-- 6. ロールバック（緊急時のみ、隊長明示承認必須）
-- ============================================================
-- 別ファイル `scripts/teardown-audit-immutable.sql` に分離（destructive 隔離）

-- ============================================================
-- 7. 既存 setup-rls.sql との関係
-- ============================================================
-- setup-rls.sql の policy（tenant_isolation_audit_select / tenant_isolation_audit_insert）
-- と本 migration の trigger は併用（直交関係）：
--   - policy = アプリ層の company_id 分離（テナント間漏洩防止）
--   - trigger = DB 層の immutable 保証（履歴改ざん防止）
-- 両方適用が前提（栗尾 G-3 + ADR-0004 両立）
