import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    const memberId = (session.user as Record<string, unknown>).memberId as string | undefined;
    redirect(`/home/${memberId ?? ''}`);
  }
  redirect('/login');
}
