import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, deals } from '@/db/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { TaskCheckbox } from './task-checkbox';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const myTasks = await db
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
    .limit(100);

  const todoTasks = myTasks.filter((t) => t.status !== 'done');
  const doneTasks = myTasks.filter((t) => t.status === 'done');
  const todoCount = todoTasks.length;
  const doneCount = doneTasks.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = todoTasks.filter((t) => {
    if (!t.due_date) return false;
    return new Date(`${t.due_date}T00:00:00`).getTime() < today.getTime();
  }).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="MY TASKS"
        title="マイタスク"
        subtitle={
          <>
            残 <span className="font-mono tabular-nums text-gray-900">{todoCount}</span> ／ 完了{' '}
            <span className="font-mono tabular-nums text-gray-900">{doneCount}</span>
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

      <div className="px-6 py-10 max-w-3xl mx-auto space-y-10">
        {myTasks.length === 0 ? (
          <EmptyState
            icon="✓"
            title="タスクはまだありません"
            description="案件詳細からタスクを追加できます。"
            cta={{ href: '/tasks/new', label: 'タスクを登録する' }}
          />
        ) : (
          <>
            <section className="grid grid-cols-3 gap-4">
              <StatCard label="残タスク" value={todoCount} />
              <StatCard
                label="期限切れ"
                value={overdue}
                tone={overdue > 0 ? 'down' : 'default'}
              />
              <StatCard label="完了" value={doneCount} tone="up" />
            </section>

            {todoTasks.length > 0 && (
              <section>
                <SectionHeading eyebrow="TO DO" title="やる" count={todoTasks.length} />
                <ul className="space-y-2">
                  {todoTasks.map((t) => {
                    const isOverdue =
                      t.due_date &&
                      new Date(`${t.due_date}T00:00:00`).getTime() < today.getTime();
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
                          <p className="text-sm text-gray-900">{t.title}</p>
                          {t.deal_title && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              📋 {t.deal_title}
                            </p>
                          )}
                        </Link>
                        {t.due_date && (
                          <p
                            className={`text-xs font-mono shrink-0 ${
                              isOverdue ? 'text-red-700 font-medium' : 'text-gray-700'
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
                <SectionHeading eyebrow="DONE" title="完了" count={doneTasks.length} />
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
                        <p className="text-sm text-gray-900 line-through">{t.title}</p>
                        {t.deal_title && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            📋 {t.deal_title}
                          </p>
                        )}
                      </Link>
                      {t.due_date && (
                        <p className="text-xs font-mono text-gray-700 shrink-0">{t.due_date}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}
