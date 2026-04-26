import { listMeetingsForDeal } from '@/lib/actions/meetings';
import { EmptyState } from '@/components/ui/empty-state';
import { MeetingForm } from './meeting-form';
import { ProposalFromMeetingButton } from './proposal-from-meeting-button';

const TYPE_LABEL: Record<string, string> = {
  call: '📞 電話',
  meeting: '🤝 商談',
  gmeet: '🎥 オンラインMTG',
  visit: '🚶 訪問',
  email: '✉️ メール',
  other: '📝 その他',
};

export async function MeetingsTab({ dealId }: { dealId: string }) {
  const items = await listMeetingsForDeal(dealId);

  return (
    <div className="space-y-6">
      <section className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-ink mb-1">議事録を追加</h3>
        <p className="text-xs text-subtle mb-4">
          電話・商談・メールの記録を残す。AIで提案書に転換できる元素材になる
        </p>
        <MeetingForm dealId={dealId} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-subtle">
            これまでの議事録 <span className="font-mono text-ink">{items.length}件</span>
          </h3>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon="🗂"
            title="まだ議事録がありません"
            description="電話・商談・メールの内容をここに貯めていくと、AI が提案書を作る素材になります"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((m) => (
              <li
                key={m.id}
                className="bg-card border border-border rounded-xl p-5 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-ink font-medium">
                      {TYPE_LABEL[m.type] ?? m.type}
                      {m.title ? <span className="ml-2 text-muted">— {m.title}</span> : null}
                    </p>
                    <p className="text-xs font-mono text-subtle mt-0.5">
                      {new Date(m.occurred_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  <ProposalFromMeetingButton dealId={dealId} meetingId={m.id} />
                </div>
                {m.summary && (
                  <div className="border-l-2 border-border pl-3">
                    <p className="text-xs uppercase tracking-widest text-subtle mb-1">要約</p>
                    <p className="text-sm text-ink whitespace-pre-wrap">{m.summary}</p>
                  </div>
                )}
                {m.raw_text && (
                  <details className="group">
                    <summary className="text-xs text-muted cursor-pointer hover:text-ink list-none">
                      <span className="inline-block group-open:hidden">▶ 議事録本文を表示</span>
                      <span className="hidden group-open:inline-block">▼ 議事録本文を隠す</span>
                    </summary>
                    <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{m.raw_text}</p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
