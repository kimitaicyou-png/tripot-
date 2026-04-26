import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { CustomerEditForm } from './edit-form';

export default async function CustomerEditPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const { customerId } = await params;

  const customer = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.company_id, session.user.company_id),
        isNull(customers.deleted_at),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!customer) notFound();

  return (
    <main className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link href={`/customers/${customerId}`} className="text-muted hover:text-ink text-sm">
          ← 顧客詳細
        </Link>
        <h1 className="text-lg font-semibold text-ink">顧客を編集</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <CustomerEditForm
          customerId={customerId}
          initial={{
            name: customer.name,
            contact_email: customer.contact_email,
            contact_phone: customer.contact_phone,
          }}
        />
      </div>
    </main>
  );
}
