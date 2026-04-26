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
