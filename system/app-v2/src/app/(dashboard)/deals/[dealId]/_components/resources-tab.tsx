import { listDealContracts } from '@/lib/actions/deal-contracts';
import { listDealArtifacts } from '@/lib/actions/deal-artifacts';
import { listDealComments } from '@/lib/actions/deal-comments';
import { ContractForm } from './contract-form';
import { ContractRow } from './contract-row';
import { ArtifactForm } from './artifact-form';
import { ArtifactRow } from './artifact-row';
import { CommentForm } from './comment-form';
import { CommentRow } from './comment-row';
import { SectionHeading } from '@/components/ui/section-heading';
import { EmptyState } from '@/components/ui/empty-state';

export async function ResourcesTab({ dealId }: { dealId: string }) {
  const [contracts, artifacts, comments] = await Promise.all([
    listDealContracts(dealId),
    listDealArtifacts(dealId),
    listDealComments(dealId),
  ]);

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading
          eyebrow="CONTRACTS"
          title="契約書"
          count={contracts.length}
        />
        <ContractForm dealId={dealId} />
        {contracts.length === 0 ? (
          <EmptyState
            icon="◌"
            title="登録された契約書はありません"
            description="業務委託 / 売買 / NDA などの契約書を案件単位で管理"
          />
        ) : (
          <ul className="space-y-2 mt-4">
            {contracts.map((c) => (
              <ContractRow
                key={c.id}
                id={c.id}
                dealId={dealId}
                title={c.title}
                contract_type={c.contract_type}
                signed_date={c.signed_date}
                expiry_date={c.expiry_date}
                file_url={c.file_url}
                note={c.note}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="ARTIFACTS"
          title="成果物"
          count={artifacts.length}
        />
        <ArtifactForm dealId={dealId} />
        {artifacts.length === 0 ? (
          <EmptyState
            icon="◌"
            title="登録された成果物はありません"
            description="議事録 / 仕様書 / 納品物 などのリンクを保存"
          />
        ) : (
          <ul className="space-y-2 mt-4">
            {artifacts.map((a) => (
              <ArtifactRow
                key={a.id}
                id={a.id}
                dealId={dealId}
                title={a.title}
                artifact_type={a.artifact_type}
                file_url={a.file_url}
                note={a.note}
              />
            ))}
          </ul>
        )}
      </section>

      <section>
        <SectionHeading
          eyebrow="COMMENTS"
          title="社内コメント"
          count={comments.length}
        />
        <CommentForm dealId={dealId} />
        {comments.length === 0 ? (
          <EmptyState
            icon="◌"
            title="まだコメントはありません"
            description="案件についての社内議論・気づきをここに残す"
          />
        ) : (
          <ul className="space-y-2 mt-4">
            {comments.map((c) => (
              <CommentRow
                key={c.id}
                id={c.id}
                dealId={dealId}
                body={c.body}
                created_at={c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at)}
                member_name={c.member_name}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
