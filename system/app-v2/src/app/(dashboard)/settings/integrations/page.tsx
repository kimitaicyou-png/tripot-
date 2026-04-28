import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { integrations } from '@/db/schema';
import { Badge } from '@/components/ui/badge';

const PROVIDER_LABEL: Record<string, string> = {
  mf: 'マネーフォワード クラウド',
  freee: 'freee',
  google: 'Google Workspace',
  slack: 'Slack',
  line: 'LINE Messaging',
  notion: 'Notion',
  gmail: 'Gmail',
  zoom: 'Zoom',
  teams: 'Microsoft Teams',
  cloudsign: 'クラウドサイン',
  stripe: 'Stripe',
  paypay: 'PayPay',
};

const PROVIDER_ICON: Record<string, string> = {
  mf: '💴',
  freee: '🔵',
  google: '🌐',
  slack: '💬',
  line: '💚',
  notion: '📓',
  gmail: '✉️',
  zoom: '🎥',
  teams: '👥',
  cloudsign: '📝',
  stripe: '💳',
  paypay: '🟥',
};

const STATUS_TONE: Record<string, 'up' | 'down' | 'neutral' | 'accent'> = {
  active: 'up',
  expired: 'accent',
  revoked: 'neutral',
  error: 'down',
};

const STATUS_LABEL: Record<string, string> = {
  active: '接続中',
  expired: '期限切れ',
  revoked: '切断済',
  error: 'エラー',
};

export default async function SettingsIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await db
    .select()
    .from(integrations)
    .where(eq(integrations.company_id, session.user.company_id));

  const allProviders = Object.keys(PROVIDER_LABEL);
  const connectedMap = new Map(items.map((i) => [i.provider as string, i]));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-gray-900">連携設定</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          外部サービスとの OAuth 連携状態を一覧表示。
          MF クラウドは <Link href="/settings/mf" className="underline text-gray-900">専用画面</Link> で設定可、
          その他は Phase 後段で OAuth 接続フロー実装予定。
        </p>

        <ul className="space-y-3">
          {allProviders.map((p) => {
            const connection = connectedMap.get(p);
            const status = connection?.status ?? null;
            return (
              <li
                key={p}
                className="bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{PROVIDER_ICON[p] ?? '🔌'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 font-medium">{PROVIDER_LABEL[p]}</p>
                    {connection ? (
                      <p className="text-xs font-mono text-gray-500 mt-0.5">
                        最終同期 {connection.last_synced_at
                          ? new Date(connection.last_synced_at).toLocaleString('ja-JP')
                          : '—'}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">未接続</p>
                    )}
                  </div>
                </div>
                {status ? (
                  <Badge tone={STATUS_TONE[status] ?? 'neutral'}>
                    {STATUS_LABEL[status] ?? status}
                  </Badge>
                ) : (
                  <Badge tone="neutral">未接続</Badge>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
