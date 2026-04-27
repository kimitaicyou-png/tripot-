import { getMemberColor, getMemberInitial } from '@/lib/member-color';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

type MemberStat = {
  id: string;
  name: string;
  total: number;
  calls: number;
  meetings: number;
  proposals: number;
};

export function MemberActivityGrid({
  members,
}: {
  members: MemberStat[];
}) {
  const maxActions = Math.max(...members.map((m) => m.total), 1);

  return (
    <section>
      <SectionHeading
        eyebrow="ACTIVITY"
        title="メンバー別 行動量"
        count={members.length}
      />
      {members.length === 0 ? (
        <EmptyState icon="◯" title="メンバーがまだ登録されていません" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((m) => {
            const color = getMemberColor(m.id);
            const initial = getMemberInitial(m.name);
            const widthPct = Math.round((m.total / maxActions) * 100);
            return (
              <div
                key={m.id}
                className="bg-card border border-border rounded-xl p-5 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-white text-base font-semibold`}
                  >
                    {initial}
                  </div>
                  <p className="flex-1 text-sm text-ink font-medium truncate">{m.name}</p>
                  <p className="font-serif italic text-2xl text-ink tabular-nums leading-none">
                    {m.total}
                  </p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-ink rounded-full transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-subtle">電話</p>
                    <p className="font-mono tabular-nums text-sm text-ink mt-0.5">{m.calls}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-subtle">商談</p>
                    <p className="font-mono tabular-nums text-sm text-ink mt-0.5">{m.meetings}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-subtle">提案</p>
                    <p className="font-mono tabular-nums text-sm text-ink mt-0.5">{m.proposals}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
