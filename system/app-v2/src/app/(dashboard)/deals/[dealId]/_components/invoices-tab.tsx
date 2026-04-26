import { listInvoicesForDeal } from '@/lib/actions/invoices';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  issued: '発行済',
  sent: '送付済',
  paid: '入金済',
  overdue: '期限超過',
  voided: '取消',
};

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'up' | 'down' | 'accent' | 'default'> = {
  draft: 'neutral',
  issued: 'info',
  sent: 'info',
  paid: 'up',
  overdue: 'down',
  voided: 'default',
};

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export async function InvoicesTab({ dealId }: { dealId: string }) {
  const items = await listInvoicesForDeal(dealId);

  if (items.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="まだ請求がありません"
        description="受注後、見積から請求書を発行します（実装予定：Phase B 後段でCRUD対応）"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <p className="text-sm text-ink font-medium">
                {i.invoice_number ?? `（番号未付与）`}
              </p>
              <p className="text-xs font-mono text-subtle mt-0.5">
                {new Date(i.created_at).toLocaleString('ja-JP')}
              </p>
            </div>
            <Badge tone={STATUS_TONE[i.status] ?? 'default'}>
              {STATUS_LABEL[i.status] ?? i.status}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-subtle">合計</p>
              <p className="font-mono tabular-nums text-ink font-medium">
                {formatYen(i.total)}
              </p>
            </div>
            <div>
              <p className="text-xs text-subtle">発行日</p>
              <p className="font-mono tabular-nums text-ink">{i.issue_date ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs text-subtle">支払期限</p>
              <p className="font-mono tabular-nums text-ink">{i.due_date ?? '—'}</p>
            </div>
          </div>
          {i.paid_at && (
            <p className="text-xs text-kpi-up mt-3 font-mono">入金確認 · {i.paid_at}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
