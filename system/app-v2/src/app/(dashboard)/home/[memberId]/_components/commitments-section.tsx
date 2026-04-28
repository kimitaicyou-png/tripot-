import { ChevronRight, ChevronDown } from 'lucide-react';
import { listCommitmentsForMember } from '@/lib/actions/commitments';
import { CommitmentForm } from './commitment-form';
import { CommitmentItem } from './commitment-item';

export async function CommitmentsSection({ memberId }: { memberId: string }) {
  const items = await listCommitmentsForMember(memberId);
  const open = items.filter((c) => c.status !== 'done');
  const done = items.filter((c) => c.status === 'done').slice(0, 5);

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500">コミットメント</p>
        <p className="text-sm text-gray-700 mt-1">
          「来週までに○○する」を自分で記録 → 達成したらチェック
        </p>
      </div>

      <CommitmentForm memberId={memberId} />

      {open.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            進行中 <span className="font-mono text-gray-900">{open.length}</span>
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
          <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900 list-none">
            <span className="inline-flex items-center gap-1 group-open:hidden">
              <ChevronRight className="w-3 h-3" />
              完了済 {done.length} 件を表示
            </span>
            <span className="hidden group-open:inline-flex items-center gap-1">
              <ChevronDown className="w-3 h-3" />
              完了済を折りたたむ
            </span>
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
