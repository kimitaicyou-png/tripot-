import Link from 'next/link';
import { redirect } from 'next/navigation';
import { sql, eq, and, desc, gte } from 'drizzle-orm';
import { ArrowLeft, Bot, Coins, AlertTriangle } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { ai_jobs, ai_usage, members } from '@/db/schema';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';

const JOB_TYPE_LABEL: Record<string, string> = {
  'risk-score': '失注リスク',
  'silence-detect': '沈黙検知',
  'overload-detect': '過負荷検知',
  'suggest-next-action': '次の一手',
  'generate-proposal': '提案書生成',
  'generate-email': 'メール下書き',
  'generate-minutes': '議事録要約',
  'morning-brief': '朝ブリーフィング',
  chat: '自然言語チャット',
  transcribe: '音声→文字起こし',
  'extract-needs': 'ニーズ抽出',
  'summarize-voice': '音声要約',
  'extract-deal-from-photo': '写真→案件',
  'extract-deals-from-file': 'ファイル→案件',
  'generate-requirement': '要件定義',
  'generate-tasks': 'タスク生成',
  'generate-estimate': '見積生成',
  'generate-budget': '予算生成',
  'refine-requirements': '要件磨き上げ',
  'generate-sitemap': 'サイトマップ',
  'import-reply': 'メール取込',
  'stuck-deals': '案件詰まり',
  'win-probability': '受注確率',
  loyalty: 'LTV/ロイヤリティ',
  'competitor-watch': '競合動向',
  'price-suggest': '価格提示',
  upsell: 'アップセル',
  'proposal-winrate': '提案書勝率',
};

const MONTHLY_BUDGET_USD = 30;

function microUsdToUsd(microUsd: number | null): number {
  return Math.round(((microUsd ?? 0) / 1_000_000) * 100) / 100;
}

