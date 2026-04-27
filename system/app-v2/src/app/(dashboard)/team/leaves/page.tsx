import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { listLeaves } from '@/lib/actions/leaves';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeading } from '@/components/ui/section-heading';
import { LeaveForm } from './_components/leave-form';
import { LeaveRow } from './_components/leave-row';

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type SearchParams = { from?: string; to?: string };

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = sp.from ?? toDateString(addDays(today, -7));
  const rangeEnd = sp.to ?? toDateString(addDays(today, 60));

  const [memberRows, leavesRows] = await Promise.all([
    db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(
        and(
          eq(members.company_id, session.user.company_id),
          eq(members.status, 'active'),
          isNull(members.deleted_at)
        )
      )
      .orderBy(asc(members.name)),
    listLeaves(rangeStart, rangeEnd),
  ]);

  const upcoming = leavesRows.filter((l) => l.end_date >= toDateString(today));
  const past = leavesRows.filter((l) => l.end_date < toDateString(today));

  const totalDays = leavesRows.reduce((sum, l) => {
    const s = new Date(l.start_date).getTime();
    const e = new Date(l.end_date).getTime();
    return sum + Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1);
  }, 0);

  return (
    <main className="min-h-screen bg-surface">
      <PageHeader
        eyebrow="LEAVES"
        title="休暇カレンダー"
        subtitle={
          <>
            <span className="font-mono tabular-nums text-ink">{rangeStart}</span> 〜{' '}
            <span className="font-mono tabular-nums text-ink">{rangeEnd}</span> ／ 取得{' '}
            <span className="font-mono tabular-nums text-ink">{leavesRows.length}</span>件{' '}
            <span className="font-mono tabular-nums text-ink">{totalDays}</span>日
          </>
        }
        back={{ href: '/team', label: 'チーム' }}
      />

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        <LeaveForm members={memberRows} />

        <section>
          <SectionHeading
            eyebrow="UPCOMING"
            title="これからの休暇"
            count={upcoming.length}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon="◌"
              title="予定された休暇はありません"
              description="上の「＋ 休暇を追加」から登録できます"
            />
          ) : (
            <ul className="space-y-2">
              {upcoming.map((l) => (
                <LeaveRow key={l.id} {...l} />
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 && (
          <section>
            <SectionHeading
              eyebrow="PAST"
              title="過去の休暇"
              count={past.length}
            />
            <ul className="space-y-2">
              {past.map((l) => (
                <LeaveRow key={l.id} {...l} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
