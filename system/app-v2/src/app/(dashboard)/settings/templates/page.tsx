import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listProjectTemplates } from '@/lib/actions/project-templates';
import { EmptyState } from '@/components/ui/empty-state';
import { TemplatesAdmin } from './_components/templates-admin';

export default async function SettingsTemplatesPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await listProjectTemplates();

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-ink text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-ink">プロジェクトテンプレート管理</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-muted">
          制作カード（production_cards）作成時に呼び出すテンプレ。
          v1 の constants/templates.ts ハードコード（LP/コーポレート/EC等）を撲滅し、
          coaris.config の seed を「初期データ投入」で取り込めます。
        </p>

        <TemplatesAdmin existingCount={items.length} templates={items} />

        {items.length === 0 && (
          <EmptyState
            icon="📁"
            title="まだテンプレートがありません"
            description="上の「初期データ投入」で 6 個の seed を一括登録できます"
          />
        )}
      </div>
    </main>
  );
}
