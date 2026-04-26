import { listEstimatesForDeal } from '@/lib/actions/estimates';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  sent: '送付済',
  accepted: '受諾',
  declined: '辞退',
};

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'up' | 'down' | 'default'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'up',
  declined: 'down',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export async function EstimatesTab({ dealId }: { dealId: string }) {
  const items = await listEstimatesForDeal(dealId);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="📋"
        title="まだ見積がありません"
        description="提案書のあとに見積を作成します（実装予定：Phase B 後段でCRUD対応）"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li key={e.id} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <p className="text-sm text-ink font-medium">{e.title}</p>
              <p className="text-xs font-mono text-subtle mt-0.5">
                v{e.version} · {new Date(e.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <Badge tone={STATUS_TONE[e.status] ?? 'default'}>
              {STATUS_LABEL[e.status] ?? e.status}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-subtle">小計</p>
              <p className="font-mono tabular-nums text-ink">{formatYen(e.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">税</p>
              <p className="font-mono tabular-nums text-ink">{formatYen(e.tax)}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">合計</p>
              <p className="font-mono tabular-nums text-ink font-medium">
                {formatYen(e.total)}
              </p>
            </div>
          </div>
          {e.valid_until && (
            <p className="text-xs text-subtle mt-3">有効期限 · {e.valid_until}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
