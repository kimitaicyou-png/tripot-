import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function RootPage() {
  const session = await auth();
  if (session?.user?.member_id) {
    redirect(`/home/${session.user.member_id}`);
  }
  redirect('/login');
}
