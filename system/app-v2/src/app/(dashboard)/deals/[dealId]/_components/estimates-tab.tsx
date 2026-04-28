import { ClipboardList, ChevronRight, ChevronDown } from 'lucide-react';
import { listEstimatesForDeal } from '@/lib/actions/estimates';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { EstimateEditorButton } from './estimate-editor';
import { EstimateStatusActions } from './estimate-status-actions';
import { InvoiceFromEstimateButton } from './invoice-from-estimate-button';

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

type LineItem = { description: string; quantity: number; unit_price: number; amount: number };

function formatYen(value: number | null): string {
  return `¥${(value ?? 0).toLocaleString('ja-JP')}`;
}

export async function EstimatesTab({ dealId }: { dealId: string }) {
  const items = await listEstimatesForDeal(dealId);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-1">見積を作成</h3>
        <p className="text-xs text-gray-500 mb-4">
          明細・数量・単価を入力 → 自動で小計・消費税(10%)・合計を計算 → ステータスで送付/受諾を管理
        </p>
        <EstimateEditorButton dealId={dealId} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-gray-500">
            見積 <span className="font-mono text-gray-900">{items.length}件</span>
          </h3>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="まだ見積がありません"
            description="提案内容が固まったら見積を作成してください"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((e) => {
              const lines = (e.line_items ?? []) as LineItem[];
              const status = e.status as 'draft' | 'sent' | 'accepted' | 'declined';
              return (
                <li key={e.id} className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{e.title}</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">
                        v{e.version} · {new Date(e.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[status] ?? 'default'}>
                      {STATUS_LABEL[status] ?? status}
                    </Badge>
                  </div>

                  {lines.length > 0 && (
                    <details className="group">
                      <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900 list-none">
                        <span className="inline-flex items-center gap-1 group-open:hidden">
                          <ChevronRight className="w-3 h-3" />
                          明細 {lines.length} 行を表示
                        </span>
                        <span className="hidden group-open:inline-flex items-center gap-1">
                          <ChevronDown className="w-3 h-3" />
                          明細を折りたたむ
                        </span>
                      </summary>
                      <table className="mt-3 w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                            <th className="py-2">品目</th>
                            <th className="py-2 text-right">数量</th>
                            <th className="py-2 text-right">単価</th>
                            <th className="py-2 text-right">金額</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((l, i) => (
                            <tr key={i} className="border-t border-gray-200">
                              <td className="py-2 text-gray-900">{l.description}</td>
                              <td className="py-2 text-right font-mono tabular-nums text-gray-700">
                                {l.quantity}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums text-gray-700">
                                {formatYen(l.unit_price)}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums text-gray-900">
                                {formatYen(l.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">小計</p>
                      <p className="font-mono tabular-nums text-gray-900">{formatYen(e.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">税</p>
                      <p className="font-mono tabular-nums text-gray-900">{formatYen(e.tax)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">合計</p>
                      <p className="font-mono tabular-nums text-gray-900 font-medium">
                        {formatYen(e.total)}
                      </p>
                    </div>
                  </div>

                  {e.valid_until && (
                    <p className="text-xs text-gray-500">有効期限 · {e.valid_until}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-200">
                    <EstimateStatusActions
                      estimateId={e.id}
                      dealId={dealId}
                      currentStatus={status}
                    />
                    {status === 'accepted' && (
                      <InvoiceFromEstimateButton
                        dealId={dealId}
                        estimateId={e.id}
                        estimateTotal={e.total ?? 0}
                        estimateSubtotal={e.subtotal ?? 0}
                        estimateTax={e.tax ?? 0}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
