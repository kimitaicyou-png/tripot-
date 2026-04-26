/**
 * tripot v2 Database Schema (Drizzle ORM)
 *
 * 2026-04-26 美桜起草、🍁秋美 V1 設計を Drizzle TS に書き起こし。
 * 用語統一表 (tripot-v2-glossary.md) 厳格遵守：
 *   - 案件 = deal（商談・ディールNG）
 *   - 顧客 = customer（クライアント・お客様NG）
 *   - メンバー = member（社員・スタッフNG）
 *
 * 全テーブルに company_id を含めて RLS（行レベルセキュリティ）でテナント分離。
 * 13社展開時、coaris.config.ts の id でフィルタリング。
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  bigint,
  integer,
  date,
  timestamp,
  jsonb,
  inet,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ============================================================
 * Enums
 * ============================================================ */

export const memberRole = pgEnum('member_role', ['president', 'hq_member', 'member']);
export const memberStatus = pgEnum('member_status', ['active', 'pending', 'inactive']);
export const dealStage = pgEnum('deal_stage', [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
]);
export const revenueType = pgEnum('revenue_type', ['spot', 'running', 'both']);
export const taskStatus = pgEnum('task_status', ['todo', 'in_progress', 'done']);
export const actionType = pgEnum('action_type', ['call', 'meeting', 'proposal', 'email', 'visit', 'other']);
export const approvalType = pgEnum('approval_type', ['discount', 'expense', 'contract', 'custom']);
export const approvalStatus = pgEnum('approval_status', ['pending', 'approved', 'rejected']);
export const mfStatus = pgEnum('mf_status', ['imported', 'matched', 'reflected', 'ignored']);

export const meetingType = pgEnum('meeting_type', ['call', 'meeting', 'gmeet', 'visit', 'email', 'other']);
export const proposalStatus = pgEnum('proposal_status', ['draft', 'shared', 'won', 'lost', 'archived']);
export const estimateStatus = pgEnum('estimate_status', ['draft', 'sent', 'accepted', 'declined']);
export const invoiceStatus = pgEnum('invoice_status', ['draft', 'issued', 'sent', 'paid', 'overdue', 'voided']);
export const productionStatus = pgEnum('production_status', [
  'requirements',
  'designing',
  'building',
  'reviewing',
  'delivered',
  'cancelled',
]);
export const bugSeverity = pgEnum('bug_severity', ['low', 'medium', 'high', 'critical']);
export const bugStatus = pgEnum('bug_status', ['open', 'in_progress', 'resolved', 'closed']);
export const reviewStatus = pgEnum('review_status', ['pending', 'approved', 'rejected', 'revision']);
export const integrationProvider = pgEnum('integration_provider', [
  'mf',
  'freee',
  'google',
  'slack',
  'line',
  'notion',
  'gmail',
  'zoom',
  'teams',
  'cloudsign',
  'stripe',
  'paypay',
]);
export const integrationStatus = pgEnum('integration_status', ['active', 'expired', 'revoked', 'error']);
export const notificationChannel = pgEnum('notification_channel', ['app', 'slack', 'line', 'email']);
export const notificationStatus = pgEnum('notification_status', ['queued', 'sent', 'failed', 'read']);
export const aiProvider = pgEnum('ai_provider', ['anthropic', 'openai', 'google', 'other']);
export const aiJobStatus = pgEnum('ai_job_status', ['queued', 'running', 'succeeded', 'failed', 'cancelled']);
export const importJobStatus = pgEnum('import_job_status', ['queued', 'running', 'succeeded', 'partial', 'failed']);
export const recruitingStage = pgEnum('recruiting_stage', [
  'sourced',
  'screening',
  'interview',
  'offer',
  'hired',
  'declined',
]);

/* ============================================================
 * companies — 13社のマスタ
 * ============================================================ */

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  id_slug: text('id_slug').notNull().unique(), // 'tripot', 'deraforce' 等
  name: text('name').notNull(),
  legal_form: text('legal_form'),
  config: jsonb('config').notNull().default({}), // coaris.config.ts の値を保持
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

/* ============================================================
 * members — 全社の人
 * ============================================================ */

export const members = pgTable(
  'members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: memberRole('role').notNull().default('member'),
    status: memberStatus('status').notNull().default('active'),
    department: text('department'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    emailUnique: unique('members_email_unique').on(t.email),
    companyIdx: index('members_company_idx').on(t.company_id, t.status),
  })
);

/* ============================================================
 * customers — 取引先（顧客）
 * ============================================================ */

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    name: text('name').notNull(),
    contact_email: text('contact_email'),
    contact_phone: text('contact_phone'),
    address: jsonb('address'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    companyIdx: index('customers_company_idx').on(t.company_id),
  })
);

/* ============================================================
 * deals — 案件（v1 の「商談」「ディール」混在を「案件」一本化）
 * ============================================================ */

export const deals = pgTable(
  'deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    customer_id: uuid('customer_id').references(() => customers.id),
    assignee_id: uuid('assignee_id').references(() => members.id),
    title: text('title').notNull(),
    stage: dealStage('stage').notNull().default('prospect'),
    amount: bigint('amount', { mode: 'number' }).default(0), // 受注金額（円）
    monthly_amount: bigint('monthly_amount', { mode: 'number' }).default(0), // running 月額
    revenue_type: revenueType('revenue_type').notNull().default('spot'),
    expected_close_date: date('expected_close_date'),
    ordered_at: date('ordered_at'),
    delivered_at: date('delivered_at'),
    paid_at: date('paid_at'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    assigneeStageIdx: index('deals_assignee_stage_idx').on(t.assignee_id, t.stage),
    companyPaidIdx: index('deals_company_paid_idx').on(t.company_id, t.paid_at),
  })
);

