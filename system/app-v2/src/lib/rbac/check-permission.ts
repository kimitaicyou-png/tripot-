import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db';
import { role_permissions } from '@/db/schema';
import type { Role } from '@/lib/role-permissions-meta';

/**
 * ロール×リソース×アクションで権限照合する低レベル API。
 * president は無条件で true（基盤設計、role_permissions テーブルに依存しない）。
 *
 * 使用例:
 *   const allowed = await checkPermission(companyId, role, 'deal', 'delete');
 *
 * 高レベルラッパは requirePermission を使う（auth + tenant + 権限を一括）。
 */
export async function checkPermission(
  companyId: string,
  role: Role,
  resource: string,
  action: string
): Promise<boolean> {
  if (role === 'president') return true;

  const row = await db
    .select({ allowed: role_permissions.allowed })
    .from(role_permissions)
    .where(
      and(
        eq(role_permissions.company_id, companyId),
        eq(role_permissions.role, role),
        eq(role_permissions.resource, resource),
        eq(role_permissions.action, action)
      )
    )
    .limit(1)
    .then((rows) => rows[0]);

  return (row?.allowed ?? 0) === 1;
}
