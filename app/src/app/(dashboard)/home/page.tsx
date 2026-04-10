import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function HomePage() {
  const session = await auth();
  const memberId = (session?.user as Record<string, unknown> | undefined)?.memberId as string | undefined;
  redirect(`/home/${memberId ?? 'kashiwagi'}`);
}
