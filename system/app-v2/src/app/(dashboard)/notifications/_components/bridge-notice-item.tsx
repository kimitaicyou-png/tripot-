'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { acknowledgeBridgeNotice } from '@/lib/actions/bridge-notices';
import { toast } from '@/components/ui/toaster';

const SEVERITY_ICON: Record<string, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  critical: AlertOctagon,
};

const SEVERITY_TONE: Record<string, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-200 bg-red-50 text-red-900',
};

const SEVERITY_ICON_COLOR: Record<string, string> = {
  info: 'text-blue-600',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

type Props = {
  id: string;
  title: string;
  body: string;
  severity: string;
  sentAt: string;
  acknowledged: boolean;
  acknowledgedByName?: string | null;
};

export function BridgeNoticeItem(props: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const Icon = SEVERITY_ICON[props.severity] ?? Info;
  const toneClass = SEVERITY_TONE[props.severity] ?? SEVERITY_TONE.info;
  const iconColorClass = SEVERITY_ICON_COLOR[props.severity] ?? SEVERITY_ICON_COLOR.info;

  function handleAcknowledge() {
    startTransition(async () => {
      const result = await acknowledgeBridgeNotice(props.id);
      if (!result.success) {
        toast.error('確認に失敗', { description: result.error });
        return;
      }
      toast.success('確認済にしました');
      router.refresh();
    });
  }

  return (
    <div className={`border rounded-lg p-4 ${toneClass} ${props.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColorClass}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{props.title}</p>
            <p className="text-xs font-mono tabular-nums mt-0.5 opacity-70">{props.sentAt}</p>
          </div>
        </div>
        {!props.acknowledged && (
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={pending}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white border border-gray-200 text-gray-900 rounded hover:border-gray-900 transition-colors disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" />
            {pending ? '...' : '確認'}
          </button>
        )}
      </div>
      <p className="text-sm whitespace-pre-wrap">{props.body}</p>
      {props.acknowledged && props.acknowledgedByName && (
        <p className="text-xs mt-2 opacity-70 inline-flex items-center gap-1">
          <Check className="w-3 h-3" />
          {props.acknowledgedByName} 確認済
        </p>
      )}
    </div>
  );
}
