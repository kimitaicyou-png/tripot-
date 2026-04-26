import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listAuditLogs, listAuditableMembers, type AuditFilter } from '@/lib/actions/audit-logs';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

const ACTION_TONE: Record<string, 'down' | 'accent' | 'up' | 'info' | 'neutral'> = {
  delete: 'down',
  voided: 'down',
  rejected: 'down',
  paid: 'up',
  approved: 'up',
  accepted: 'up',
  create: 'info',
  update: 'neutral',
  sign_in: 'accent',
};

function actionTone(action: string): 'down' | 'accent' | 'up' | 'info' | 'neutral' | 'default' {
  for (const [keyword, tone] of Object.entries(ACTION_TONE)) {
    if (action.includes(keyword)) return tone;
  }
  return 'default';
}

export default async function SettingsAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const filter: AuditFilter = {
    member_id: sp.member_id,
    action_prefix: sp.action_prefix,
    resource_type: sp.resource_type,
    from: sp.from,
    to: sp.to,
    limit: sp.limit ? Number(sp.limit) : undefined,
  };

  const [{ rows, total }, memberOptions] = await Promise.all([
    listAuditLogs(filter),
    listAuditableMembers(),
  ]);

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-ink text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-ink">監査ログ</h1>
      </header>

      <div className="px-6 py-8 max-w-5xl mx-auto space-y-6">
        <p className="text-sm text-muted">
          全 Server Action / sign_in / sign_out / 設定変更の履歴。
          会社単位で記録、改ざん不可（INSERT only）。
        </p>

        <form
          action="/settings/audit"
          className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 text-sm"
        >
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">担当</span>
            <select
              name="member_id"
              defaultValue={sp.member_id ?? ''}
              className="px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg"
            >
              <option value="">すべて</option>
              {memberOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">アクション接頭辞</span>
            <input
              name="action_prefix"
              defaultValue={sp.action_prefix ?? ''}
              placeholder="例: deal.create / approval"
              className="px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">リソース種別</span>
            <input
              name="resource_type"
              defaultValue={sp.resource_type ?? ''}
              placeholder="deal / customer / etc"
              className="px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg font-mono"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">From</span>
            <input
              type="date"
              name="from"
              defaultValue={sp.from ?? ''}
              className="px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">To</span>
            <input
              type="date"
              name="to"
              defaultValue={sp.to ?? ''}
              className="px-3 py-2 text-sm text-ink bg-card border border-border rounded-lg"
            />
          </label>
          <div className="md:col-span-5 flex justify-end gap-2">
            <Link
              href="/settings/audit"
              className="px-3 py-1.5 text-xs text-muted hover:text-ink"
            >
              リセット
            </Link>
            <button
              type="submit"
              className="px-4 py-2 text-sm bg-ink text-card font-medium rounded-lg hover:bg-ink-mid"
            >
              絞り込む
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            該当 <span className="font-mono text-ink">{total.toLocaleString('ja-JP')}</span> 件 / 表示 <span className="font-mono text-ink">{rows.length}</span> 件
          </span>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon="🪵"
            title="該当する監査ログがありません"
            description="絞り込み条件を変えるか、リセットしてください"
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="bg-card border border-border rounded-lg px-4 py-3 grid grid-cols-12 gap-3 items-center text-sm"
              >
                <span className="col-span-3 font-mono text-xs text-subtle">
                  {new Date(r.occurred_at).toLocaleString('ja-JP')}
                </span>
                <span className="col-span-2 text-ink truncate">{r.member_name ?? '—'}</span>
                <span className="col-span-3">
                  <Badge tone={actionTone(r.action)}>{r.action}</Badge>
                </span>
                <span className="col-span-2 font-mono text-xs text-muted truncate">
                  {r.resource_type ?? '—'}
                </span>
                <span className="col-span-2 font-mono text-xs text-subtle truncate">
                  {r.resource_id ? r.resource_id.slice(0, 8) : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
