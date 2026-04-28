import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { listMyPreferences } from '@/lib/actions/notification-prefs';
import {
  RULE_KEYS,
  RULE_LABELS,
  RULE_DESCRIPTIONS,
} from '@/lib/notification-prefs-meta';
import { PrefRow } from './_components/pref-row';

export default async function SettingsNotificationsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const memberId = session.user.member_id;
  const prefs = await listMyPreferences(memberId);
  const prefMap = new Map(prefs.map((p) => [p.rule_key, p]));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"><ArrowLeft className="w-3.5 h-3.5" />設定</Link>
        <h1 className="text-lg font-semibold text-gray-900">通知設定</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          {session.user.name ?? '自分'} の通知ルール。各ルールごとに配信チャネル（アプリ / Slack / LINE / メール）と
          ミュート設定を選べます。
        </p>

        <ul className="space-y-3">
          {RULE_KEYS.map((rk) => {
            const pref = prefMap.get(rk);
            const channels = Array.isArray(pref?.channels) ? (pref!.channels as string[]) : ['app'];
            const isMuted = pref?.is_muted === 1;
            return (
              <PrefRow
                key={rk}
                memberId={memberId}
                ruleKey={rk}
                ruleLabel={RULE_LABELS[rk] ?? rk}
                ruleDescription={RULE_DESCRIPTIONS[rk] ?? ''}
                initialChannels={channels}
                initialMuted={isMuted}
              />
            );
          })}
        </ul>
      </div>
    </main>
  );
}