/* ============================================================
 * tasks — 案件配下のタスク
 * ============================================================ */

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    assignee_id: uuid('assignee_id').references(() => members.id),
    title: text('title').notNull(),
    status: taskStatus('status').notNull().default('todo'),
    estimated_cost: bigint('estimated_cost', { mode: 'number' }).default(0),
    due_date: date('due_date'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    assigneeStatusIdx: index('tasks_assignee_status_idx').on(t.assignee_id, t.status),
  })
);

/* ============================================================
 * actions — 行動入力（v1 から最重要、隊長思想体現）
 * ============================================================ */

export const actions = pgTable(
  'actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    type: actionType('type').notNull(),
    note: text('note'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberOccurredIdx: index('actions_member_occurred_idx').on(t.member_id, t.occurred_at),
  })
);

/* ============================================================
 * budgets — 月次予算（事業計画の月別配分）
 * ============================================================ */

export const budgets = pgTable(
  'budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    target_revenue: bigint('target_revenue', { mode: 'number' }).default(0),
    target_gross_profit: bigint('target_gross_profit', { mode: 'number' }).default(0),
    target_operating_profit: bigint('target_operating_profit', { mode: 'number' }).default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyYearMonthUnique: unique('budgets_company_year_month_unique').on(t.company_id, t.year, t.month),
  })
);

/* ============================================================
 * weekly_summaries / monthly_summaries — 集計テーブル
 * ============================================================ */

export const weekly_summaries = pgTable(
  'weekly_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    week_start: date('week_start').notNull(),
    actual_revenue: bigint('actual_revenue', { mode: 'number' }).default(0),
    actual_gross: bigint('actual_gross', { mode: 'number' }).default(0),
    call_count: integer('call_count').default(0),
    meeting_count: integer('meeting_count').default(0),
    proposal_count: integer('proposal_count').default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyWeekUnique: unique('weekly_summaries_company_week_unique').on(t.company_id, t.week_start),
  })
);

export const monthly_summaries = pgTable(
  'monthly_summaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    actual_revenue: bigint('actual_revenue', { mode: 'number' }).default(0),
    forecast_revenue: bigint('forecast_revenue', { mode: 'number' }).default(0),
    actual_gross: bigint('actual_gross', { mode: 'number' }).default(0),
    actual_operating: bigint('actual_operating', { mode: 'number' }).default(0),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyYearMonthUnique: unique('monthly_summaries_company_year_month_unique').on(t.company_id, t.year, t.month),
  })
);

/* ============================================================
 * approvals — 申請承認フロー
 * ============================================================ */

export const approvals = pgTable(
  'approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    requester_id: uuid('requester_id').notNull().references(() => members.id),
    approver_id: uuid('approver_id').references(() => members.id),
    type: approvalType('type').notNull(),
    status: approvalStatus('status').notNull().default('pending'),
    payload: jsonb('payload').notNull().default({}),
    requested_at: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    responded_at: timestamp('responded_at', { withTimezone: true }),
  }
);

/* ============================================================
 * audit_logs — セバス設計、誰がいつ何にアクセスしたか
 * ============================================================ */

export const audit_logs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    member_id: uuid('member_id').references(() => members.id),
    company_id: uuid('company_id').references(() => companies.id),
    action: text('action').notNull(), // 'sign_in' / 'deal.create' / 'deal.update' 等
    resource_type: text('resource_type'),
    resource_id: uuid('resource_id'),
    ip: inet('ip'),
    user_agent: text('user_agent'),
    metadata: jsonb('metadata'),
  },
  (t) => ({
    memberOccurredIdx: index('audit_logs_member_occurred_idx').on(t.member_id, t.occurred_at),
    companyOccurredIdx: index('audit_logs_company_occurred_idx').on(t.company_id, t.occurred_at),
  })
);

/* ============================================================
 * mf_journals / mf_invoices — MoneyForward連携
 * ============================================================ */

export const mf_journals = pgTable(
  'mf_journals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    mf_id: text('mf_id').notNull(), // MFクラウド側ID
    entry_date: date('entry_date').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    account_code: text('account_code'),
    description: text('description'),
    matched_deal_id: uuid('matched_deal_id').references(() => deals.id),
    status: mfStatus('status').notNull().default('imported'),
    raw: jsonb('raw'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    mfIdUnique: unique('mf_journals_mf_id_unique').on(t.company_id, t.mf_id),
    statusIdx: index('mf_journals_status_idx').on(t.company_id, t.status),
  })
);

export const mf_invoices = pgTable(
  'mf_invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    mf_id: text('mf_id').notNull(),
    customer_id: uuid('customer_id').references(() => customers.id),
    total: bigint('total', { mode: 'number' }).notNull(),
    issue_date: date('issue_date'),
    due_date: date('due_date'),
    status: mfStatus('status').notNull().default('imported'),
    raw: jsonb('raw'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    mfIdUnique: unique('mf_invoices_mf_id_unique').on(t.company_id, t.mf_id),
    dueIdx: index('mf_invoices_due_idx').on(t.company_id, t.due_date),
  })
);

