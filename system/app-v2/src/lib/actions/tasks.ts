/**
 * タスク (task) Server Actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { tasks } from '@/db/schema';

const taskSchema = z.object({
  title: z.string().min(1, 'タスク名は必須です').max(200),
  deal_id: z.string().uuid().optional().nullable(),
  assignee_id: z.string().uuid().optional().nullable(),
  estimated_cost: z.coerce.number().int().nonnegative().default(0),
  due_date: z.string().optional().nullable(),
});

export type TaskFormState = {
  errors?: { title?: string[]; _form?: string[] };
  success?: boolean;
};

export async function createTask(_prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = taskSchema.safeParse({
    title: formData.get('title'),
    deal_id: formData.get('deal_id') || null,
    assignee_id: formData.get('assignee_id') || session.user.member_id,
    estimated_cost: formData.get('estimated_cost') ?? 0,
    due_date: formData.get('due_date') || null,
  });

  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors };

  const [created] = await db
    .insert(tasks)
    .values({
      company_id: session.user.company_id,
      ...parsed.data,
      assignee_id: parsed.data.assignee_id ?? session.user.member_id,
    })
    .returning({ id: tasks.id });

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'task.create',
    resource_type: 'task',
    resource_id: created!.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/tasks');
  if (parsed.data.deal_id) revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true };
}

export async function toggleTaskStatus(taskId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const task = await db
    .select({ status: tasks.status, deal_id: tasks.deal_id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!task) throw new Error('タスクが見つかりません');

  const newStatus = task.status === 'done' ? 'todo' : 'done';

  await db
    .update(tasks)
    .set({ status: newStatus, updated_at: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: `task.${newStatus === 'done' ? 'complete' : 'reopen'}`,
    resource_type: 'task',
    resource_id: taskId,
  });

  revalidatePath('/tasks');
  revalidatePath(`/home/${session.user.member_id}`);
  if (task.deal_id) revalidatePath(`/deals/${task.deal_id}`);
}

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  due_date: z.string().optional().nullable(),
  estimated_cost: z.coerce.number().int().nonnegative().optional(),
});

export async function updateTask(
  taskId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const session = await auth();
  if (!session?.user?.member_id) return { errors: { _form: ['認証が必要です'] } };
  await setTenantContext(session.user.company_id);

  const parsed = taskUpdateSchema.safeParse({
    title: formData.get('title') ?? undefined,
    due_date: formData.get('due_date') || null,
    estimated_cost: formData.get('estimated_cost') ?? undefined,
  });

  if (!parsed.success) return { errors: { _form: ['入力値が不正です'] } };

  const task = await db
    .select({ deal_id: tasks.deal_id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.company_id, session.user.company_id)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!task) return { errors: { _form: ['タスクが見つかりません'] } };

  await db
    .update(tasks)
    .set({ ...parsed.data, updated_at: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'task.update',
    resource_type: 'task',
    resource_id: taskId,
    metadata: parsed.data as Record<string, unknown>,
  });

  revalidatePath('/tasks');
  revalidatePath(`/tasks/${taskId}`);
  if (task.deal_id) revalidatePath(`/deals/${task.deal_id}`);
  return { success: true };
}

export async function deleteTask(taskId: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  await db
    .update(tasks)
    .set({ deleted_at: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.company_id, session.user.company_id)));

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'task.delete',
    resource_type: 'task',
    resource_id: taskId,
  });

  revalidatePath('/tasks');
}
