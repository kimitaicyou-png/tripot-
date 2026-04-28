import { getAttackPlanForDeal } from '@/lib/actions/attack-plans';
import { AttackForm } from './attack-form';

function formatYen(value: number | null | undefined): string {
  if (!value) return '—';
  return `¥${value.toLocaleString('ja-JP')}`;
}

export async function AttackSection({ dealId }: { dealId: string }) {
  const plan = await getAttackPlanForDeal(dealId);

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-subtle">攻略カード</p>
        <p className="text-sm text-muted mt-1">
          キーパーソン・競合・予算想定・打ち手を整理して、案件を勝つための骨子をまとめる
        </p>
      </div>

      {plan ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm border-l-2 border-amber-300 pl-4 py-1">
          <div>
            <p className="text-xs text-subtle mb-1">キーパーソン</p>
            <p className="text-ink font-medium">{plan.key_person ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-subtle mb-1">競合</p>
            <p className="text-ink font-medium">{plan.competitor ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-subtle mb-1">予算想定</p>
            <p className="font-mono tabular-nums text-ink">{formatYen(plan.budget_estimate)}</p>
          </div>
          <div>
            <p className="text-xs text-subtle mb-1">最終更新</p>
            <p className="font-mono text-ink text-xs">
              {new Date(plan.updated_at).toLocaleString('ja-JP')}
            </p>
          </div>
          {plan.plan && (
            <div className="col-span-2">
              <p className="text-xs text-subtle mb-1">攻略プラン</p>
              <p className="text-ink whitespace-pre-wrap">{plan.plan}</p>
            </div>
          )}
          {plan.next_action && (
            <div className="col-span-2">
              <p className="text-xs text-subtle mb-1">次のアクション</p>
              <p className="text-ink whitespace-pre-wrap">{plan.next_action}</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">攻略カード未作成</p>
      )}

      <AttackForm
        dealId={dealId}
        initial={{
          key_person: plan?.key_person ?? '',
          competitor: plan?.competitor ?? '',
          budget_estimate: plan?.budget_estimate ?? null,
          plan: plan?.plan ?? '',
          next_action: plan?.next_action ?? '',
        }}
      />
    </section>
  );
}