/* ============================================================
 * meetings — 議事録（v1 ActionSection の電話/商談/メール/GMeet を統合）
 * ============================================================ */

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    customer_id: uuid('customer_id').references(() => customers.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    type: meetingType('type').notNull(),
    title: text('title'),
    raw_text: text('raw_text'),
    summary: text('summary'),
    needs: jsonb('needs').default([]),
    audio_url: text('audio_url'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
    duration_sec: integer('duration_sec'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    dealOccurredIdx: index('meetings_deal_occurred_idx').on(t.deal_id, t.occurred_at),
    companyOccurredIdx: index('meetings_company_occurred_idx').on(t.company_id, t.occurred_at),
  })
);

/* ============================================================
 * proposals — 提案書（バージョン管理 + スライド JSON）
 * ============================================================ */

export const proposals = pgTable(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    version: integer('version').notNull().default(1),
    title: text('title').notNull(),
    status: proposalStatus('status').notNull().default('draft'),
    slides: jsonb('slides').notNull().default([]),
    pdf_url: text('pdf_url'),
    created_by: uuid('created_by').references(() => members.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    dealVersionUnique: unique('proposals_deal_version_unique').on(t.deal_id, t.version),
    dealStatusIdx: index('proposals_deal_status_idx').on(t.deal_id, t.status),
  })
);

/* ============================================================
 * estimates — 見積（明細 jsonb）
 * ============================================================ */

export const estimates = pgTable(
  'estimates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    version: integer('version').notNull().default(1),
    title: text('title').notNull(),
    status: estimateStatus('status').notNull().default('draft'),
    subtotal: bigint('subtotal', { mode: 'number' }).default(0),
    tax: bigint('tax', { mode: 'number' }).default(0),
    total: bigint('total', { mode: 'number' }).default(0),
    line_items: jsonb('line_items').notNull().default([]),
    valid_until: date('valid_until'),
    pdf_url: text('pdf_url'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    created_by: uuid('created_by').references(() => members.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    dealVersionUnique: unique('estimates_deal_version_unique').on(t.deal_id, t.version),
  })
);

/* ============================================================
 * invoices — 請求書（MF 連携 + 入金検知）
 * ============================================================ */

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    estimate_id: uuid('estimate_id').references(() => estimates.id),
    invoice_number: text('invoice_number'),
    status: invoiceStatus('status').notNull().default('draft'),
    subtotal: bigint('subtotal', { mode: 'number' }).default(0),
    tax: bigint('tax', { mode: 'number' }).default(0),
    total: bigint('total', { mode: 'number' }).notNull().default(0),
    issue_date: date('issue_date'),
    due_date: date('due_date'),
    paid_at: date('paid_at'),
    mf_invoice_id: uuid('mf_invoice_id').references(() => mf_invoices.id),
    pdf_url: text('pdf_url'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    invoiceNumberUnique: unique('invoices_company_number_unique').on(t.company_id, t.invoice_number),
    dueIdx: index('invoices_company_due_idx').on(t.company_id, t.due_date, t.status),
  })
);

/* ============================================================
 * production_cards — 制作カード（IT系 features.productionDashboard）
 * ============================================================ */

export const production_cards = pgTable(
  'production_cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    title: text('title').notNull(),
    status: productionStatus('status').notNull().default('requirements'),
    template_id: uuid('template_id'),
    requirements: jsonb('requirements').default({}),
    sitemap: jsonb('sitemap').default({}),
    started_at: date('started_at'),
    delivered_at: date('delivered_at'),
    estimated_cost: bigint('estimated_cost', { mode: 'number' }).default(0),
    actual_cost: bigint('actual_cost', { mode: 'number' }).default(0),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    statusIdx: index('production_cards_status_idx').on(t.company_id, t.status),
  })
);

/* ============================================================
 * time_logs — 時間記録（案件収益性反映）
 * ============================================================ */

export const time_logs = pgTable(
  'time_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    production_card_id: uuid('production_card_id').references(() => production_cards.id),
    task_id: uuid('task_id').references(() => tasks.id),
    minutes: integer('minutes').notNull(),
    note: text('note'),
    occurred_on: date('occurred_on').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberDateIdx: index('time_logs_member_date_idx').on(t.member_id, t.occurred_on),
    dealDateIdx: index('time_logs_deal_date_idx').on(t.deal_id, t.occurred_on),
  })
);

/* ============================================================
 * bugs — バグ追跡（production 関連）
 * ============================================================ */

export const bugs = pgTable(
  'bugs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    production_card_id: uuid('production_card_id').references(() => production_cards.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    title: text('title').notNull(),
    description: text('description'),
    severity: bugSeverity('severity').notNull().default('medium'),
    status: bugStatus('status').notNull().default('open'),
    reporter_id: uuid('reporter_id').references(() => members.id),
    assignee_id: uuid('assignee_id').references(() => members.id),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusSeverityIdx: index('bugs_status_severity_idx').on(t.company_id, t.status, t.severity),
  })
);

/* ============================================================
 * purchase_orders — 外注発注（vendors 連携）
 * ============================================================ */

export const vendors = pgTable(
  'vendors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    name: text('name').notNull(),
    contact_email: text('contact_email'),
    contact_phone: text('contact_phone'),
    rating: integer('rating'),
    skills: jsonb('skills').default([]),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    companyNameIdx: index('vendors_company_name_idx').on(t.company_id, t.name),
  })
);

