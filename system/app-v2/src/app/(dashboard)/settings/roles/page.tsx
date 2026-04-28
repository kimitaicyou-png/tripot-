import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { listRolePermissions } from '@/lib/actions/role-permissions';
import {
  getResourceList,
  getActionsForResource,
  RESOURCE_LABELS,
  ACTION_LABELS,
  ROLES,
  type Role,
} from '@/lib/role-permissions-meta';
import { EmptyState } from '@/components/ui/empty-state';
import { RolesAdminControls } from './_components/roles-admin-controls';
import { PermissionToggle } from './_components/permission-toggle';

const ROLE_LABELS: Record<Role, string> = {
  president: '代表',
  hq_member: '本部',
  member: 'メンバー',
};

export default async function SettingsRolesPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const rows = await listRolePermissions();
  const resources = getResourceList();

  const matrix = new Map<string, boolean>();
  for (const r of rows) {
    matrix.set(`${r.role}:${r.resource}:${r.action}`, r.allowed === 1);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"><ArrowLeft className="w-3.5 h-3.5" />設定</Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">役職権限マトリクス</h1>
        <RolesAdminControls existingCount={rows.length} />
      </header>

      <div className="px-6 py-8 max-w-6xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          ロール × リソース × アクション の権限マトリクス。
          初回は「初期マトリクス投入」でデフォルト設定を入れてから、必要に応じて個別に切替。
        </p>

        {rows.length === 0 ? (
          <EmptyState
            icon="🛡️"
            title="まだ権限が設定されていません"
            description="右上の「初期マトリクス投入」を押すと、デフォルト設定が一括登録されます"
          />
        ) : (
          <div className="space-y-6">
            {resources.map((resource) => {
              const actions = getActionsForResource(resource);
              return (
                <section
                  key={resource}
                  className="bg-white border border-gray-200 rounded-xl p-5 space-y-3"
                >
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500">
                      {resource}
                    </p>
                    <h3 className="text-base font-medium text-gray-900 mt-0.5">
                      {RESOURCE_LABELS[resource] ?? resource}
                    </h3>
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-sm min-w-[560px]">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-2 py-2 text-left text-xs uppercase tracking-wider text-gray-500 font-medium">
                            アクション
                          </th>
                          {ROLES.map((role) => (
                            <th
                              key={role}
                              className="px-2 py-2 text-center text-xs uppercase tracking-wider text-gray-500 font-medium"
                            >
                              {ROLE_LABELS[role]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {actions.map((action) => (
                          <tr key={action} className="border-b border-gray-200 last:border-0">
                            <td className="px-2 py-2 text-gray-900">
                              <span className="font-mono text-xs text-gray-700 mr-2">{action}</span>
                              <span>{ACTION_LABELS[action] ?? action}</span>
                            </td>
                            {ROLES.map((role) => {
                              const allowed = matrix.get(`${role}:${resource}:${action}`) ?? false;
                              return (
                                <td key={role} className="px-2 py-2 text-center">
                                  <PermissionToggle
                                    role={role}
                                    resource={resource}
                                    action={action}
                                    initialAllowed={allowed}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
