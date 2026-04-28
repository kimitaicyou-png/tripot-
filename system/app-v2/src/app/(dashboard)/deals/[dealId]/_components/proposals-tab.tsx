import { listProposalsForDeal } from '@/lib/actions/proposals';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { ProposalGenerateButton } from './proposal-generate-button';
import { SlideRendererInline } from './slide-renderer-inline';
import { SlidePresentation } from './slide-presentation';
import { ProposalStatusActions } from './proposal-status-actions';
import { ProposalSlidesEditor } from './proposal-slides-editor';
import type { ProposalStatus } from '@/lib/actions/proposals';

const STATUS_LABEL: Record<string, string> = {
  draft: '下書き',
  shared: '共有済',
  won: '受注',
  lost: '失注',
  archived: 'アーカイブ',
};

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'up' | 'down' | 'default'> = {
  draft: 'neutral',
  shared: 'info',
  won: 'up',
  lost: 'down',
  archived: 'default',
};

type ProposalSlide = { id: string; type: string; title: string };

export async function ProposalsTab({ dealId }: { dealId: string }) {
  const items = await listProposalsForDeal(dealId);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-1">AIで提案書を生成</h3>
        <p className="text-xs text-gray-500 mb-4">
          このタブで集めた議事録と案件情報をもとに、12-15枚の提案書スライドを 1 クリック生成します
        </p>
        <ProposalGenerateButton dealId={dealId} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-gray-500">
            提案書 <span className="font-mono text-gray-900">{items.length}件</span>
          </h3>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon="📑"
            title="まだ提案書がありません"
            description="議事録を貯めてから「AIで生成」を押すと、過去の文脈を踏まえた提案書ができます"
          />
        ) : (
          <ul className="space-y-4">
            {items.map((p) => {
              const slides = (p.slides ?? []) as ProposalSlide[];
              return (
                <li
                  key={p.id}
                  className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 font-medium">{p.title}</p>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">
                        v{p.version} · {new Date(p.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <Badge tone={STATUS_TONE[p.status] ?? 'default'}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </div>

                  <ProposalStatusActions
                    proposalId={p.id}
                    dealId={dealId}
                    currentStatus={p.status as ProposalStatus}
                  />

                  {slides.length > 0 && (
                    <>
                      <div className="flex justify-end gap-2">
                        <ProposalSlidesEditor
                          proposalId={p.id}
                          dealId={dealId}
                          initialSlides={slides}
                        />
                        <SlidePresentation slides={slides} proposalTitle={p.title} />
                      </div>
                      <SlideRendererInline slides={slides} />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