export const purchase_orders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    production_card_id: uuid('production_card_id').references(() => production_cards.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    vendor_id: uuid('vendor_id').notNull().references(() => vendors.id),
    title: text('title').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull().default(0),
    issued_on: date('issued_on'),
    delivered_on: date('delivered_on'),
    paid_on: date('paid_on'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * deliverables / reviews / test_cases — 成果物・レビュー・テスト
 * ============================================================ */

export const deliverables = pgTable(
  'deliverables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    production_card_id: uuid('production_card_id').notNull().references(() => production_cards.id),
    name: text('name').notNull(),
    version: integer('version').notNull().default(1),
    file_url: text('file_url'),
    note: text('note'),
    delivered_at: timestamp('delivered_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    production_card_id: uuid('production_card_id').notNull().references(() => production_cards.id),
    deliverable_id: uuid('deliverable_id').references(() => deliverables.id),
    reviewer_id: uuid('reviewer_id').references(() => members.id),
    status: reviewStatus('status').notNull().default('pending'),
    feedback: text('feedback'),
    reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const test_cases = pgTable(
  'test_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    production_card_id: uuid('production_card_id').notNull().references(() => production_cards.id),
    title: text('title').notNull(),
    expected: text('expected'),
    result: text('result'),
    passed: integer('passed').default(0),
    last_run_at: timestamp('last_run_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * change_logs — 変更履歴（業務ログ、audit_logs と別軸）
 * ============================================================ */

export const change_logs = pgTable(
  'change_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    production_card_id: uuid('production_card_id').references(() => production_cards.id),
    member_id: uuid('member_id').references(() => members.id),
    summary: text('summary').notNull(),
    payload: jsonb('payload'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealOccurredIdx: index('change_logs_deal_occurred_idx').on(t.deal_id, t.occurred_at),
  })
);

/* ============================================================
 * lost_deals — 失注記録（学習用、stage='lost' 時に作成）
 * ============================================================ */

export const lost_deals = pgTable(
  'lost_deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    reason: text('reason').notNull(),
    competitor: text('competitor'),
    detail: text('detail'),
    lost_at: timestamp('lost_at', { withTimezone: true }).defaultNow().notNull(),
    created_by: uuid('created_by').references(() => members.id),
  },
  (t) => ({
    dealUnique: unique('lost_deals_deal_unique').on(t.deal_id),
  })
);

/* ============================================================
 * attack_plans / attack_scores — 案件攻略
 * ============================================================ */

export const attack_plans = pgTable(
  'attack_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    member_id: uuid('member_id').references(() => members.id),
    key_person: text('key_person'),
    competitor: text('competitor'),
    budget_estimate: bigint('budget_estimate', { mode: 'number' }),
    plan: text('plan'),
    next_action: text('next_action'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealUnique: unique('attack_plans_deal_unique').on(t.deal_id),
  })
);

export const attack_scores = pgTable(
  'attack_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').notNull().references(() => deals.id),
    score: integer('score').notNull(),
    breakdown: jsonb('breakdown').notNull().default({}),
    calculated_at: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealCalcIdx: index('attack_scores_deal_calc_idx').on(t.deal_id, t.calculated_at),
  })
);

/* ============================================================
 * quotes — 名言（v1 の DEFAULT_QUOTES ハードコード撲滅）
 * ============================================================ */

export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    body: text('body').notNull(),
    author: text('author'),
    weight: integer('weight').notNull().default(1),
    is_active: integer('is_active').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyActiveIdx: index('quotes_company_active_idx').on(t.company_id, t.is_active),
  })
);

/* ============================================================
 * project_templates — プロジェクトテンプレ（v1 PROJECT_TEMPLATES 撲滅）
 * ============================================================ */

export const project_templates = pgTable(
  'project_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    name: text('name').notNull(),
    description: text('description'),
    requirements_template: jsonb('requirements_template').default({}),
    sitemap_template: jsonb('sitemap_template').default({}),
    estimate_template: jsonb('estimate_template').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  }
);

/* ============================================================
 * commitments — コミットメント記録（「来週までに○○」）
 * ============================================================ */

export const commitments = pgTable(
  'commitments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    text: text('text').notNull(),
    due_date: date('due_date'),
    status: taskStatus('status').notNull().default('todo'),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberStatusIdx: index('commitments_member_status_idx').on(t.member_id, t.status),
  })
);

/* ============================================================
 * referrals — 紹介ネットワーク（顧客 LTV / グラフ可視化）
 * ============================================================ */

export const referrals = pgTable(
  'referrals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    customer_id: uuid('customer_id').notNull().references(() => customers.id),
    referrer_customer_id: uuid('referrer_customer_id').references(() => customers.id),
    referrer_member_id: uuid('referrer_member_id').references(() => members.id),
    note: text('note'),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * leaves — 休暇（チーム稼働率）
 * ============================================================ */

export const leaves = pgTable(
  'leaves',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    leave_type: text('leave_type').notNull(),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberRangeIdx: index('leaves_member_range_idx').on(t.member_id, t.start_date),
  })
);

/* ============================================================
 * integrations — OAuth トークン（MF/Slack/Google/LINE/Notion 等）
 * ============================================================ */

export const integrations = pgTable(
  'integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    provider: integrationProvider('provider').notNull(),
    status: integrationStatus('status').notNull().default('active'),
    access_token: text('access_token'),
    refresh_token: text('refresh_token'),
    expires_at: timestamp('expires_at', { withTimezone: true }),
    scope: text('scope'),
    metadata: jsonb('metadata').default({}),
    last_synced_at: timestamp('last_synced_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyProviderUnique: unique('integrations_company_provider_unique').on(t.company_id, t.provider),
  })
);

/* ============================================================
 * reconciliations — MF 仕訳と案件の照合履歴
 * ============================================================ */

