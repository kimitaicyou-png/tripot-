import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Sidebar } from '@/components/nav/sidebar';
import { MobileTabBar } from '@/components/nav/mobile-tabbar';
import { ChatWidget } from '@/components/chat-widget';
import { PHProvider } from '@/components/posthog-provider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.member_id) {
    redirect('/login');
  }

  return (
    <PHProvider>
      <div className="min-h-screen flex">
        <Sidebar user={session.user} />
        <div className="flex-1 min-w-0 pb-16 md:pb-0">
          {children}
        </div>
        <MobileTabBar memberId={session.user.member_id} />
        <ChatWidget />
      </div>
    </PHProvider>
  );
}
