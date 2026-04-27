import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { members } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { WeeklyTabs } from '../_components/tabs';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { WeeklyInputGrid } from './_components/weekly-input-grid';

function lastMondayISO(today: Date): string {
  const d = new Date(today);
  const day = d.getDay();
  const offset = day === 0 ? 13 : day + 6;
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

type SearchParams = { focus?: string; date?: string };

export default async function WeeklyInputPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const presentation = sp.focus === 'presentation';
  const defaultDate = sp.date ?? lastMondayISO(new Date());

  const memberRows = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .where(
      and(
        eq(members.company_id, session.user.company_id),
        eq(members.status, 'active'),
        isNull(members.deleted_at),
      )
    )
    .orderBy(asc(members.name));

  return (
    <>
      <PageHeader
        eyebrow="週次入力"
        title="行動量まとめ入力"
        subtitle="週次会議で全員分の行動量を1画面で記録。grid を埋めて「まとめて保存」"
        actions={
          <Link
            href={presentation ? '/weekly/input' : '/weekly/input?focus=presentation'}
            className="px-4 py-2 text-sm border border-border rounded text-muted hover:text-ink hover:border-ink transition-colors"
          >
            {presentation ? '通常表示' : '大画面モード'}
          </Link>
        }
      />
      <WeeklyTabs />

      <div className={`${presentation ? 'max-w-7xl' : 'max-w-5xl'} mx-auto px-6 py-8`}>
        {memberRows.length === 0 ? (
          <EmptyState
            icon="◍"
            title="メンバーがいません"
            description="まず /settings/company か /team でメンバーを登録してください。"
            cta={{ label: 'メンバー設定へ', href: '/settings/company' }}
          />
        ) : (
          <WeeklyInputGrid
            members={memberRows}
            defaultOccurredOn={defaultDate}
            presentation={presentation}
          />
        )}
      </div>
    </>
  );
}
