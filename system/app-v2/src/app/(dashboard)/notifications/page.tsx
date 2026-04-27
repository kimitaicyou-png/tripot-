import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listNotificationsForMember } from '@/lib/actions/notifications';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { MarkAllReadButton } from './_components/mark-all-read-button';
import { NotificationItem } from './_components/notification-item';

const RULE_LABELS: Record<string, string> = {
  budget_alert: '予算未達アラート',
  silence_detect: '沈黙顧客検知',
  stuck_deal: '案件詰まり検知',
  overload: '過負荷検知',
  mf_unmatched: 'MF 仕訳 未照合',
  approval_request: '承認申請',
  approval_decision: '承認結果',
  task_due: 'タスク期限',
  morning_brief: '朝ブリーフィング',
};

const CHANNEL_LABELS: Record<string, string> = {
  app: 'アプリ',
  slack: 'Slack',
  line: 'LINE',
  email: 'メール',
};

const CHANNEL_TONE: Record<string, 'info' | 'accent' | 'up' | 'neutral'> = {
  app: 'info',
  slack: 'accent',
  line: 'up',
  email: 'neutral',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await listNotificationsForMember(session.user.member_id, 100);
  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-ink text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-ink flex-1">
          通知
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal font-mono text-kpi-down tabular-nums">
              未読 {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && <MarkAllReadButton />}
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-4">
        {items.length === 0 ? (
          <EmptyState
            icon="🔔"
            title="まだ通知はありません"
            description="予算アラート / 沈黙顧客 / 案件詰まり等の cron 通知がここに集まります"
          />
        ) : (
          <ul className="space-y-2">
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                id={n.id}
                title={n.title}
                body={n.body}
                ruleLabel={RULE_LABELS[n.rule_key] ?? n.rule_key}
                channelLabel={CHANNEL_LABELS[n.channel] ?? n.channel}
                channelTone={CHANNEL_TONE[n.channel] ?? 'neutral'}
                createdAt={new Date(n.created_at).toLocaleString('ja-JP')}
                isRead={Boolean(n.read_at)}
              />
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
