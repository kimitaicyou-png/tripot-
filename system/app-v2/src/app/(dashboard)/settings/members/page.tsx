import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { auth } from '@/auth';
import { listMembers } from '@/lib/actions/members';
import { EmptyState } from '@/components/ui/empty-state';
import { MembersAdminList } from './_components/members-admin-list';
import { MemberInviteButton } from './_components/member-invite-button';

/**
 * メンバー管理画面（president / hq_member 用）。
 *
 * 隊長明示 2026-05-27 12:48「人に送れる」共有ボタンの委任先 = 石田 QA 招待を起点に、
 * 5/26 まで作り忘れていた招待画面を急ぎ実装。
 * 6/8 実運用入りまでに 5 人（柏樹/小野/和泉/石田/西室）を追加するため必須。
 *
 * 機能：
 *  - 一覧（active + inactive、削除済のみ除外）
 *  - 招待（氏名 + Gmail + 役割 + 部署、status='active' 即時作成）
 *  - 役割変更（president / hq_member / member）
 *  - 有効/無効切替（退職時 JWT 即時無効化）
 *
 * Google OAuth が email 一致でログイン許可するので、招待 = DB に行追加するだけ。
 */
export default async function SettingsMembersPage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  const members = await listMembers();

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          設定
        </Link>
        <h1 className="text-lg font-semibold text-gray-900 flex-1">メンバー管理</h1>
        <MemberInviteButton />
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2 text-sm text-gray-700 leading-relaxed">
          <p className="text-gray-900 font-medium">招待制（Google OAuth ホワイトリスト）</p>
          <ul className="text-xs space-y-1 list-disc pl-5">
            <li>「メンバーを招待」で <strong>氏名 + Gmail + 役割</strong>を登録 → 即時 DB 作成</li>
            <li>本人に tripot URL を共有 → 本人が <strong>登録した Gmail の Google アカウント</strong>でログイン → 利用開始</li>
            <li>退職時は「無効化」→ 次回 API リクエストで 401（JWT 即時無効化、ADR-0012 P0-2）</li>
            <li>「自分自身の役割変更 / 無効化」は事故防止のためできません（他の president に依頼）</li>
          </ul>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon="👥"
            title="まだメンバーが登録されていません"
            description="右上の「メンバーを招待」から登録してください"
          />
        ) : (
          <MembersAdminList members={members} currentMemberId={session.user.member_id} />
        )}
      </div>
    </main>
  );
}
