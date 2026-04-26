import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { deals } from '@/db/schema';
import { eq, and, isNull, gte, lte, ne } from 'drizzle-orm';
import { WeeklyTabs } from '../_components/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { HeroValue, StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';

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
  prospect: 'bg-slate-300',
  proposing: 'bg-blue-400',
  ordered: 'bg-amber-400',
  in_production: 'bg-indigo-400',
  delivered: 'bg-purple-400',
  acceptance: 'bg-pink-400',
  invoiced: 'bg-rose-400',
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
    const weekIndex = Math.floor(
      (date.getTime() - week0Start.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
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
      <PageHeader
        eyebrow="WEEKLY · CASHFLOW"
        title="6週間 入金予測"
        subtitle={
          <span className="font-mono">
            {shortDate(week0Start)}〜{shortDate(horizonEnd)}
          </span>
        }
      />

      <WeeklyTabs />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-12">
        <HeroValue
          label="6週合計（確度加重）"
          value={formatYen(totalWeighted)}
          tone="accent"
          sub={
            <>
              単純合計{' '}
              <span className="font-mono tabular-nums text-ink font-medium">
                {formatYen(totalRaw)}
              </span>
              ／ ステージ別重み付け（提案30% / 受注70% / 制作80% / 検収95%）
            </>
          }
        />

        <section className="space-y-4">
          <SectionHeading eyebrow="WEEKS" title="週別ブレイクダウン" />
          {weeks.map((w) => {
            const widthPct = Math.round((w.raw / maxRaw) * 100);
            return (
              <div key={w.index} className="bg-card border border-border rounded-xl p-5 shadow-sm">
                <div className="flex items-baseline justify-between mb-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-subtle">
                      Week {w.index + 1}
                    </p>
                    <p className="text-sm text-ink font-mono mt-0.5">{w.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif italic text-2xl text-ink tabular-nums leading-none">
                      {formatYen(w.raw)}
                    </p>
                    <p className="text-xs text-amber-700 font-mono tabular-nums mt-1">
                      加重 {formatYen(w.weighted)}
                    </p>
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
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
                  <ul className="mt-3 space-y-1">
                    {w.deals.map((d) => (
                      <li key={d.id} className="text-xs text-muted flex items-center gap-2">
                        <span
                          className={`inline-block w-2 h-2 rounded-sm shrink-0 ${STAGE_COLOR[d.stage] ?? 'bg-slate-300'}`}
                        />
                        <span className="truncate flex-1">{d.title}</span>
                        <span className="font-mono tabular-nums text-ink shrink-0">
                          {formatYen(d.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="6週合計" value={formatYen(totalRaw)} />
          <StatCard label="加重合計" value={formatYen(totalWeighted)} tone="accent" />
          <StatCard label="案件数" value={rows.length} sub="受注予定6週内" />
          <StatCard
            label="平均/週"
            value={formatYen(Math.round(totalRaw / 6))}
          />
        </section>

        <section className="bg-card border border-border rounded-xl p-5">
          <p className="text-xs uppercase tracking-widest text-subtle mb-3">LEGEND</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STAGE_LABEL).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5 text-xs text-muted">
                <span className={`inline-block w-3 h-3 rounded-sm ${STAGE_COLOR[k]}`} />
                <span>
                  {v}
                  <span className="text-subtle ml-1">
                    ({Math.round((STAGE_WEIGHT[k] ?? 0) * 100)}%)
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