export const reconciliations = pgTable(
  'reconciliations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    mf_journal_id: uuid('mf_journal_id').references(() => mf_journals.id),
    mf_invoice_id: uuid('mf_invoice_id').references(() => mf_invoices.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    invoice_id: uuid('invoice_id').references(() => invoices.id),
    matched_by: uuid('matched_by').references(() => members.id),
    confidence: integer('confidence'),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * notification_prefs / notifications — 通知設定 + 履歴
 * ============================================================ */

export const notification_prefs = pgTable(
  'notification_prefs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').notNull().references(() => members.id),
    rule_key: text('rule_key').notNull(),
    channels: jsonb('channels').notNull().default([]),
    is_muted: integer('is_muted').notNull().default(0),
    threshold: jsonb('threshold').default({}),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberRuleUnique: unique('notification_prefs_member_rule_unique').on(t.member_id, t.rule_key),
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    rule_key: text('rule_key').notNull(),
    channel: notificationChannel('channel').notNull(),
    status: notificationStatus('status').notNull().default('queued'),
    title: text('title').notNull(),
    body: text('body'),
    payload: jsonb('payload'),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    read_at: timestamp('read_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberStatusIdx: index('notifications_member_status_idx').on(t.member_id, t.status),
  })
);

/* ============================================================
 * role_permissions — ロール権限マトリクス
 * ============================================================ */

export const role_permissions = pgTable(
  'role_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    role: memberRole('role').notNull(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    allowed: integer('allowed').notNull().default(1),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    triplet: unique('role_permissions_triplet_unique').on(t.company_id, t.role, t.resource, t.action),
  })
);

/* ============================================================
 * AI 系 — 会話 / ジョブ / コスト
 * ============================================================ */

export const ai_conversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    session_key: text('session_key'),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tokens_in: integer('tokens_in').default(0),
    tokens_out: integer('tokens_out').default(0),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    memberCreatedIdx: index('ai_conversations_member_created_idx').on(t.member_id, t.created_at),
    sessionIdx: index('ai_conversations_session_idx').on(t.session_key),
  })
);

export const ai_jobs = pgTable(
  'ai_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    job_type: text('job_type').notNull(),
    status: aiJobStatus('status').notNull().default('queued'),
    provider: aiProvider('provider').notNull().default('anthropic'),
    model: text('model'),
    input: jsonb('input'),
    output: jsonb('output'),
    error: text('error'),
    started_at: timestamp('started_at', { withTimezone: true }),
    finished_at: timestamp('finished_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    statusIdx: index('ai_jobs_status_idx').on(t.company_id, t.status),
  })
);

export const ai_usage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    job_id: uuid('job_id').references(() => ai_jobs.id),
    provider: aiProvider('provider').notNull(),
    model: text('model'),
    tokens_in: integer('tokens_in').default(0),
    tokens_out: integer('tokens_out').default(0),
    cost_micro_usd: bigint('cost_micro_usd', { mode: 'number' }).default(0),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyOccurredIdx: index('ai_usage_company_occurred_idx').on(t.company_id, t.occurred_at),
  })
);

/* ============================================================
 * budget 拡張 — actuals / segments / fixed_costs
 * ============================================================ */

export const budget_actuals = pgTable(
  'budget_actuals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    revenue: bigint('revenue', { mode: 'number' }).default(0),
    cogs: bigint('cogs', { mode: 'number' }).default(0),
    sga: bigint('sga', { mode: 'number' }).default(0),
    operating_profit: bigint('operating_profit', { mode: 'number' }).default(0),
    source: text('source'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyYearMonthUnique: unique('budget_actuals_company_year_month_unique').on(t.company_id, t.year, t.month),
  })
);

export const budget_segments = pgTable(
  'budget_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    segment_name: text('segment_name').notNull(),
    monthly_target: jsonb('monthly_target').notNull().default([]),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    yearSegmentUnique: unique('budget_segments_year_segment_unique').on(t.company_id, t.year, t.segment_name),
  })
);

export const budget_fixed_costs = pgTable(
  'budget_fixed_costs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    name: text('name').notNull(),
    monthly_amount: bigint('monthly_amount', { mode: 'number' }).default(0),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * monthly_reports — 月次レポート履歴（PDF 化済み）
 * ============================================================ */

export const monthly_reports = pgTable(
  'monthly_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    year: integer('year').notNull(),
    month: integer('month').notNull(),
    summary: text('summary'),
    metrics: jsonb('metrics').default({}),
    pdf_url: text('pdf_url'),
    bridge_payload: jsonb('bridge_payload'),
    bridge_sent_at: timestamp('bridge_sent_at', { withTimezone: true }),
    created_by: uuid('created_by').references(() => members.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    companyYearMonthUnique: unique('monthly_reports_company_year_month_unique').on(t.company_id, t.year, t.month),
  })
);

/* ============================================================
 * bridge_notices — 本部 → 各事業会社の指示
 * ============================================================ */

export const bridge_notices = pgTable(
  'bridge_notices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    title: text('title').notNull(),
    body: text('body').notNull(),
    payload: jsonb('payload'),
    severity: text('severity').notNull().default('info'),
    sent_at: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    acknowledged_at: timestamp('acknowledged_at', { withTimezone: true }),
    acknowledged_by: uuid('acknowledged_by').references(() => members.id),
  }
);

/* ============================================================
 * import_jobs / import_failures — 一括取込ジョブ追跡
 * ============================================================ */

