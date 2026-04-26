import { listCommitmentsForMember } from '@/lib/actions/commitments';
import { CommitmentForm } from './commitment-form';
import { CommitmentItem } from './commitment-item';

export async function CommitmentsSection({ memberId }: { memberId: string }) {
  const items = await listCommitmentsForMember(memberId);
  const open = items.filter((c) => c.status !== 'done');
  const done = items.filter((c) => c.status === 'done').slice(0, 5);

  return (
    <section className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-subtle">コミットメント</p>
        <p className="text-sm text-muted mt-1">
          「来週までに○○する」を自分で記録 → 達成したらチェック
        </p>
      </div>

      <CommitmentForm memberId={memberId} />

      {open.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-subtle mb-2">
            進行中 <span className="font-mono text-ink">{open.length}</span>
          </p>
          <ul className="space-y-2">
            {open.map((c) => (
              <CommitmentItem key={c.id} commitment={c} memberId={memberId} />
            ))}
          </ul>
        </div>
      )}

      {done.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted cursor-pointer hover:text-ink list-none">
            <span className="inline-block group-open:hidden">▶ 完了済 {done.length} 件を表示</span>
            <span className="hidden group-open:inline-block">▼ 完了済を折りたたむ</span>
          </summary>
          <ul className="space-y-2 mt-2">
            {done.map((c) => (
              <CommitmentItem key={c.id} commitment={c} memberId={memberId} />
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