function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export default async function AiUsagePage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');
  if (session.user.role === 'member') redirect('/');

  const companyId = session.user.company_id;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const last30Start = new Date();
  last30Start.setDate(last30Start.getDate() - 30);
  last30Start.setHours(0, 0, 0, 0);

  const [monthSummaryRow, jobTypeRows, recentJobsRows, topUserRows] = await Promise.all([
    db
      .select({
        job_count: sql<number>`COUNT(*)::int`,
        tokens_in: sql<number>`COALESCE(SUM(${ai_usage.tokens_in}), 0)::int`,
        tokens_out: sql<number>`COALESCE(SUM(${ai_usage.tokens_out}), 0)::int`,
        total_micro_usd: sql<number>`COALESCE(SUM(${ai_usage.cost_micro_usd}), 0)::bigint`,
      })
      .from(ai_usage)
      .where(and(eq(ai_usage.company_id, companyId), gte(ai_usage.occurred_at, monthStart)))
      .then((rows) => rows[0]),
    db
      .select({
        job_type: ai_jobs.job_type,
        count: sql<number>`COUNT(*)::int`,
        total_micro_usd: sql<number>`COALESCE(SUM(${ai_usage.cost_micro_usd}), 0)::bigint`,
      })
      .from(ai_jobs)
      .leftJoin(ai_usage, eq(ai_usage.job_id, ai_jobs.id))
      .where(and(eq(ai_jobs.company_id, companyId), gte(ai_jobs.created_at, monthStart)))
      .groupBy(ai_jobs.job_type)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(20),
    db
      .select({
        id: ai_jobs.id,
        job_type: ai_jobs.job_type,
        status: ai_jobs.status,
        model: ai_jobs.model,
        member_name: members.name,
        created_at: ai_jobs.created_at,
        finished_at: ai_jobs.finished_at,
      })
      .from(ai_jobs)
      .leftJoin(members, eq(ai_jobs.member_id, members.id))
      .where(eq(ai_jobs.company_id, companyId))
      .orderBy(desc(ai_jobs.created_at))
      .limit(20),
    db
      .select({
        member_name: members.name,
        count: sql<number>`COUNT(*)::int`,
        total_micro_usd: sql<number>`COALESCE(SUM(${ai_usage.cost_micro_usd}), 0)::bigint`,
      })
      .from(ai_usage)
      .leftJoin(members, eq(ai_usage.member_id, members.id))
      .where(and(eq(ai_usage.company_id, companyId), gte(ai_usage.occurred_at, last30Start)))
      .groupBy(members.name)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(5),
  ]);

  const monthCost = microUsdToUsd(Number(monthSummaryRow?.total_micro_usd ?? 0));
  const budgetPct = Math.round((monthCost / MONTHLY_BUDGET_USD) * 100);
  const budgetTone =
    budgetPct >= 100 ? 'down' : budgetPct >= 80 ? 'down' : budgetPct >= 50 ? undefined : 'up';
  const overBudget = monthCost >= MONTHLY_BUDGET_USD;

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="SETTINGS / AI"
        title="AI 利用状況"
        subtitle={
          <>
            当月の AI 呼出数・トークン・コスト ／ ユーザー別利用 ／ 履歴
          </>
        }
        actions={
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            設定一覧
          </Link>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-10">
        {overBudget && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-900">月次予算超過</p>
              <p className="text-xs text-red-800 mt-1">
                月次予算 {formatUsd(MONTHLY_BUDGET_USD)} を超過しています。経営判断のため、AI 機能の優先順位を見直してください
              </p>
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="今月の呼出数" value={monthSummaryRow?.job_count ?? 0} big />
          <StatCard
            label="今月のコスト"
            value={formatUsd(monthCost)}
            sub={`予算 ${formatUsd(MONTHLY_BUDGET_USD)} の ${budgetPct}%`}
            tone={budgetTone}
            big
          />
          <StatCard
            label="入力トークン"
            value={(monthSummaryRow?.tokens_in ?? 0).toLocaleString('ja-JP')}
            big
          />
          <StatCard
            label="出力トークン"
            value={(monthSummaryRow?.tokens_out ?? 0).toLocaleString('ja-JP')}
            big
          />
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-gray-500" />
            <p className="text-xs uppercase tracking-widest text-gray-500">機能別利用（今月）</p>
          </div>
          {jobTypeRows.length === 0 ? (
            <EmptyState icon="◯" title="今月の AI 呼出はまだありません" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {jobTypeRows.map((r) => {
                const cost = microUsdToUsd(Number(r.total_micro_usd ?? 0));
                return (
                  <li key={r.job_type} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {JOB_TYPE_LABEL[r.job_type] ?? r.job_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">{r.job_type}</p>
                    </div>
                    <p className="font-mono text-sm text-gray-700 tabular-nums">
                      {r.count}回
                    </p>
                    <p className="font-mono text-sm text-gray-900 tabular-nums w-20 text-right">
                      {formatUsd(cost)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Coins className="w-4 h-4 text-gray-500" />
            <p className="text-xs uppercase tracking-widest text-gray-500">
              ユーザー別利用（直近30日）
            </p>
          </div>
          {topUserRows.length === 0 ? (
            <EmptyState icon="◯" title="まだ利用記録がありません" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {topUserRows.map((r, idx) => {
                const cost = microUsdToUsd(Number(r.total_micro_usd ?? 0));
                return (
                  <li key={idx} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{r.member_name ?? '—'}</p>
                    </div>
                    <p className="font-mono text-sm text-gray-700 tabular-nums">{r.count}回</p>
                    <p className="font-mono text-sm text-gray-900 tabular-nums w-20 text-right">
                      {formatUsd(cost)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">
            最新の AI 呼出履歴（直近20件）
          </p>
          {recentJobsRows.length === 0 ? (
            <EmptyState icon="◯" title="まだ AI 呼出の履歴がありません" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {recentJobsRows.map((j) => {
                const statusBadge =
                  j.status === 'succeeded'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : j.status === 'failed'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';
                return (
                  <li key={j.id} className="py-3 flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${statusBadge}`}
                    >
                      {j.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        {JOB_TYPE_LABEL[j.job_type] ?? j.job_type}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {j.member_name ?? '—'} ／ {j.model ?? '—'}
                      </p>
                    </div>
                    <p className="font-mono text-xs text-gray-500 shrink-0">
                      {new Date(j.created_at).toLocaleString('ja-JP')}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
