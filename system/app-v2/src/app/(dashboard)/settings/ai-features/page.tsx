import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, MessageCircle, Sun, AlertTriangle, ArrowRight, Mail, FileText, ListTodo, Wand2, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { auth } from '@/auth';

type AiFeature = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  where: string;
  whereHref: string;
  use: string;
};

const FEATURES: AiFeature[] = [
  {
    id: 'chat',
    icon: MessageCircle,
    title: 'コアリスAI チャット',
    description: '営業や案件についての相談、考え方の整理、なんでも質問できる対話 AI',
    where: '全画面 右下の青い丸ボタン',
    whereHref: '/',
    use: '思考を整理したい時、相談相手が欲しい時、判断に迷った時に話しかける。チャット履歴は今のところセッション限り。',
  },
  {
    id: 'morning-brief',
    icon: Sun,
    title: '朝ブリーフィング',
    description: '今日のメンバーの状況・案件の動き・注意点を AI が朝にまとめる',
    where: 'ホーム（個人ダッシュボード）の上部',
    whereHref: '/',
    use: '朝出社・始業時にホームを開いて、今日のフォーカス点を 30 秒で把握する。',
  },
  {
    id: 'risk-score',
    icon: AlertTriangle,
    title: '案件 失注リスク評価',
    description: '案件の状況・経過を読んで、失注リスクを 0-100 でスコアリング + 理由列挙',
    where: '案件詳細 → オーバービュー タブ',
    whereHref: '/deals',
    use: '長期停滞している案件・違和感がある案件を選び、ボタン1つでリスク要因を可視化。',
  },
  {
    id: 'next-action',
    icon: ArrowRight,
    title: '次の一手 提案',
    description: '案件の現状から、次に取るべき具体アクションを AI が提案',
    where: '案件詳細 → オーバービュー タブ',
    whereHref: '/deals',
    use: '何をすべきか迷った時、または部下にアドバイスする時の参考材料として。',
  },
  {
    id: 'generate-email',
    icon: Mail,
    title: 'メール下書き生成',
    description: '案件文脈と意図（お礼 / フォロー / 提案送付 / 価格相談 等 9種）を選んでメール本文を AI 生成',
    where: '案件詳細 → オーバービュー タブ',
    whereHref: '/deals',
    use: '顧客返信を書く時、ゼロから書かずに AI 下書きを編集してから送る。',
  },
  {
    id: 'generate-proposal',
    icon: FileText,
    title: '提案書スライド生成',
    description: '案件と議事録から、12-15 枚の提案書スライドを AI が構成',
    where: '案件詳細 → 提案書 タブ ／ 議事録 タブ',
    whereHref: '/deals',
    use: '初回提案書のたたき台を 1 分で生成、その後手動で磨き込む。',
  },
  {
    id: 'summarize-meeting',
    icon: FileText,
    title: '議事録要約',
    description: '議事録の長文から、決定事項・宿題・次回予定を構造化して抽出',
    where: '案件詳細 → 議事録 タブ',
    whereHref: '/deals',
    use: '長い議事録を後から読み返す時、または上司報告用にエッセンスを抽出する時。',
  },
  {
    id: 'generate-tasks',
    icon: ListTodo,
    title: '議事録 → タスク自動抽出',
    description: '議事録から「やるべきこと」を自動抽出してタスク候補としてプレビュー',
    where: '案件詳細 → 議事録 タブ',
    whereHref: '/deals',
    use: '議事録を取った直後、抜け漏れなくタスク化する補助。現状はプレビューのみ、保存は手動。',
  },
  {
    id: 'optimize-work',
    icon: Wand2,
    title: 'AI 工数最適化',
    description: '制作カードのタスクを分析し、AI 化で削減可能な時間と金額を試算',
    where: '制作カード詳細',
    whereHref: '/production',
    use: 'V1 業務ロジック結晶 #1。「AI で出来ることは AI で」哲学の数値化装置。',
  },
  {
    id: 'recommend-assignee',
    icon: Users,
    title: 'AI アサイン推薦',
    description: '案件 / 制作カードに最適なアサイン先を、スキル・稼働・速度・品質・単価で総合スコア化',
    where: '制作カード詳細',
    whereHref: '/production',
    use: 'V1 業務ロジック結晶 #2。アサイン会議の準備材料として、AI スコアを参考にする。',
  },
];

export default async function AiFeaturesGuidePage() {
  const session = await auth();
  if (!session?.user?.member_id) redirect('/login');

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        <Link href="/settings" className="inline-flex items-center gap-1 text-gray-700 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-3.5 h-3.5" />
          設定
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">AI 機能ガイド</h1>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto space-y-6">
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-sm text-blue-900">
            tripot v2 で稼働中の AI 機能 <span className="font-semibold">10 機能</span>。各機能の場所と使いどころをまとめています。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <Link
                key={f.id}
                href={f.whereHref}
                className="block bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-gray-400 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-blue-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900">{f.title}</h2>
                    <p className="text-xs text-gray-700 mt-1">{f.description}</p>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">場所</span>：{f.where}
                      </p>
                      <p className="text-xs text-gray-500">
                        <span className="font-medium text-gray-700">使う時</span>：{f.use}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-700">
            AI 利用状況・コスト監視は <Link href="/settings/ai-usage" className="text-blue-700 hover:text-blue-900 underline">AI 利用状況</Link> ページから確認できます。
          </p>
        </div>
      </div>
    </main>
  );
}
