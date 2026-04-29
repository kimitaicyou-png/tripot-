import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, BellOff, Building2 } from 'lucide-react';
import { auth } from '@/auth';
import { listNotificationsForMember } from '@/lib/actions/notifications';
import { listBridgeNotices } from '@/lib/actions/bridge-notices';
import { EmptyState } from '@/components/ui/empty-state';
import { SectionHeading } from '@/components/ui/section-heading';
import { MarkAllReadButton } from './_components/mark-all-read-button';
import { NotificationItem } from './_components/notification-item';
import { BridgeNoticeItem } from './_components/bridge-notice-item';

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

  const [items, bridgeNotices] = await Promise.all([
    listNotificationsForMember(session.user.member_id, 100),
    listBridgeNotices(),
  ]);
  const unreadCount = items.filter((n) => !n.read_at).length;
  const unackBridgeCount = bridgeNotices.filter((n) => !n.acknowledged_at).length;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"><ArrowLeft className="w-3.5 h-3.5" />ホーム</Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">
          通知
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal font-mono text-red-700 tabular-nums">
              未読 {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && <MarkAllReadButton />}
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">
        {bridgeNotices.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionHeading
                eyebrow="HQ NOTICES"
                title="本部からのお知らせ"
                count={bridgeNotices.length}
              />
              {unackBridgeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Building2 className="w-3 h-3" />
                  未確認 {unackBridgeCount}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {bridgeNotices.map((n) => (
                <BridgeNoticeItem
                  key={n.id}
                  id={n.id}
                  title={n.title}
                  body={n.body}
                  severity={n.severity}
                  sentAt={new Date(n.sent_at).toLocaleString('ja-JP')}
                  acknowledged={Boolean(n.acknowledged_at)}
                  acknowledgedByName={n.acknowledged_by_name}
                />
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <SectionHeading
            eyebrow="PERSONAL NOTIFICATIONS"
            title="個人通知"
            count={items.length}
          />
          {items.length === 0 ? (
            <EmptyState
              icon={BellOff}
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
        </section>
      </div>
    </main>
  );
}
