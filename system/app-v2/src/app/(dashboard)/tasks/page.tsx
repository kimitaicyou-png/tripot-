import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, deals, members } from '@/db/schema';
import { eq, and, isNull, desc, ne } from 'drizzle-orm';
import { TaskCheckbox } from './task-checkbox';

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
      )
    )
    .orderBy(desc(tasks.updated_at))
    .limit(100);

  const todoCount = myTasks.filter((t) => t.status !== 'done').length;
  const doneCount = myTasks.filter((t) => t.status === 'done').length;

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">マイタスク</h1>
          <p className="text-xs text-subtle mt-1">
            残 <span className="font-mono tabular-nums text-ink">{todoCount}</span> ／ 完了 <span className="font-mono tabular-nums text-ink">{doneCount}</span>
          </p>
        </div>
        <Link
          href="/tasks/new"
          className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-lg hover:bg-ink-mid transition-colors active:scale-[0.98]"
        >
          新規登録
        </Link>
      </header>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        {myTasks.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted">タスクはまだありません</p>
            <p className="text-xs text-subtle mt-2">案件詳細からタスクを追加できます</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {myTasks.map((t) => (
              <li
                key={t.id}
                className={`bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3 ${
                  t.status === 'done' ? 'opacity-60' : ''
                }`}
              >
                <TaskCheckbox taskId={t.id} done={t.status === 'done'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-ink ${t.status === 'done' ? 'line-through' : ''}`}>
                    {t.title}
                  </p>
                  {t.deal_title && (
                    <p className="text-xs text-subtle mt-0.5 truncate">
                      📋 {t.deal_title}
                    </p>
                  )}
                </div>
                {t.due_date && (
                  <p className="text-xs font-mono text-muted shrink-0">{t.due_date}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
