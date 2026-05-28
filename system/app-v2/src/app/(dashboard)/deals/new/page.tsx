import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { customers } from '@/db/schema';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { DealNewForm } from './deal-new-form';

export default async function DealNewPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const customerList = await db
    .select({ id: customers.id, name: customers.name })
    .from(customers)
    .where(and(eq(customers.company_id, session.user.company_id), isNull(customers.deleted_at)))
    .orderBy(asc(customers.name));

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/deals" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          案件一覧
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">新規案件</h1>
      </header>

      <div className="px-6 py-8 max-w-2xl mx-auto">
        <DealNewForm customers={customerList} />
      </div>
    </main>
  );
}
