-- Phase 2-A alignment migration
-- Background: Phase 2-A columns/indexes were applied manually via scripts/setup-deals-gross-profit.sql
-- on 2026-05-04 21:00 (production). This migration brings drizzle journal in sync with production.
-- All statements use IF NOT EXISTS so re-application is a no-op on production while journal updates.
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "external_cost" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "gross_profit" bigint GENERATED ALWAYS AS (COALESCE(amount, 0) - COALESCE(external_cost, 0)) STORED;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN IF NOT EXISTS "gross_profit_rate" numeric(5, 2) GENERATED ALWAYS AS (CASE WHEN COALESCE(amount, 0) > 0 THEN ROUND((COALESCE(amount, 0) - COALESCE(external_cost, 0)) * 100.0 / COALESCE(amount, 1), 2) ELSE 0 END) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_gross_profit_idx" ON "deals" USING btree ("company_id","gross_profit");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "deals_gross_profit_rate_idx" ON "deals" USING btree ("company_id","gross_profit_rate");
