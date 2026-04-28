import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { tasks, deals, members } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { deleteTask } from '@/lib/actions/tasks';
import { TaskCheckbox } from '../task-checkbox';
import { TaskEditForm } from './edit-form';

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { taskId } = await params;

  const task = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      due_date: tasks.due_date,
      estimated_cost: tasks.estimated_cost,
      created_at: tasks.created_at,
      deal_id: tasks.deal_id,
      deal_title: deals.title,
      assignee_id: tasks.assignee_id,
      assignee_name: members.name,
    })
    .from(tasks)
    .leftJoin(deals, eq(tasks.deal_id, deals.id))
    .leftJoin(members, eq(tasks.assignee_id, members.id))
    .where(
      and(
        eq(tasks.id, taskId),
        eq(tasks.company_id, session.user.company_id),
        isNull(tasks.deleted_at),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!task) notFound();

  const handleDelete = deleteTask.bind(null, taskId);

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/tasks" className="text-gray-700 hover:text-gray-900 text-sm">
          ← マイタスク
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 truncate">{task.title}</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">
        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TaskCheckbox taskId={taskId} done={task.status === 'done'} />
            <p
              className={`text-base text-gray-900 font-medium ${
                task.status === 'done' ? 'line-through opacity-60' : ''
              }`}
            >
              {task.title}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500 mb-1">担当</p>
              <p className="text-gray-900 font-medium">{task.assignee_name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">期限</p>
              <p className="text-gray-900 font-medium font-mono">{task.due_date ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">紐付き案件</p>
              <p className="text-gray-900 font-medium">
                {task.deal_id && task.deal_title ? (
                  <Link href={`/deals/${task.deal_id}`} className="hover:underline">
                    {task.deal_title}
                  </Link>
                ) : (
                  '—'
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">予定コスト</p>
              <p className="text-gray-900 font-medium font-mono tabular-nums">
                ¥{(task.estimated_cost ?? 0).toLocaleString('ja-JP')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">作成日</p>
              <p className="text-gray-900 font-medium font-mono">
                {new Date(task.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">状態</p>
              <p className="text-gray-900 font-medium">{task.status === 'done' ? '完了' : 'やる'}</p>
            </div>
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-sm font-medium text-gray-900 mb-4">編集</h3>
          <TaskEditForm
            taskId={taskId}
            initial={{
              title: task.title,
              due_date: task.due_date,
              estimated_cost: task.estimated_cost ?? 0,
            }}
          />
        </section>

        <section className="flex items-center justify-end">
          <form action={handleDelete}>
            <button
              type="submit"
              className="px-4 py-2 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100"
            >
              削除
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
