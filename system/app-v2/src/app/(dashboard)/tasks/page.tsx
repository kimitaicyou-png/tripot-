import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Briefcase } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, deals } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { TaskCheckbox } from './task-checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';
import { TaskFilterTabs } from './_components/task-filter-tabs';

type TaskFilter = 'all' | 'overdue' | 'today' | 'week' | 'no-deal';

const VALID_FILTERS: readonly TaskFilter[] = ['all', 'overdue', 'today', 'week', 'no-deal'];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const filter: TaskFilter = VALID_FILTERS.includes(sp.filter as TaskFilter)
    ? (sp.filter as TaskFilter)
    : 'all';

  const allMyTasks = await db
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
    .where(
      and(
        eq(tasks.assignee_id, session.user.member_id),
        eq(tasks.company_id, session.user.company_id),
        isNull(tasks.deleted_at),
      ),
    )
    .orderBy(desc(tasks.updated_at))
    .limit(200);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();
  const weekAheadMs = todayMs + 7 * 24 * 60 * 60 * 1000;

  function isOverdue(due: string | null): boolean {
    if (!due) return false;
    return new Date(`${due}T00:00:00`).getTime() < todayMs;
  }
  function isToday(due: string | null): boolean {
    if (!due) return false;
    const d = new Date(`${due}T00:00:00`).getTime();
    return d === todayMs;
  }
  function isWithinWeek(due: string | null): boolean {
    if (!due) return false;
    const d = new Date(`${due}T00:00:00`).getTime();
    return d >= todayMs && d <= weekAheadMs;
  }

  // フィルタ後リスト
  const todoBase = allMyTasks.filter((t) => t.status !== 'done');
  const doneBase = allMyTasks.filter((t) => t.status === 'done');

  function applyFilter(list: typeof allMyTasks): typeof allMyTasks {
    switch (filter) {
      case 'overdue':
        return list.filter((t) => isOverdue(t.due_date));
      case 'today':
        return list.filter((t) => isToday(t.due_date));
      case 'week':
        return list.filter((t) => isWithinWeek(t.due_date));
      case 'no-deal':
        return list.filter((t) => !t.deal_id);
      default:
        return list;
    }
  }

  const todoTasks = applyFilter(todoBase);
  const doneTasks = applyFilter(doneBase);
  const todoCount = todoTasks.length;
  const doneCount = doneTasks.length;
  const overdueCount = todoBase.filter((t) => isOverdue(t.due_date)).length;

  // フィルタ別件数（タブの右側に数値表示用）
  const counts: Record<string, number> = {
    all: todoBase.length,
    overdue: overdueCount,
    today: todoBase.filter((t) => isToday(t.due_date)).length,
    week: todoBase.filter((t) => isWithinWeek(t.due_date)).length,
    'no-deal': todoBase.filter((t) => !t.deal_id).length,
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="MY TASKS"
        title="マイタスク"
        subtitle={
          <>
            残 <span className="font-mono tabular-nums text-gray-900">{todoBase.length}</span> ／ 完了{' '}
            <span className="font-mono tabular-nums text-gray-900">{doneBase.length}</span>
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
        {allMyTasks.length === 0 ? (
          <EmptyState
            icon="✓"
            title="タスクはまだありません"
            description="案件詳細からタスクを追加できます。"
            cta={{ href: '/tasks/new', label: 'タスクを登録する' }}
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4">
              <StatCard label="残タスク" value={todoBase.length} />
              <StatCard
                label="期限切れ"
                value={overdueCount}
                tone={overdueCount > 0 ? 'down' : 'default'}
              />
              <StatCard label="完了" value={doneBase.length} tone="up" />
            </section>

            <TaskFilterTabs counts={counts} />

            {todoTasks.length === 0 && doneTasks.length === 0 ? (
              <EmptyState
                icon="◯"
                title="該当タスクなし"
                description="フィルタを変えるか、新規登録してください"
              />
            ) : (
              <>
                {todoTasks.length > 0 && (
                  <section>
                    <SectionHeading
                      eyebrow="TO DO"
                      title="やる"
                      count={todoCount}
                    />
                    <ul className="space-y-2">
                      {todoTasks.map((t) => {
                        const overdue = isOverdue(t.due_date);
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

                {doneTasks.length > 0 && (
                  <section>
                    <SectionHeading
                      eyebrow="DONE"
                      title="完了"
                      count={doneCount}
                    />
                    <ul className="space-y-2">
                      {doneTasks.map((t) => (
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
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
