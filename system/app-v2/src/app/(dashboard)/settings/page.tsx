import Link from 'next/link';
import { redirect } from 'next/navigation';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { ArrowLeft, Building2, Quote, FolderOpen, Factory, Plug, FileSearch, Banknote, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import {
  quotes,
  vendors,
  project_templates,
  integrations,
  audit_logs,
  ai_jobs,
  members as membersTable,
} from '@/db/schema';
import { gte } from 'drizzle-orm';

type SettingItem = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  status?: string;
};

export default async function SettingsHubPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const companyId = session.user.company_id;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [quotesRow, vendorsRow, templatesRow, integrationsRow, auditCountRow, memberCountRow, aiUsageRow] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(quotes)
      .where(and(eq(quotes.company_id, companyId), eq(quotes.is_active, 1))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(vendors)
      .where(and(eq(vendors.company_id, companyId), isNull(vendors.deleted_at))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(project_templates)
      .where(and(eq(project_templates.company_id, companyId), isNull(project_templates.deleted_at))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(integrations)
      .where(and(eq(integrations.company_id, companyId), eq(integrations.status, 'active'))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(audit_logs)
      .where(eq(audit_logs.company_id, companyId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(membersTable)
      .where(and(eq(membersTable.company_id, companyId), isNull(membersTable.deleted_at))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(ai_jobs)
      .where(and(eq(ai_jobs.company_id, companyId), gte(ai_jobs.created_at, monthStart))),
  ]);

  const items: SettingItem[] = [
    {
      href: '/settings/company',
      icon: Building2,
      title: '会社設定',
      description: 'coaris.config 全項目（基本情報・機能フラグ・ステージ・DB レコード）',
      status: `${memberCountRow[0]?.n ?? 0} 名所属`,
    },
    {
      href: '/settings/quotes',
      icon: Quote,
      title: '名言管理',
      description: 'ホーム画面で表示される名言。会社別カスタム可',
      status: `${quotesRow[0]?.n ?? 0} 件`,
    },
    {
      href: '/settings/templates',
      icon: FolderOpen,
      title: 'プロジェクトテンプレ',
      description: '制作カード新規作成時のテンプレ。LP/コーポレート/EC 等',
      status: `${templatesRow[0]?.n ?? 0} 件`,
    },
    {
      href: '/settings/vendors',
      icon: Factory,
      title: '外注先管理',
      description: '発注書（purchase_orders）が参照する vendor マスタ',
      status: `${vendorsRow[0]?.n ?? 0} 社`,
    },
    {
      href: '/settings/integrations',
      icon: Plug,
      title: '連携設定',
      description: '外部サービスとの OAuth 連携状態（MF / Slack / LINE / Google 他）',
      status: `${integrationsRow[0]?.n ?? 0} 接続中`,
    },
    {
      href: '/settings/mf',
      icon: Banknote,
      title: 'マネーフォワード クラウド',
      description: '仕訳取込・照合・反映の3工程',
    },
    {
      href: '/settings/audit',
      icon: FileSearch,
      title: '監査ログ',
      description: '誰がいつ何を変更したかの全履歴。フィルタ + CSV エクスポート',
      status: `${(auditCountRow[0]?.n ?? 0).toLocaleString('ja-JP')} 件`,
    },
    {
      href: '/settings/ai-usage',
      icon: Bot,
      title: 'AI 利用状況',
      description: '当月の AI 呼出数・コスト ／ 機能別 ／ ユーザー別 ／ 履歴',
      status: `${(aiUsageRow[0]?.n ?? 0).toLocaleString('ja-JP')} 回 / 今月`,
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          ホーム
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">設定</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          システム全体の設定ハブ。13社展開時もここから coaris.config の値を確認・編集できる構造。
        </p>

        <ul className="space-y-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-900 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <Icon className="w-7 h-7 shrink-0 text-gray-700" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm text-gray-900 font-medium">{item.title}</p>
                        {item.status && (
                          <span className="text-xs font-mono text-gray-500">{item.status}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 mt-1">{item.description}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
