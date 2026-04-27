-- tripot v2 行レベルセキュリティ（RLS）設定 SQL
-- 🎩 セバスチャン Phase 0 V4 / ADR-0004 準拠
-- 13社展開時のテナント分離を DB 層で物理保証する
--
-- ⚠️ 適用前提（必読）：
-- 1. アプリ層の全 Server Actions / Route Handlers で setTenantContext(session.user.company_id) 呼び出しが必要
-- 2. 現状（2026-04-26）setTenantContext() の呼び出しは 0 件
-- 3. このまま RLS を ENABLE すると全クエリが空結果 or RLS エラーで全画面が壊れる
-- 4. 推奨：5月リリース直前に「(a) Server Actions/Route Handlers に setTenantContext 一括挿入 → (b) この SQL 適用」の順で実施
--
-- 🚨 destructive action：本適用は隊長明示承認必須

-- ============================================================
-- 1. 全テーブル RLS 有効化（13テーブル）
-- ============================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mf_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE mf_invoices ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. テナント分離ポリシー（company_id で WHERE 自動付与）
-- ============================================================

-- companies は自社のみ閲覧可
CREATE POLICY tenant_isolation_companies ON companies
  FOR ALL
  USING (id = current_setting('app.current_company_id', true)::uuid);

-- 残り12テーブルは company_id カラムで分離
CREATE POLICY tenant_isolation_members ON members
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_deals ON deals
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_tasks ON tasks
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_actions ON actions
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_budgets ON budgets
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_weekly ON weekly_summaries
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_monthly ON monthly_summaries
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_approvals ON approvals
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- audit_logs は read-only（書き込みはアプリ層 logAudit() のみ）
CREATE POLICY tenant_isolation_audit_select ON audit_logs
  FOR SELECT
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_audit_insert ON audit_logs
  FOR INSERT
  WITH CHECK (company_id IS NULL OR company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_mf_journals ON mf_journals
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

CREATE POLICY tenant_isolation_mf_invoices ON mf_invoices
  FOR ALL
  USING (company_id = current_setting('app.current_company_id', true)::uuid);

-- ============================================================
-- 2.5 Phase A 以降の追加テーブル群への自動拡張（v2 56テーブル全対応）
-- ============================================================
-- 上記の手書き 13 テーブル以外、company_id カラムを持つ全テーブルに
-- 同形式のテナント分離ポリシーを動的に作成する。
-- DROP POLICY IF EXISTS → CREATE POLICY の冪等性確保。

DO $$
DECLARE r RECORD;
DECLARE policy_name TEXT;
BEGIN
  FOR r IN
    SELECT t.tablename
    FROM pg_tables t
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN (
        'companies', 'members', 'customers', 'deals', 'tasks', 'actions',
        'budgets', 'weekly_summaries', 'monthly_summaries', 'approvals',
        'audit_logs', 'mf_journals', 'mf_invoices',
        '__drizzle_migrations'
      )
      AND EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_schema = 'public'
          AND c.table_name = t.tablename
          AND c.column_name = 'company_id'
      )
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', r.tablename);

    policy_name := 'tenant_isolation_' || r.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL USING (company_id = current_setting(''app.current_company_id'', true)::uuid)',
      policy_name, r.tablename
    );
  END LOOP;

  RAISE NOTICE 'RLS auto-extension complete';
END $$;

-- ============================================================
-- 3. 確認クエリ（適用後の検証用）
-- ============================================================

-- RLS が ON になっている全テーブル確認
-- SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ポリシー一覧確認
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- ============================================================
-- 4. ロールバック（緊急時）
-- ============================================================

-- 個別テーブル無効化：
-- ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
-- DROP POLICY tenant_isolation_deals ON deals;

-- 全テーブル無効化（緊急時のみ、隊長承認必須）：
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
--     EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
--   END LOOP;
-- END $$;
