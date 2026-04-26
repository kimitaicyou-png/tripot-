import { listInvoicesForDeal } from '@/lib/actions/invoices';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { InvoiceStatusActions } from './invoice-status-actions';

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

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-ink mb-1">請求書</h3>
        <p className="text-xs text-subtle">
          見積タブで「受諾」になった見積から「🧾 請求書を作成」ボタンで自動発行できます（番号自動採番・期限30日後）
        </p>
      </section>

      {items.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="まだ請求書がありません"
          description="見積を受諾済にしてから、見積タブの「請求書を作成」を押してください"
        />
      ) : (
        <ul className="space-y-3">
          {items.map((i) => {
            const status = i.status as 'draft' | 'issued' | 'sent' | 'paid' | 'overdue' | 'voided';
            return (
              <li key={i.id} className="bg-card border border-border rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-ink font-medium">
                      {i.invoice_number ?? '（番号未付与）'}
                    </p>
                    <p className="text-xs font-mono text-subtle mt-0.5">
                      {new Date(i.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[status] ?? 'default'}>
                    {STATUS_LABEL[status] ?? status}
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
                  <p className="text-xs text-kpi-up font-mono">入金確認 · {i.paid_at}</p>
                )}

                <div className="pt-2 border-t border-border">
                  <InvoiceStatusActions
                    invoiceId={i.id}
                    dealId={dealId}
                    currentStatus={status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
