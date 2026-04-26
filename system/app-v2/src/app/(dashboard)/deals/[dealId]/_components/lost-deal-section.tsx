import { getLostDealForDeal } from '@/lib/actions/lost-deals';
import { LostDealForm } from './lost-deal-form';

export async function LostDealSection({
  dealId,
  currentStage,
}: {
  dealId: string;
  currentStage: string;
}) {
  const isLost = currentStage === 'lost';
  const record = isLost ? await getLostDealForDeal(dealId) : null;

  if (!isLost && !record) {
    return (
      <section className="bg-card border border-border border-l-2 border-l-red-200 rounded-xl p-6 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle">失注として記録</p>
          <p className="text-sm text-muted mt-1">
            この案件が失注した場合、理由を記録すると stage='lost' に自動遷移し、後の学習データに使えます
          </p>
        </div>
        <LostDealForm dealId={dealId} initial={null} />
      </section>
    );
  }

  return (
    <section className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-red-700">失注記録</p>
        {record ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm text-ink">
              <span className="font-medium">理由：</span>
              {record.reason}
            </p>
            {record.competitor && (
              <p className="text-sm text-muted">
                <span className="text-xs uppercase tracking-widest text-subtle mr-2">競合</span>
                {record.competitor}
              </p>
            )}
            {record.detail && (
              <p className="text-sm text-muted whitespace-pre-wrap">{record.detail}</p>
            )}
            <p className="text-xs font-mono text-subtle mt-2">
              記録日時 {new Date(record.lost_at).toLocaleString('ja-JP')}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted mt-2">stage=lost ですが詳細未記録</p>
        )}
      </div>
      <LostDealForm
        dealId={dealId}
        initial={
          record
            ? { reason: record.reason, competitor: record.competitor, detail: record.detail }
            : null
        }
      />
    </section>
  );
}
