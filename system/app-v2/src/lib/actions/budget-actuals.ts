'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, gte, lte } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { budget_actuals } from '@/db/schema';

const actualSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  revenue: z.coerce.number().int().nonnegative().default(0),
  cogs: z.coerce.number().int().nonnegative().default(0),
  sga: z.coerce.number().int().nonnegative().default(0),
  operating_profit: z.coerce.number().int().default(0),
  source: z.string().max(40).optional().nullable(),
});

export type BudgetActualFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
  inserted?: number;
  updated?: number;
};

export async function listBudgetActualsForYear(year: number) {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(budget_actuals)
    .where(
      and(
        eq(budget_actuals.company_id, session.user.company_id),
        eq(budget_actuals.year, year)
      )
    )
    .orderBy(budget_actuals.month);
}

export async function upsertBudgetActual(
  year: number,
  month: number,
  data: { revenue: number; cogs: number; sga: number; source?: string }
): Promise<{ inserted: boolean }> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const operating_profit = data.revenue - data.cogs - data.sga;

  const existing = await db
    .select({ id: budget_actuals.id })
    .from(budget_actuals)
    .where(
      and(
        eq(budget_actuals.company_id, session.user.company_id),
        eq(budget_actuals.year, year),
        eq(budget_actuals.month, month)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(budget_actuals)
      .set({
        revenue: data.revenue,
        cogs: data.cogs,
        sga: data.sga,
        operating_profit,
        source: data.source ?? null,
        updated_at: new Date(),
      })
      .where(eq(budget_actuals.id, existing.id));
    return { inserted: false };
  }

  await db.insert(budget_actuals).values({
    company_id: session.user.company_id,
    year,
    month,
    revenue: data.revenue,
    cogs: data.cogs,
    sga: data.sga,
    operating_profit,
    source: data.source ?? null,
  });
  return { inserted: true };
}

const csvLineSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  revenue: z.coerce.number().int().nonnegative(),
  cogs: z.coerce.number().int().nonnegative(),
  sga: z.coerce.number().int().nonnegative(),
});

type CsvRow = z.infer<typeof csvLineSchema>;

function parseCsv(csv: string): { rows: CsvRow[]; errors: string[] } {
  const errors: string[] = [];
  const rows: CsvRow[] = [];

  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    errors.push('CSV が空です');
    return { rows, errors };
  }

  const header = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  const required = ['year', 'month', 'revenue', 'cogs', 'sga'];
  for (const r of required) {
    if (!header.includes(r)) {
      errors.push(`必須カラム "${r}" がありません`);
    }
  }
  if (errors.length > 0) return { rows, errors };

  const yIdx = header.indexOf('year');
  const mIdx = header.indexOf('month');
  const rIdx = header.indexOf('revenue');
  const cIdx = header.indexOf('cogs');
  const sIdx = header.indexOf('sga');

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i]!.split(',').map((c) => c.trim());
    const parsed = csvLineSchema.safeParse({
      year: cells[yIdx],
      month: cells[mIdx],
      revenue: cells[rIdx],
      cogs: cells[cIdx],
      sga: cells[sIdx],
    });
    if (!parsed.success) {
      errors.push(`${i + 1}行目: ${parsed.error.issues[0]?.message ?? '形式不正'}`);
      continue;
    }
    rows.push(parsed.data);
  }
  return { rows, errors };
}

export async function importBudgetActualsFromCsv(
  _prev: BudgetActualFormState,
  formData: FormData
): Promise<BudgetActualFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const csv = (formData.get('csv') ?? '').toString();
  if (!csv.trim()) {
    return { errors: { _form: ['CSV が空です'] } };
  }

  const { rows, errors } = parseCsv(csv);
  if (errors.length > 0) {
    return { errors: { _form: errors } };
  }

  let inserted = 0;
  let updated = 0;
  const years = new Set<number>();

  for (const row of rows) {
    const result = await upsertBudgetActual(row.year, row.month, {
      revenue: row.revenue,
      cogs: row.cogs,
      sga: row.sga,
      source: 'csv',
    });
    if (result.inserted) inserted++;
    else updated++;
    years.add(row.year);
  }

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'budget_actual.import_csv',
    resource_type: 'budget_actual',
    metadata: { inserted, updated, rows: rows.length, years: Array.from(years) },
  });

  revalidatePath('/budget');
  return { success: true, inserted, updated };
}
