'use client';

import { useState, useTransition } from 'react';
import { Bell, BellOff, MessageSquare, MessageCircle, Mail } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { upsertPreference } from '@/lib/actions/notification-prefs';
import { CHANNELS } from '@/lib/notification-prefs-meta';
import { toast } from '@/components/ui/toaster';

const CHANNEL_LABELS: Record<string, string> = {
  app: 'アプリ',
  slack: 'Slack',
  line: 'LINE',
  email: 'メール',
};

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  app: Bell,
  slack: MessageSquare,
  line: MessageCircle,
  email: Mail,
};

export function PrefRow({
  memberId,
  ruleKey,
  ruleLabel,
  ruleDescription,
  initialChannels,
  initialMuted,
}: {
  memberId: string;
  ruleKey: string;
  ruleLabel: string;
  ruleDescription: string;
  initialChannels: string[];
  initialMuted: boolean;
}) {
  const [channels, setChannels] = useState<string[]>(initialChannels);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [pending, startTransition] = useTransition();

  function persist(nextChannels: string[], nextMuted: boolean) {
    startTransition(async () => {
      try {
        await upsertPreference(memberId, ruleKey, nextChannels, nextMuted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
      }
    });
  }

  function toggleChannel(c: string) {
    const next = channels.includes(c) ? channels.filter((x) => x !== c) : [...channels, c];
    setChannels(next);
    persist(next, isMuted);
  }

  function toggleMute() {
    const next = !isMuted;
    setIsMuted(next);
    persist(channels, next);
  }

  return (
    <li
      className={`bg-white border border-gray-200 rounded-xl p-5 transition-opacity ${
        isMuted ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 font-medium">{ruleLabel}</p>
          <p className="text-xs text-gray-700 mt-0.5">{ruleDescription}</p>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          disabled={pending}
          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-medium ${
            isMuted
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <BellOff className="w-3 h-3" />
          {isMuted ? 'ミュート中' : 'ミュート'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c) => {
          const enabled = channels.includes(c);
          const Icon = CHANNEL_ICONS[c] ?? Bell;
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleChannel(c)}
              disabled={pending || isMuted}
              className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${
                enabled
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {CHANNEL_LABELS[c] ?? c}
            </button>
          );
        })}
      </div>
    </li>
  );
}
