/**
 * Phase 11-D 緊急対応：本番 role_permissions seed 投入スクリプト
 *
 * 隊長明示承認下（2026-05-05 02:13、トランザムモード）の本番 DB 初期投入。
 * test-rbac.ts で role_permissions 0 行と判明 → hq_member/member 全 Action 不可状態 → 即対応。
 *
 * src/lib/actions/role-permissions.ts の seedDefaultRolePermissions ロジックを
 * CLI で直接実行可能な形に移植（Server Action は auth 必要なので CLI 不可）。
 *
 * 13社展開時のテンプレ必須項目：本スクリプトを各社初期化時に走らせる。
 *
 * 実行: set -a && source .env.local && set +a && npx tsx scripts/seed-rbac.ts
 */

import { eq, sql } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { role_permissions, companies } from '../src/db/schema';
import { ACTIONS_BY_RESOURCE, ROLES, type Role } from '../src/lib/role-permissions-meta';

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

// 注: hq_member は member.deactivate を含まないので、ADR-0012 整合のため明示追加
DEFAULT_MATRIX.hq_member.member = [
  ...(DEFAULT_MATRIX.hq_member.member ?? []),
  'deactivate',
];

async function main() {
  const allCompanies = await db.select({ id: companies.id, name: companies.name }).from(companies);
  console.log(`[seed-rbac] target companies: ${allCompanies.length}`);

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const c of allCompanies) {
    const [existing] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(role_permissions)
      .where(eq(role_permissions.company_id, c.id));

    if ((existing?.n ?? 0) > 0) {
      console.log(`  [skip] ${c.name} (${c.id}): 既に ${existing!.n} 行あり`);
      totalSkipped += existing!.n;
      continue;
    }

    const values: Array<{
      company_id: string;
      role: Role;
      resource: string;
      action: string;
      allowed: number;
    }> = [];

    for (const role of ROLES) {
      for (const [resource, actions] of Object.entries(ACTIONS_BY_RESOURCE)) {
        const allowed = DEFAULT_MATRIX[role][resource] ?? [];
        for (const action of actions) {
          values.push({
            company_id: c.id,
            role,
            resource,
            action,
            allowed: allowed.includes(action) ? 1 : 0,
          });
        }
      }
    }

    await db.insert(role_permissions).values(values);
    console.log(`  [insert] ${c.name} (${c.id}): ${values.length} 行`);
    totalInserted += values.length;
  }

  console.log(`\n[seed-rbac] 合計 inserted=${totalInserted}, skipped=${totalSkipped}`);
  console.log('[seed-rbac] 完了。次は test-rbac.ts で再検証推奨。');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed-rbac] 致命的エラー:', err);
  process.exit(1);
});
