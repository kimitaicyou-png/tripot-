import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals } from '@/db/schema';
import { eq, and, isNull, gte, lte, ne } from 'drizzle-orm';
import { WeeklyTabs } from '../_components/tabs';

const STAGE_WEIGHT: Record<string, number> = {
  prospect: 0.1,
  proposing: 0.3,
  ordered: 0.7,
  in_production: 0.8,
  delivered: 0.9,
  acceptance: 0.95,
  invoiced: 0.95,
};

const STAGE_LABEL: Record<string, string> = {
  prospect: '見込み',
  proposing: '提案中',
  ordered: '受注',
  in_production: '制作中',
  delivered: '納品済',
  acceptance: '検収',
  invoiced: '請求済',
};

const STAGE_COLOR: Record<string, string> = {
  prospect: 'bg-slate-200',
  proposing: 'bg-blue-200',
  ordered: 'bg-amber-300',
  in_production: 'bg-indigo-300',
  delivered: 'bg-purple-300',
  acceptance: 'bg-pink-300',
  invoiced: 'bg-rose-300',
};

function formatYen(value: number): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shortDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function WeeklyCfPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const today = new Date();
  const week0Start = startOfWeek(today);
  const horizonEnd = addDays(week0Start, 7 * 6 - 1);

  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      stage: deals.stage,
      amount: deals.amount,
      expected_close_date: deals.expected_close_date,
    })
    .from(deals)
    .where(
      and(
        eq(deals.company_id, session.user.company_id),
        isNull(deals.deleted_at),
        ne(deals.stage, 'lost'),
        ne(deals.stage, 'paid'),
        gte(deals.expected_close_date, toIsoDate(week0Start)),
        lte(deals.expected_close_date, toIsoDate(horizonEnd)),
      ),
    );

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const start = addDays(week0Start, i * 7);
    const end = addDays(start, 6);
    return {
      index: i,
      start,
      end,
      label: `${shortDate(start)}〜${shortDate(end)}`,
      raw: 0,
      weighted: 0,
      stages: {} as Record<string, number>,
      deals: [] as { id: string; title: string; stage: string; amount: number }[],
    };
  });

  for (const r of rows) {
    if (!r.expected_close_date) continue;
    const date = new Date(`${r.expected_close_date}T00:00:00`);
    const weekIndex = Math.floor((date.getTime() - week0Start.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (weekIndex < 0 || weekIndex >= 6) continue;
    const w = weeks[weekIndex]!;
    const amount = r.amount ?? 0;
    const weight = STAGE_WEIGHT[r.stage] ?? 0.5;
    w.raw += amount;
    w.weighted += Math.round(amount * weight);
    w.stages[r.stage] = (w.stages[r.stage] ?? 0) + amount;
    w.deals.push({ id: r.id, title: r.title, stage: r.stage, amount });
  }

  const maxRaw = Math.max(...weeks.map((w) => w.raw), 1);
  const totalRaw = weeks.reduce((s, w) => s + w.raw, 0);
  const totalWeighted = weeks.reduce((s, w) => s + w.weighted, 0);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-ink">週次レポート</h1>
        <p className="text-xs text-subtle mt-1 font-mono">
          6週間先の入金予測（{shortDate(week0Start)}〜{shortDate(horizonEnd)}）
        </p>
      </header>

      <WeeklyTabs />

      <div className="px-6 py-8 max-w-5xl mx-auto">
        <section className="mb-8 grid grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-muted">6週合計（単純）</p>
            <h2 className="font-serif italic text-4xl md:text-5xl text-ink tracking-tight tabular-nums mt-2">
              {formatYen(totalRaw)}
            </h2>
          </div>
          <div>
            <p className="text-sm text-muted">6週合計（確度加重）</p>
            <h2 className="font-serif italic text-4xl md:text-5xl text-ink tracking-tight tabular-nums mt-2">
              {formatYen(totalWeighted)}
            </h2>
            <p className="text-xs text-subtle mt-1">ステージ別重み付け（提案30% / 受注70% / 制作80% / 検収95%）</p>
          </div>
        </section>

        <section className="space-y-3 mb-10">
          {weeks.map((w) => {
            const widthPct = Math.round((w.raw / maxRaw) * 100);
            return (
              <div key={w.index} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-ink">
                    Week {w.index + 1}{' '}
                    <span className="text-xs text-subtle font-mono ml-1">{w.label}</span>
                  </p>
                  <p className="font-mono tabular-nums text-ink font-semibold">
                    {formatYen(w.raw)}
                    <span className="text-xs text-subtle ml-2">
                      ({formatYen(w.weighted)} 加重)
                    </span>
                  </p>
                </div>
                <div className="h-6 bg-slate-100 rounded-md overflow-hidden flex">
                  {Object.entries(w.stages).map(([stage, amount]) => {
                    const segPct = w.raw === 0 ? 0 : (amount / w.raw) * widthPct;
                    return (
                      <div
                        key={stage}
                        className={STAGE_COLOR[stage] ?? 'bg-slate-300'}
                        style={{ width: `${segPct}%` }}
                        title={`${STAGE_LABEL[stage] ?? stage}: ${formatYen(amount)}`}
                      />
                    );
                  })}
                </div>
                {w.deals.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {w.deals.map((d) => (
                      <li key={d.id} className="text-xs text-muted flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-sm ${STAGE_COLOR[d.stage] ?? 'bg-slate-300'}`}
                        />
                        <span className="truncate flex-1">{d.title}</span>
                        <span className="font-mono tabular-nums">{formatYen(d.amount)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        <section className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-subtle mb-2">ステージ凡例</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STAGE_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`inline-block w-3 h-3 rounded-sm ${STAGE_COLOR[k]}`} />
                <span>
                  {v}
                  <span className="text-subtle ml-1">({Math.round((STAGE_WEIGHT[k] ?? 0) * 100)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
