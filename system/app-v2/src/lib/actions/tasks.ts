/**
 * タスク (task) Server Actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, isNull, ne, sql } from 'drizzle-orm';
import { db, logAudit } from '@/lib/db';
import { tasks } from '@/db/schema';
import { requirePermission } from '@/lib/rbac';
import { maybeAdvanceDealStage } from '@/lib/deals/stage-advance';

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
  const guard = await requirePermission({ resource: 'task', action: 'create' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

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

  // 思想実装：タスクが deal 紐づきで作成された瞬間、案件が「受注」段ならば
  // 「制作中」へ自動進行（後退しないルールにより ordered の時のみ進む）
  if (parsed.data.deal_id) {
    await maybeAdvanceDealStage({
      dealId: parsed.data.deal_id,
      companyId: session.user.company_id,
      memberId: session.user.member_id,
      targetStage: 'in_production',
      triggeredBy: 'task.created',
    });
  }

  revalidatePath('/tasks');
  if (parsed.data.deal_id) revalidatePath(`/deals/${parsed.data.deal_id}`);
  return { success: true };
}

export async function toggleTaskStatus(taskId: string): Promise<void> {
  const guard = await requirePermission({ resource: 'task', action: 'update' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;

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

  // 思想実装：タスクを done にした瞬間、案件配下の未完了タスクが 0 件なら
  // 案件ステージを「納品済」へ自動進行（後退しないルールにより in_production からのみ進む）
  if (newStatus === 'done' && task.deal_id) {
    const openTasks = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(tasks)
      .where(
        and(
          eq(tasks.deal_id, task.deal_id),
          eq(tasks.company_id, session.user.company_id),
          ne(tasks.status, 'done'),
          isNull(tasks.deleted_at)
        )
      )
      .then((rows) => rows[0]?.count ?? 0);

    if (openTasks === 0) {
      await maybeAdvanceDealStage({
        dealId: task.deal_id,
        companyId: session.user.company_id,
        memberId: session.user.member_id,
        targetStage: 'delivered',
        triggeredBy: 'tasks.all_completed',
      });
    }
  }

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
  const guard = await requirePermission({ resource: 'task', action: 'update' });
  if (!guard.ok) return { errors: { _form: [guard.error] } };
  const { session } = guard;

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
  const guard = await requirePermission({ resource: 'task', action: 'delete' });
  if (!guard.ok) throw new Error(guard.error);
  const { session } = guard;

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