export const import_jobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    member_id: uuid('member_id').references(() => members.id),
    source: text('source').notNull(),
    status: importJobStatus('status').notNull().default('queued'),
    total: integer('total').default(0),
    succeeded: integer('succeeded').default(0),
    failed: integer('failed').default(0),
    summary: text('summary'),
    started_at: timestamp('started_at', { withTimezone: true }),
    finished_at: timestamp('finished_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const import_failures = pgTable(
  'import_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    job_id: uuid('job_id').notNull().references(() => import_jobs.id),
    line_no: integer('line_no'),
    payload: jsonb('payload'),
    error: text('error'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * recruiting_pipeline / aptitude_tests — 採用・適性診断
 * ============================================================ */

export const recruiting_pipeline = pgTable(
  'recruiting_pipeline',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    candidate_name: text('candidate_name').notNull(),
    candidate_email: text('candidate_email'),
    stage: recruitingStage('stage').notNull().default('sourced'),
    source: text('source'),
    note: text('note'),
    aptitude_score: integer('aptitude_score'),
    metadata: jsonb('metadata').default({}),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

export const aptitude_tests = pgTable(
  'aptitude_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    candidate_id: uuid('candidate_id').references(() => recruiting_pipeline.id),
    member_id: uuid('member_id').references(() => members.id),
    score: integer('score').notNull(),
    breakdown: jsonb('breakdown').notNull().default({}),
    taken_at: timestamp('taken_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * resources — 素材ライブラリ（提案書/見積/契約テンプレ等の共有資産）
 * ============================================================ */

export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    name: text('name').notNull(),
    kind: text('kind').notNull(),
    file_url: text('file_url'),
    tags: jsonb('tags').default([]),
    created_by: uuid('created_by').references(() => members.id),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

/* ============================================================
 * emails — メール取込（Gmail 連携時、第8部 8.1）
 * ============================================================ */

export const emails = pgTable(
  'emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    company_id: uuid('company_id').notNull().references(() => companies.id),
    deal_id: uuid('deal_id').references(() => deals.id),
    member_id: uuid('member_id').references(() => members.id),
    direction: text('direction').notNull(),
    subject: text('subject'),
    body: text('body'),
    from_addr: text('from_addr'),
    to_addrs: jsonb('to_addrs').default([]),
    occurred_at: timestamp('occurred_at', { withTimezone: true }).notNull(),
    raw: jsonb('raw'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    dealOccurredIdx: index('emails_deal_occurred_idx').on(t.deal_id, t.occurred_at),
  })
);

/* ============================================================
 * Relations — Drizzle relational queries
 * ============================================================ */

export const companiesRelations = relations(companies, ({ many }) => ({
  members: many(members),
  customers: many(customers),
  deals: many(deals),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  company: one(companies, { fields: [members.company_id], references: [companies.id] }),
  deals: many(deals),
  tasks: many(tasks),
  actions: many(actions),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  company: one(companies, { fields: [deals.company_id], references: [companies.id] }),
  customer: one(customers, { fields: [deals.customer_id], references: [customers.id] }),
  assignee: one(members, { fields: [deals.assignee_id], references: [members.id] }),
  tasks: many(tasks),
  actions: many(actions),
  approvals: many(approvals),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  deal: one(deals, { fields: [tasks.deal_id], references: [deals.id] }),
  assignee: one(members, { fields: [tasks.assignee_id], references: [members.id] }),
}));

export const actionsRelations = relations(actions, ({ one }) => ({
  deal: one(deals, { fields: [actions.deal_id], references: [deals.id] }),
  member: one(members, { fields: [actions.member_id], references: [members.id] }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  company: one(companies, { fields: [customers.company_id], references: [companies.id] }),
  deals: many(deals),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  company: one(companies, { fields: [approvals.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [approvals.deal_id], references: [deals.id] }),
  requester: one(members, { fields: [approvals.requester_id], references: [members.id] }),
  approver: one(members, { fields: [approvals.approver_id], references: [members.id] }),
}));

export const mfJournalsRelations = relations(mf_journals, ({ one }) => ({
  company: one(companies, { fields: [mf_journals.company_id], references: [companies.id] }),
  matchedDeal: one(deals, { fields: [mf_journals.matched_deal_id], references: [deals.id] }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  company: one(companies, { fields: [meetings.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [meetings.deal_id], references: [deals.id] }),
  customer: one(customers, { fields: [meetings.customer_id], references: [customers.id] }),
  member: one(members, { fields: [meetings.member_id], references: [members.id] }),
}));

export const proposalsRelations = relations(proposals, ({ one }) => ({
  company: one(companies, { fields: [proposals.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [proposals.deal_id], references: [deals.id] }),
  createdBy: one(members, { fields: [proposals.created_by], references: [members.id] }),
}));

export const estimatesRelations = relations(estimates, ({ one }) => ({
  company: one(companies, { fields: [estimates.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [estimates.deal_id], references: [deals.id] }),
  createdBy: one(members, { fields: [estimates.created_by], references: [members.id] }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  company: one(companies, { fields: [invoices.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [invoices.deal_id], references: [deals.id] }),
  estimate: one(estimates, { fields: [invoices.estimate_id], references: [estimates.id] }),
  mfInvoice: one(mf_invoices, { fields: [invoices.mf_invoice_id], references: [mf_invoices.id] }),
}));

export const productionCardsRelations = relations(production_cards, ({ one, many }) => ({
  company: one(companies, { fields: [production_cards.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [production_cards.deal_id], references: [deals.id] }),
  bugs: many(bugs),
  deliverables: many(deliverables),
  reviews: many(reviews),
  test_cases: many(test_cases),
  purchase_orders: many(purchase_orders),
}));

export const timeLogsRelations = relations(time_logs, ({ one }) => ({
  company: one(companies, { fields: [time_logs.company_id], references: [companies.id] }),
  member: one(members, { fields: [time_logs.member_id], references: [members.id] }),
  deal: one(deals, { fields: [time_logs.deal_id], references: [deals.id] }),
  productionCard: one(production_cards, {
    fields: [time_logs.production_card_id],
    references: [production_cards.id],
  }),
  task: one(tasks, { fields: [time_logs.task_id], references: [tasks.id] }),
}));

export const bugsRelations = relations(bugs, ({ one }) => ({
  company: one(companies, { fields: [bugs.company_id], references: [companies.id] }),
  productionCard: one(production_cards, { fields: [bugs.production_card_id], references: [production_cards.id] }),
  reporter: one(members, { fields: [bugs.reporter_id], references: [members.id] }),
  assignee: one(members, { fields: [bugs.assignee_id], references: [members.id] }),
}));

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  company: one(companies, { fields: [vendors.company_id], references: [companies.id] }),
  purchase_orders: many(purchase_orders),
}));

export const purchaseOrdersRelations = relations(purchase_orders, ({ one }) => ({
  company: one(companies, { fields: [purchase_orders.company_id], references: [companies.id] }),
  productionCard: one(production_cards, {
    fields: [purchase_orders.production_card_id],
    references: [production_cards.id],
  }),
  deal: one(deals, { fields: [purchase_orders.deal_id], references: [deals.id] }),
  vendor: one(vendors, { fields: [purchase_orders.vendor_id], references: [vendors.id] }),
}));

export const deliverablesRelations = relations(deliverables, ({ one }) => ({
  productionCard: one(production_cards, {
    fields: [deliverables.production_card_id],
    references: [production_cards.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  productionCard: one(production_cards, {
    fields: [reviews.production_card_id],
    references: [production_cards.id],
  }),
  deliverable: one(deliverables, { fields: [reviews.deliverable_id], references: [deliverables.id] }),
  reviewer: one(members, { fields: [reviews.reviewer_id], references: [members.id] }),
}));

export const lostDealsRelations = relations(lost_deals, ({ one }) => ({
  company: one(companies, { fields: [lost_deals.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [lost_deals.deal_id], references: [deals.id] }),
  createdBy: one(members, { fields: [lost_deals.created_by], references: [members.id] }),
}));

export const attackPlansRelations = relations(attack_plans, ({ one }) => ({
  company: one(companies, { fields: [attack_plans.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [attack_plans.deal_id], references: [deals.id] }),
  member: one(members, { fields: [attack_plans.member_id], references: [members.id] }),
}));

export const attackScoresRelations = relations(attack_scores, ({ one }) => ({
  company: one(companies, { fields: [attack_scores.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [attack_scores.deal_id], references: [deals.id] }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  company: one(companies, { fields: [quotes.company_id], references: [companies.id] }),
  member: one(members, { fields: [quotes.member_id], references: [members.id] }),
}));

export const projectTemplatesRelations = relations(project_templates, ({ one }) => ({
  company: one(companies, { fields: [project_templates.company_id], references: [companies.id] }),
}));

export const commitmentsRelations = relations(commitments, ({ one }) => ({
  company: one(companies, { fields: [commitments.company_id], references: [companies.id] }),
  member: one(members, { fields: [commitments.member_id], references: [members.id] }),
  deal: one(deals, { fields: [commitments.deal_id], references: [deals.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  company: one(companies, { fields: [referrals.company_id], references: [companies.id] }),
  customer: one(customers, { fields: [referrals.customer_id], references: [customers.id] }),
  referrerCustomer: one(customers, {
    fields: [referrals.referrer_customer_id],
    references: [customers.id],
  }),
  referrerMember: one(members, {
    fields: [referrals.referrer_member_id],
    references: [members.id],
  }),
}));

export const leavesRelations = relations(leaves, ({ one }) => ({
  company: one(companies, { fields: [leaves.company_id], references: [companies.id] }),
  member: one(members, { fields: [leaves.member_id], references: [members.id] }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  company: one(companies, { fields: [integrations.company_id], references: [companies.id] }),
}));

export const reconciliationsRelations = relations(reconciliations, ({ one }) => ({
  company: one(companies, { fields: [reconciliations.company_id], references: [companies.id] }),
  mfJournal: one(mf_journals, { fields: [reconciliations.mf_journal_id], references: [mf_journals.id] }),
  mfInvoice: one(mf_invoices, { fields: [reconciliations.mf_invoice_id], references: [mf_invoices.id] }),
  deal: one(deals, { fields: [reconciliations.deal_id], references: [deals.id] }),
  invoice: one(invoices, { fields: [reconciliations.invoice_id], references: [invoices.id] }),
  matchedBy: one(members, { fields: [reconciliations.matched_by], references: [members.id] }),
}));

export const notificationPrefsRelations = relations(notification_prefs, ({ one }) => ({
  company: one(companies, { fields: [notification_prefs.company_id], references: [companies.id] }),
  member: one(members, { fields: [notification_prefs.member_id], references: [members.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  company: one(companies, { fields: [notifications.company_id], references: [companies.id] }),
  member: one(members, { fields: [notifications.member_id], references: [members.id] }),
}));

export const aiConversationsRelations = relations(ai_conversations, ({ one }) => ({
  company: one(companies, { fields: [ai_conversations.company_id], references: [companies.id] }),
  member: one(members, { fields: [ai_conversations.member_id], references: [members.id] }),
  deal: one(deals, { fields: [ai_conversations.deal_id], references: [deals.id] }),
}));

export const aiJobsRelations = relations(ai_jobs, ({ one }) => ({
  company: one(companies, { fields: [ai_jobs.company_id], references: [companies.id] }),
  member: one(members, { fields: [ai_jobs.member_id], references: [members.id] }),
}));

export const aiUsageRelations = relations(ai_usage, ({ one }) => ({
  company: one(companies, { fields: [ai_usage.company_id], references: [companies.id] }),
  member: one(members, { fields: [ai_usage.member_id], references: [members.id] }),
  job: one(ai_jobs, { fields: [ai_usage.job_id], references: [ai_jobs.id] }),
}));

export const changeLogsRelations = relations(change_logs, ({ one }) => ({
  company: one(companies, { fields: [change_logs.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [change_logs.deal_id], references: [deals.id] }),
  productionCard: one(production_cards, {
    fields: [change_logs.production_card_id],
    references: [production_cards.id],
  }),
  member: one(members, { fields: [change_logs.member_id], references: [members.id] }),
}));

export const importJobsRelations = relations(import_jobs, ({ one, many }) => ({
  company: one(companies, { fields: [import_jobs.company_id], references: [companies.id] }),
  member: one(members, { fields: [import_jobs.member_id], references: [members.id] }),
  failures: many(import_failures),
}));

export const importFailuresRelations = relations(import_failures, ({ one }) => ({
  job: one(import_jobs, { fields: [import_failures.job_id], references: [import_jobs.id] }),
  company: one(companies, { fields: [import_failures.company_id], references: [companies.id] }),
}));

export const monthlyReportsRelations = relations(monthly_reports, ({ one }) => ({
  company: one(companies, { fields: [monthly_reports.company_id], references: [companies.id] }),
  createdBy: one(members, { fields: [monthly_reports.created_by], references: [members.id] }),
}));

export const bridgeNoticesRelations = relations(bridge_notices, ({ one }) => ({
  company: one(companies, { fields: [bridge_notices.company_id], references: [companies.id] }),
  acknowledgedBy: one(members, {
    fields: [bridge_notices.acknowledged_by],
    references: [members.id],
  }),
}));

export const recruitingPipelineRelations = relations(recruiting_pipeline, ({ one, many }) => ({
  company: one(companies, { fields: [recruiting_pipeline.company_id], references: [companies.id] }),
  tests: many(aptitude_tests),
}));

export const aptitudeTestsRelations = relations(aptitude_tests, ({ one }) => ({
  company: one(companies, { fields: [aptitude_tests.company_id], references: [companies.id] }),
  candidate: one(recruiting_pipeline, {
    fields: [aptitude_tests.candidate_id],
    references: [recruiting_pipeline.id],
  }),
  member: one(members, { fields: [aptitude_tests.member_id], references: [members.id] }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  company: one(companies, { fields: [resources.company_id], references: [companies.id] }),
  createdBy: one(members, { fields: [resources.created_by], references: [members.id] }),
}));

export const emailsRelations = relations(emails, ({ one }) => ({
  company: one(companies, { fields: [emails.company_id], references: [companies.id] }),
  deal: one(deals, { fields: [emails.deal_id], references: [deals.id] }),
  member: one(members, { fields: [emails.member_id], references: [members.id] }),
}));

export const rolePermissionsRelations = relations(role_permissions, ({ one }) => ({
  company: one(companies, { fields: [role_permissions.company_id], references: [companies.id] }),
}));

/* ============================================================
 * Type exports（NextAuth・API ルートで使う）
 * ============================================================ */

export type Company = typeof companies.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type Action = typeof actions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
export type AuditLog = typeof audit_logs.$inferSelect;

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
export type NewProposal = typeof proposals.$inferInsert;
export type Estimate = typeof estimates.$inferSelect;
export type NewEstimate = typeof estimates.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type ProductionCard = typeof production_cards.$inferSelect;
export type NewProductionCard = typeof production_cards.$inferInsert;
export type TimeLog = typeof time_logs.$inferSelect;
export type Bug = typeof bugs.$inferSelect;
export type Vendor = typeof vendors.$inferSelect;
export type PurchaseOrder = typeof purchase_orders.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type TestCase = typeof test_cases.$inferSelect;
export type ChangeLog = typeof change_logs.$inferSelect;
export type LostDeal = typeof lost_deals.$inferSelect;
export type AttackPlan = typeof attack_plans.$inferSelect;
export type AttackScore = typeof attack_scores.$inferSelect;
export type Quote = typeof quotes.$inferSelect;
export type NewQuote = typeof quotes.$inferInsert;
export type ProjectTemplate = typeof project_templates.$inferSelect;
export type Commitment = typeof commitments.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type Leave = typeof leaves.$inferSelect;
export type Integration = typeof integrations.$inferSelect;
export type Reconciliation = typeof reconciliations.$inferSelect;
export type NotificationPref = typeof notification_prefs.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type RolePermission = typeof role_permissions.$inferSelect;
export type AiConversation = typeof ai_conversations.$inferSelect;
export type AiJob = typeof ai_jobs.$inferSelect;
export type AiUsage = typeof ai_usage.$inferSelect;
export type BudgetActual = typeof budget_actuals.$inferSelect;
export type BudgetSegment = typeof budget_segments.$inferSelect;
export type BudgetFixedCost = typeof budget_fixed_costs.$inferSelect;
export type MonthlyReport = typeof monthly_reports.$inferSelect;
export type BridgeNotice = typeof bridge_notices.$inferSelect;
export type ImportJob = typeof import_jobs.$inferSelect;
export type ImportFailure = typeof import_failures.$inferSelect;
export type RecruitingCandidate = typeof recruiting_pipeline.$inferSelect;
export type AptitudeTest = typeof aptitude_tests.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type Email = typeof emails.$inferSelect;
