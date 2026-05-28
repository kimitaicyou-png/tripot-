import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import {
  ArrowLeft,
  Banknote,
  Globe,
  MessageCircle,
  MessageSquare,
  NotebookText,
  Mail,
  Video,
  Users,
  PenTool,
  CreditCard,
  Wallet,
  Plug,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const PROVIDER_ICON: Record<string, LucideIcon> = {
  mf: Banknote,
  freee: Banknote,
  google: Globe,
  slack: MessageSquare,
  line: MessageCircle,
  notion: NotebookText,
  gmail: Mail,
  zoom: Video,
  teams: Users,
  cloudsign: PenTool,
  stripe: CreditCard,
  paypay: Wallet,
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

const AVAILABLE_PROVIDERS = ['mf'] as const;

const COMING_SOON_PROVIDERS = [
  'freee',
  'google',
  'slack',
  'line',
  'notion',
  'gmail',
  'zoom',
  'teams',
  'cloudsign',
  'stripe',
  'paypay',
] as const;

function ProviderCard({
  provider,
  connection,
  comingSoon,
}: {
  provider: string;
  connection: { status: string | null; last_synced_at: Date | string | null } | undefined;
  comingSoon?: boolean;
}) {
  const Icon = PROVIDER_ICON[provider] ?? Plug;
  const status = connection?.status ?? null;

  return (
    <li
      className={`bg-white border border-gray-200 rounded-xl p-5 flex items-start justify-between gap-3 ${comingSoon ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <Icon className="w-6 h-6 text-gray-700 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium">{PROVIDER_LABEL[provider]}</p>
          {connection && !comingSoon ? (
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              最終同期{' '}
              {connection.last_synced_at
                ? new Date(connection.last_synced_at).toLocaleString('ja-JP')
                : '—'}
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              {comingSoon ? '接続フロー準備中' : '未接続'}
            </p>
          )}
        </div>
      </div>
      {comingSoon ? (
        <Badge tone="neutral">準備中</Badge>
      ) : status ? (
        <Badge tone={STATUS_TONE[status] ?? 'neutral'}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      ) : (
        <Badge tone="neutral">未接続</Badge>
      )}
    </li>
  );
}

export default async function SettingsIntegrationsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await db
    .select()
    .from(integrations)
    .where(eq(integrations.company_id, session.user.company_id));

  const connectedMap = new Map(items.map((i) => [i.provider as string, i]));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />ホーム
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">連携設定</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
        <p className="text-sm text-gray-700">
          外部サービスと連携すると、入力・集計・通知が自動化されます。
          接続すると行動ログ・売上データを自動で取り込みます。
        </p>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">利用可能</h2>
            <p className="text-xs text-gray-500 mt-0.5">接続・設定できるサービスです。</p>
          </div>
          <ul className="space-y-3">
            {AVAILABLE_PROVIDERS.map((p) => (
              <ProviderCard
                key={p}
                provider={p}
                connection={connectedMap.get(p)}
              />
            ))}
          </ul>
          <p className="text-xs text-gray-500">
            マネーフォワード クラウドは{' '}
            <Link href="/settings/mf" className="underline text-gray-700 hover:text-gray-900">
              専用設定画面
            </Link>{' '}
            から接続できます。
          </p>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">準備中</h2>
            <p className="text-xs text-gray-500 mt-0.5">順次 OAuth 接続フローを実装予定です。</p>
          </div>
          <ul className="space-y-3">
            {COMING_SOON_PROVIDERS.map((p) => (
              <ProviderCard
                key={p}
                provider={p}
                connection={connectedMap.get(p)}
                comingSoon
              />
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
