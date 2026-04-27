'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, logAudit, setTenantContext } from '@/lib/db';
import { role_permissions } from '@/db/schema';
import {
  ACTIONS_BY_RESOURCE,
  ROLES,
  type Role,
} from '@/lib/role-permissions-meta';

const DEFAULT_MATRIX: Record<Role, Record<string, string[]>> = {
  president: Object.fromEntries(
    Object.entries(ACTIONS_BY_RESOURCE).map(([res, acts]) => [res, [...acts]])
  ),
  hq_member: Object.fromEntries(
    Object.entries(ACTIONS_BY_RESOURCE).map(([res, acts]) => [
      res,
      acts.filter((a) => a !== 'delete' && a !== 'deactivate'),
    ])
  ),
  member: Object.fromEntries(
    Object.entries(ACTIONS_BY_RESOURCE).map(([res, acts]) => {
      if (res === 'budget' || res === 'monthly_report' || res === 'audit_log') return [res, []];
      if (res === 'company_settings' || res === 'integration' || res === 'member') return [res, ['read']];
      if (res === 'approval') return [res, ['request']];
      const filtered = acts.filter((a) => {
        if (a === 'read_all') return false;
        if (a === 'delete') return false;
        if (a === 'deactivate') return false;
        return true;
      });
      return [res, filtered];
    })
  ),
};

export type PermissionFormState = {
  errors?: { _form?: string[] };
  success?: boolean;
  inserted?: number;
};

export async function listRolePermissions() {
  const session = await auth();
  if (!session?.user?.member_id) return [];
  await setTenantContext(session.user.company_id);
  return db
    .select()
    .from(role_permissions)
    .where(eq(role_permissions.company_id, session.user.company_id));
}

export async function seedDefaultRolePermissions(): Promise<{
  inserted: number;
  skipped: number;
}> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const [existingRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(role_permissions)
    .where(eq(role_permissions.company_id, session.user.company_id));

  if ((existingRow?.n ?? 0) > 0) {
    return { inserted: 0, skipped: existingRow!.n };
  }

  const values: {
    company_id: string;
    role: Role;
    resource: string;
    action: string;
    allowed: number;
  }[] = [];

  for (const role of ROLES) {
    for (const [resource, actions] of Object.entries(ACTIONS_BY_RESOURCE)) {
      const allowed = DEFAULT_MATRIX[role][resource] ?? [];
      for (const action of actions) {
        values.push({
          company_id: session.user.company_id,
          role,
          resource,
          action,
          allowed: allowed.includes(action) ? 1 : 0,
        });
      }
    }
  }

  await db.insert(role_permissions).values(values);

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'role_permission.seed',
    resource_type: 'company',
    resource_id: session.user.company_id,
    metadata: { count: values.length, source: 'default_matrix' },
  });

  revalidatePath('/settings/roles');
  return { inserted: values.length, skipped: 0 };
}

const updateSchema = z.object({
  role: z.enum(['president', 'hq_member', 'member']),
  resource: z.string().min(1),
  action: z.string().min(1),
  allowed: z.coerce.number().int().min(0).max(1),
});

export async function updateRolePermission(
  role: Role,
  resource: string,
  action: string,
  allowed: 0 | 1
): Promise<void> {
  const session = await auth();
  if (!session?.user?.member_id) throw new Error('認証が必要です');
  await setTenantContext(session.user.company_id);

  const parsed = updateSchema.safeParse({ role, resource, action, allowed });
  if (!parsed.success) throw new Error('入力エラー');

  const existing = await db
    .select({ id: role_permissions.id })
    .from(role_permissions)
    .where(
      and(
        eq(role_permissions.company_id, session.user.company_id),
        eq(role_permissions.role, parsed.data.role),
        eq(role_permissions.resource, parsed.data.resource),
        eq(role_permissions.action, parsed.data.action)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (existing) {
    await db
      .update(role_permissions)
      .set({ allowed: parsed.data.allowed })
      .where(eq(role_permissions.id, existing.id));
  } else {
    await db.insert(role_permissions).values({
      company_id: session.user.company_id,
      role: parsed.data.role,
      resource: parsed.data.resource,
      action: parsed.data.action,
      allowed: parsed.data.allowed,
    });
  }

  await logAudit({
    member_id: session.user.member_id,
    company_id: session.user.company_id,
    action: 'role_permission.update',
    resource_type: 'role_permission',
    metadata: { role, resource, action, allowed },
  });

  revalidatePath('/settings/roles');
}
