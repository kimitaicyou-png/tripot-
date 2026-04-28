import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { companies } from '@/db/schema';
import { TRIPOT_CONFIG } from '../../../../../coaris.config';
import { Badge } from '@/components/ui/badge';

export default async function SettingsCompanyPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const company = await db
    .select()
    .from(companies)
    .where(eq(companies.id, session.user.company_id))
    .limit(1)
    .then((rows) => rows[0]);

  const cfg = TRIPOT_CONFIG;

  const featureRows = [
    { key: 'moneyForward', label: 'MoneyForward 連携' },
    { key: 'csvImport', label: 'CSV 取込' },
    { key: 'weeklyMeeting', label: '週次会議' },
    { key: 'monthlyMeeting', label: '月次会議' },
    { key: 'yearlyBudget', label: '年間予算' },
    { key: 'productionDashboard', label: '制作管理' },
    { key: 'customerCRM', label: '顧客 CRM' },
    { key: 'approvalFlow', label: '申請承認' },
    { key: 'aiAssistant', label: 'AI アシスタント' },
    { key: 'auditLog', label: '監査ログ' },
    { key: 'childAiSecretary', label: '子LINE美桜' },
    { key: 'voiceMeetings', label: '音声議事録' },
    { key: 'proposalAi', label: '提案書AI' },
    { key: 'estimateAi', label: '見積AI' },
    { key: 'attackScoring', label: '攻略スコア' },
  ] as const;

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-gray-900">会社設定</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          coaris.config.ts と companies テーブルから会社情報を表示。
          編集は将来 Phase 後段で対応（現状は読み取り専用、変更は config.ts を直接編集）。
        </p>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">基本情報</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">正式名称</dt>
              <dd className="text-gray-900 font-medium mt-0.5">{cfg.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">略称</dt>
              <dd className="text-gray-900 font-medium mt-0.5">{cfg.shortName}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">法人形態</dt>
              <dd className="text-gray-900 mt-0.5">{cfg.legalForm}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">パス</dt>
              <dd className="text-gray-900 font-mono mt-0.5">/{cfg.pathPrefix}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">代表</dt>
              <dd className="text-gray-900 mt-0.5">
                {cfg.president.name}（<span className="font-mono text-xs">{cfg.president.email}</span>）
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">業界</dt>
              <dd className="text-gray-900 mt-0.5">{cfg.industryFields?.type ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">許可ドメイン</dt>
              <dd className="text-gray-900 font-mono text-xs mt-0.5">
                {cfg.auth.allowedEmailDomains.join(', ')}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">期初月</dt>
              <dd className="text-gray-900 mt-0.5">{cfg.fiscal.startMonth}月</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">機能フラグ</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {featureRows.map((f) => {
              const enabled = cfg.features[f.key] === true;
              return (
                <li key={f.key} className="flex items-center justify-between">
                  <span className="text-gray-900">{f.label}</span>
                  <Badge tone={enabled ? 'up' : 'neutral'}>{enabled ? 'ON' : 'OFF'}</Badge>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">案件ステージ</p>
          <ul className="space-y-1 text-sm">
            {cfg.stages.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500 w-12">{s.order}</span>
                  <span className={`inline-flex px-2 py-0.5 rounded-lg text-xs font-medium ${s.badgeClass}`}>
                    {s.label}
                  </span>
                  <span className="font-mono text-xs text-gray-700">{s.key}</span>
                </span>
                <span className="font-mono text-xs text-gray-700">
                  CF重み {(s.cashflowWeight * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <p className="text-xs uppercase tracking-widest text-gray-500">DB レコード</p>
          {company ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-xs text-gray-500">company_id</dt>
                <dd className="text-gray-900 font-mono text-xs mt-0.5">{company.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">id_slug</dt>
                <dd className="text-gray-900 font-mono mt-0.5">{company.id_slug}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">name (DB)</dt>
                <dd className="text-gray-900 mt-0.5">{company.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">created_at</dt>
                <dd className="text-gray-900 font-mono text-xs mt-0.5">
                  {new Date(company.created_at).toLocaleString('ja-JP')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-700">DB レコードが見つかりません（migration 未適用 or seed 未投入）</p>
          )}
        </section>
      </div>
    </main>
  );
}
