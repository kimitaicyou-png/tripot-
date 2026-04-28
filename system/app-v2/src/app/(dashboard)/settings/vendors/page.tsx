import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { listVendors } from '@/lib/actions/vendors';
import { EmptyState } from '@/components/ui/empty-state';
import { VendorAdminList } from './_components/vendor-admin-list';
import { VendorCreateButton } from './_components/vendor-create-button';

export default async function SettingsVendorsPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const items = await listVendors();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/" className="text-gray-700 hover:text-gray-900 text-sm">← ホーム</Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">外注先管理</h1>
        <VendorCreateButton />
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-gray-700">
          外注先（パートナー会社・フリーランス）のマスタ管理。
          v1 の架空 6社（@example.com）を撲滅し、実データで管理します。
          発注書（purchase_orders）はここの vendor_id を参照します。
        </p>

        {items.length === 0 ? (
          <EmptyState
            icon="🏢"
            title="まだ外注先が登録されていません"
            description="右上の「+ 新規追加」から登録してください"
          />
        ) : (
          <VendorAdminList vendors={items} />
        )}
      </div>
    </main>
  );
}
