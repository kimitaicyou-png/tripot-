import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, deals } from '@/db/schema';
import { eq, and, isNull, desc, sql, lt, gte, lte, ne, type SQL } from 'drizzle-orm';
import { TaskCheckbox } from './task-checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskFilterTabs } from './_components/task-filter-tabs';

type TaskFilter = 'all' | 'overdue' | 'today' | 'week' | 'no-deal';

const VALID_FILTERS: readonly TaskFilter[] = ['all', 'overdue', 'today', 'week', 'no-deal'];

const PAGE_SIZE = 50;

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const filter: TaskFilter = VALID_FILTERS.includes(sp.filter as TaskFilter)
    ? (sp.filter as TaskFilter)
    : 'all';
  const requestedPage = Math.max(1, Number(sp.page) || 1);
  const offset = (requestedPage - 1) * PAGE_SIZE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const weekAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // ベース条件（自分のタスク、未削除）
  const baseConds: SQL[] = [
    eq(tasks.assignee_id, session.user.member_id),
    eq(tasks.company_id, session.user.company_id),
    isNull(tasks.deleted_at),
  ];

  // フィルタ条件を SQL レベルで構築（メモリじゃなく DB で絞る、ページネーション対応）
  function applyFilterConds(): SQL[] {
    const conds = [...baseConds];
    if (filter === 'overdue') {
      conds.push(lt(tasks.due_date, todayStr));
      conds.push(ne(tasks.status, 'done'));
    } else if (filter === 'today') {
      conds.push(eq(tasks.due_date, todayStr));
    } else if (filter === 'week') {
      conds.push(gte(tasks.due_date, todayStr));
      conds.push(lte(tasks.due_date, weekAhead));
    } else if (filter === 'no-deal') {
      conds.push(isNull(tasks.deal_id));
    }
    return conds;
  }

  // フィルタ別件数（タブ badge 用、並列計算）
  const [
    pageRows,
    totalRow,
    todoTotalRow,
    doneTotalRow,
    overdueCountRow,
    todayCountRow,
    weekCountRow,
    noDealCountRow,
  ] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        due_date: tasks.due_date,
        deal_title: deals.title,
        deal_id: deals.id,
      })
      .from(tasks)
      .leftJoin(deals, eq(tasks.deal_id, deals.id))
      .where(and(...applyFilterConds()))
      .orderBy(desc(tasks.updated_at))
      .limit(PAGE_SIZE)
      .offset(offset),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...applyFilterConds()))
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...baseConds, ne(tasks.status, 'done')))
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...baseConds, eq(tasks.status, 'done')))
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...baseConds, ne(tasks.status, 'done'), lt(tasks.due_date, todayStr)))
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...baseConds, ne(tasks.status, 'done'), eq(tasks.due_date, todayStr)))
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(
        and(
          ...baseConds,
          ne(tasks.status, 'done'),
          gte(tasks.due_date, todayStr),
          lte(tasks.due_date, weekAhead),
        ),
      )
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(and(...baseConds, ne(tasks.status, 'done'), isNull(tasks.deal_id)))
      .then((r) => r[0]),
  ]);

  const filteredTotal = totalRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);

  const todoTotal = todoTotalRow?.count ?? 0;
  const doneTotal = doneTotalRow?.count ?? 0;
  const overdueTotal = overdueCountRow?.count ?? 0;

  const counts: Record<string, number> = {
    all: todoTotal,
    overdue: overdueTotal,
    today: todayCountRow?.count ?? 0,
    week: weekCountRow?.count ?? 0,
    'no-deal': noDealCountRow?.count ?? 0,
  };

  const pageTodos = pageRows.filter((t) => t.status !== 'done');
  const pageDones = pageRows.filter((t) => t.status === 'done');

  function isOverdueRow(due: string | null): boolean {
    if (!due) return false;
    return new Date(`${due}T00:00:00`).getTime() < today.getTime();
  }

  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (filter !== 'all') params.set('filter', filter);
    if (p > 1) params.set('page', String(p));
    return `/tasks${params.toString() ? `?${params.toString()}` : ''}`;
  }

  const hasAny = todoTotal + doneTotal > 0;

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="MY TASKS"
        title="マイタスク"
        subtitle={
          <>
            残 <span className="font-mono tabular-nums text-gray-900">{todoTotal}</span> ／ 完了{' '}
            <span className="font-mono tabular-nums text-gray-900">{doneTotal}</span>
          </>
        }
        actions={
          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors active:scale-[0.98]"
          >
            新規登録
          </Link>
        }
      />

      <div className="px-6 py-10 max-w-3xl mx-auto space-y-8">
        {!hasAny ? (
          <EmptyState
            icon="✓"
            title="タスクはまだありません"
            description="案件詳細からタスクを追加できます。"
            cta={{ href: '/tasks/new', label: 'タスクを登録する' }}
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4">
              <StatCard label="残タスク" value={todoTotal} />
              <StatCard
                label="期限切れ"
                value={overdueTotal}
                tone={overdueTotal > 0 ? 'down' : 'default'}
              />
              <StatCard label="完了" value={doneTotal} tone="up" />
            </section>

            <TaskFilterTabs counts={counts} />

            {pageRows.length === 0 ? (
              <EmptyState
                icon="◯"
                title="該当タスクなし"
                description="フィルタを変えるか、新規登録してください"
              />
            ) : (
              <>
                {pageTodos.length > 0 && (
                  <section>
                    <SectionHeading
                      eyebrow="TO DO"
                      title="やる"
                      count={pageTodos.length}
                    />
                    <ul className="space-y-2">
                      {pageTodos.map((t) => {
                        const overdue = isOverdueRow(t.due_date);
                        return (
                          <li
                            key={t.id}
                            className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
                          >
                            <TaskCheckbox taskId={t.id} done={false} />
                            <Link
                              href={`/tasks/${t.id}`}
                              className="flex-1 min-w-0 hover:opacity-80 transition-opacity"
                            >
                              <p className="text-sm text-gray-900 truncate">{t.title}</p>
                              {t.deal_title && (
                                <p className="text-xs text-gray-500 mt-0.5 truncate inline-flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" />
                                  {t.deal_title}
                                </p>
                              )}
                            </Link>
                            {t.due_date && (
                              <p
                                className={`text-xs font-mono shrink-0 tabular-nums ${
                                  overdue ? 'text-red-700 font-medium' : 'text-gray-700'
                                }`}
                              >
                                {t.due_date}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}

                {pageDones.length > 0 && (
                  <section>
                    <SectionHeading
                      eyebrow="DONE"
                      title="完了"
                      count={pageDones.length}
                    />
                    <ul className="space-y-2">
                      {pageDones.map((t) => (
                        <li
                          key={t.id}
                          className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 opacity-60"
                        >
                          <TaskCheckbox taskId={t.id} done={true} />
                          <Link
                            href={`/tasks/${t.id}`}
                            className="flex-1 min-w-0 hover:opacity-100 transition-opacity"
                          >
                            <p className="text-sm text-gray-900 line-through truncate">
                              {t.title}
                            </p>
                            {t.deal_title && (
                              <p className="text-xs text-gray-500 mt-0.5 truncate inline-flex items-center gap-1">
                                <Briefcase className="w-3 h-3" />
                                {t.deal_title}
                              </p>
                            )}
                          </Link>
                          {t.due_date && (
                            <p className="text-xs font-mono tabular-nums text-gray-700 shrink-0">
                              {t.due_date}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {totalPages > 1 && (
                  <nav
                    className="flex items-center justify-between gap-3 pt-4 border-t border-gray-200"
                    aria-label="ページネーション"
                  >
                    <p className="text-xs text-gray-600">
                      {(currentPage - 1) * PAGE_SIZE + 1}–
                      {Math.min(currentPage * PAGE_SIZE, filteredTotal)} / 全{' '}
                      <span className="font-mono tabular-nums text-gray-900">
                        {filteredTotal}
                      </span>{' '}
                      件
                    </p>
                    <div className="flex items-center gap-2">
                      {currentPage > 1 ? (
                        <Link
                          href={pageHref(currentPage - 1)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                        >
                          ← 前へ
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">
                          ← 前へ
                        </span>
                      )}
                      <span className="font-mono tabular-nums text-xs text-gray-700 px-2">
                        {currentPage} / {totalPages}
                      </span>
                      {currentPage < totalPages ? (
                        <Link
                          href={pageHref(currentPage + 1)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
                        >
                          次へ →
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg">
                          次へ →
                        </span>
                      )}
                    </div>
                  </nav>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
