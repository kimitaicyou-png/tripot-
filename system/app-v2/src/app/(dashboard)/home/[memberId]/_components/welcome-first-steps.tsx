import Link from 'next/link';
import type { Route } from 'next';
import { Users, Briefcase, FileText, Sparkles, ArrowRight } from 'lucide-react';

/**
 * tripot 初日メンバー向けウェルカム画面。
 *
 * 条件：進行中案件 0 件 && 残タスク 0 件のとき、通常ホーム（巨大 ¥0 + KPI カード群）の
 * 代わりに表示される。tripot 固有の業務フロー（受託開発: 顧客 → 案件 → 議事録 → AI →
 * 提案/見積 → 受注 → 制作 → 請求）の入口だけを最短 3 ステップに圧縮する。
 *
 * 汎用 SFA のオンボーディング（lead/opportunity 等の汎用語）を流用しない。
 * tripot の用語（見込み・proposing・粗利・議事録 AI）で書く。
 */
export function WelcomeFirstSteps({ memberName }: { memberName: string }) {
  return (
    <section className="max-w-3xl">
      {/* ヘッダー */}
      <div className="mb-10">
        <p className="text-sm text-gray-700">{memberName} のホーム</p>
        <h1 className="font-semibold text-3xl md:text-4xl text-gray-900 tracking-tight mt-2">
          ようこそ。
          <br className="md:hidden" />
          最初の 1 案件、ここから 2 分で立ち上がります。
        </h1>
        <p className="text-sm text-gray-700 mt-4 leading-relaxed">
          tripot は受託開発の営業フローを 1 本に通します。
          顧客 → 案件 → 議事録 → AI が提案・見積の叩き台を作る → 受注 → 制作 → 請求。
          まずは入口の 3 ステップだけ。完璧じゃなくて大丈夫、後で全部直せます。
        </p>
      </div>

      {/* 3 ステップ */}
      <ol className="space-y-3">
        <li className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-semibold shrink-0">
              1
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-4 h-4 text-gray-700" />
                <p className="font-semibold text-gray-900">顧客を 1 社だけ登録</p>
                <span className="text-xs font-mono tabular-nums text-gray-500 ml-auto">30 秒</span>
              </div>
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                過去の取引先・名刺の山から 1 件で OK。会社名と業界だけで動きます。
              </p>
              <Link
                href={'/customers/new' as Route}
                className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:scale-[0.98] rounded-lg transition-all duration-150"
              >
                顧客を登録する
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </li>

        <li className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-semibold shrink-0">
              2
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Briefcase className="w-4 h-4 text-gray-700" />
                <p className="font-semibold text-gray-900">案件を 1 本作る</p>
                <span className="text-xs font-mono tabular-nums text-gray-500 ml-auto">1 分</span>
              </div>
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                ステージは「見込み」で OK。後で「提案中 → 受注 → 制作 → 入金」に動かしていきます。
                予算未定でも入力可。
              </p>
              <Link
                href={'/deals/new' as Route}
                className="inline-flex items-center gap-1.5 mt-3 px-3.5 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 active:scale-[0.98] rounded-lg transition-all duration-150"
              >
                案件を作る
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </li>

        <li className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gray-900 text-white flex items-center justify-center font-semibold shrink-0">
              3
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <FileText className="w-4 h-4 text-gray-700" />
                <p className="font-semibold text-gray-900">議事録を 1 件貼る</p>
                <span className="text-xs font-mono tabular-nums text-gray-500 ml-auto">30 秒</span>
              </div>
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
                電話メモ・商談メモ・チャットの貼り付けで OK。
                <span className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 bg-gray-100 rounded">
                  <Sparkles className="w-3 h-3" />
                  AI
                </span>
                が要約・顧客ニーズ抽出・提案書叩き台・見積明細まで自動で作ります。
                <strong className="text-gray-900 font-semibold">あなたは「確認して直す」だけ</strong>。
              </p>
              <p className="text-xs text-gray-500 mt-2">
                ※ 案件を作った後、案件詳細の「議事録」タブから貼り付けます
              </p>
            </div>
          </div>
        </li>
      </ol>

      {/* ヒント帯 */}
      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-gray-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-900">tripot の特徴：AI が叩き台を作ります</p>
            <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">
              議事録を 1 本貼れば、見積（5〜7 行の明細 + 工数 + 単価）も提案書も
              AI が下書きします。ゼロから書く時間を、確認と仕上げに使えます。
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 leading-relaxed">
        進行中の案件が 1 件でも入ると、このホームは「売上・粗利・ファネル・コミットメント」の
        運用 view に切り替わります。今日はここまでで充分です。
      </p>
    </section>
  );
}
