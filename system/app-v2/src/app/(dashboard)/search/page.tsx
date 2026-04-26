import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { globalSearch } from '@/lib/actions/search';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';

const KIND_LABEL: Record<string, string> = {
  deal: '案件',
  customer: '顧客',
  task: 'タスク',
  meeting: '議事録',
  member: 'メンバー',
};

const KIND_TONE: Record<string, 'info' | 'accent' | 'up' | 'neutral' | 'down'> = {
  deal: 'info',
  customer: 'accent',
  task: 'neutral',
  meeting: 'up',
  member: 'down',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const hits = q ? await globalSearch(q) : [];

  const grouped = hits.reduce<Record<string, typeof hits>>((acc, h) => {
    const list = acc[h.kind] ?? [];
    list.push(h);
    acc[h.kind] = list;
    return acc;
  }, {});

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-muted hover:text-ink text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-ink">横断検索</h1>
      </header>

      <div className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <p className="text-sm text-muted">
          案件 / 顧客 / タスク / 議事録 / メンバー を一括検索（部分一致、ILIKE）。
        </p>

        <form action="/search" className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="キーワードを入力（例: A社 / 来週 / 提案書）"
            className="flex-1 px-4 py-3 text-base text-ink bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ink/20"
            autoFocus
          />
          <button
            type="submit"
            className="px-6 py-3 text-sm bg-ink text-card font-medium rounded-lg hover:bg-ink-mid"
          >
            検索
          </button>
        </form>

        {!q ? (
          <p className="text-sm text-muted text-center py-8">
            キーワードを入力してください
          </p>
        ) : hits.length === 0 ? (
          <EmptyState
            icon="🔎"
            title={`「${q}」に該当する結果がありません`}
            description="キーワードを変えて再検索してください"
          />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-muted">
              <span className="font-mono text-ink">{hits.length}</span> 件ヒット
            </p>
            {(['deal', 'customer', 'task', 'meeting', 'member'] as const).map((kind) => {
              const items = grouped[kind] ?? [];
              if (items.length === 0) return null;
              return (
                <section key={kind}>
                  <p className="text-xs uppercase tracking-widest text-subtle mb-3">
                    {KIND_LABEL[kind]} <span className="font-mono text-ink">{items.length}</span>
                  </p>
                  <ul className="space-y-2">
                    {items.map((h) => (
                      <li key={`${h.kind}-${h.id}`}>
                        <Link
                          href={h.href}
                          className="block bg-card border border-border rounded-xl p-4 hover:border-ink transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-ink font-medium truncate">{h.title}</p>
                              {h.subtitle && (
                                <p className="text-xs text-muted mt-0.5 truncate">{h.subtitle}</p>
                              )}
                            </div>
                            <Badge tone={KIND_TONE[h.kind] ?? 'default'}>
                              {KIND_LABEL[h.kind]}
                            </Badge>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
