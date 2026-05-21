import { Phone, Handshake, Video, Footprints, Mail, FileEdit, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { listMeetingsForDeal } from '@/lib/actions/meetings';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { MeetingForm } from './meeting-form';
import { ProposalFromMeetingButton } from './proposal-from-meeting-button';
import { SummarizeMeetingButton } from './summarize-meeting-button';
import { GenerateTasksFromMeetingButton } from './generate-tasks-from-meeting-button';
import { GenerateRequirementButton } from './generate-requirement-button';
import { GenerateSitemapButton } from './generate-sitemap-button';

type Need = { tag: string; priority: 'high' | 'medium' | 'low'; context: string };

const PRIORITY_TONE: Record<Need['priority'], 'down' | 'accent' | 'neutral'> = {
  high: 'down',
  medium: 'accent',
  low: 'neutral',
};

const TYPE_LABEL: Record<string, string> = {
  call: '電話',
  meeting: '商談',
  gmeet: 'オンラインMTG',
  visit: '訪問',
  email: 'メール',
  other: 'その他',
};

const TYPE_ICON: Record<string, LucideIcon> = {
  call: Phone,
  meeting: Handshake,
  gmeet: Video,
  visit: Footprints,
  email: Mail,
  other: FileEdit,
};

export async function MeetingsTab({ dealId }: { dealId: string }) {
  const items = await listMeetingsForDeal(dealId);

  return (
    <div className="space-y-6">
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-1">議事録を追加</h3>
        <p className="text-xs text-gray-500 mb-4">
          電話・商談・メールの記録を残す。AIで提案書に転換できる元素材になる
        </p>
        <MeetingForm dealId={dealId} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm uppercase tracking-widest text-gray-500">
            これまでの議事録 <span className="font-mono text-gray-900">{items.length}件</span>
          </h3>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="まだ議事録がありません"
            description="電話・商談・メールの内容をここに貯めていくと、AI が提案書を作る素材になります"
          />
        ) : (
          <ul className="space-y-3">
            {items.map((m) => {
              const Icon = TYPE_ICON[m.type] ?? FileEdit;
              return (
              <li
                key={m.id}
                className="bg-white border border-gray-200 rounded-xl p-5 space-y-4"
              >
                {/* ヘッダー：種類アイコン + タイトル + 日時のみ（ボタン無し、重なり回避） */}
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm text-gray-900 font-medium flex-wrap">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{TYPE_LABEL[m.type] ?? m.type}</span>
                    {m.title ? <span className="text-gray-700">— {m.title}</span> : null}
                  </p>
                  <p className="text-xs font-mono text-gray-500 mt-0.5">
                    {new Date(m.occurred_at).toLocaleString('ja-JP')}
                  </p>
                </div>

                {/* 要約 */}
                {m.summary && (
                  <div className="border-l-2 border-gray-200 pl-3">
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">要約</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{m.summary}</p>
                  </div>
                )}

                {/* needs */}
                {Array.isArray(m.needs) && m.needs.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
                      抽出された needs
                    </p>
                    <ul className="space-y-1.5">
                      {(m.needs as Need[]).map((n, i) => (
                        <li key={i} className="flex items-baseline gap-2">
                          <Badge tone={PRIORITY_TONE[n.priority] ?? 'neutral'}>{n.tag}</Badge>
                          <span className="text-xs text-gray-700 flex-1">{n.context}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 議事録本文（折りたたみ） */}
                {m.raw_text && (
                  <details className="group">
                    <summary className="text-xs text-gray-700 cursor-pointer hover:text-gray-900 list-none">
                      <span className="inline-flex items-center gap-1 group-open:hidden">
                        <ChevronRight className="w-3 h-3" />
                        議事録本文を表示
                      </span>
                      <span className="hidden group-open:inline-flex items-center gap-1">
                        <ChevronDown className="w-3 h-3" />
                        議事録本文を隠す
                      </span>
                    </summary>
                    <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{m.raw_text}</p>
                  </details>
                )}

                {/* AI アクション領域：縦並びで各ボタンが独立、展開時も他を押さない */}
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                    AI アクション
                  </p>
                  {m.raw_text && (
                    <div>
                      <SummarizeMeetingButton meetingId={m.id} hasSummary={Boolean(m.summary)} />
                    </div>
                  )}
                  <div>
                    <ProposalFromMeetingButton dealId={dealId} meetingId={m.id} />
                  </div>
                  <div>
                    <GenerateTasksFromMeetingButton meetingId={m.id} />
                  </div>
                  <div>
                    <GenerateRequirementButton dealId={dealId} meetingId={m.id} />
                  </div>
                  <div>
                    <GenerateSitemapButton meetingId={m.id} />
                  </div>
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
