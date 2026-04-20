'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Quest = {
  id: string;
  icon: string;
  title: string;
  description: string;
  hint: string;
  href: string;
  buttonLabel: string;
  reward: string;
};

const QUESTS: Quest[] = [
  {
    id: 'q1_dashboard',
    icon: '🏠',
    title: 'ホーム画面を見てみよう',
    description: 'まずは自分のダッシュボードを開いてみよう。売上達成率やアクションリストが見えるよ。',
    hint: '左のサイドバーの「ダッシュボード」をクリック！',
    href: '/home',
    buttonLabel: 'ダッシュボードへ',
    reward: '冒険者の目覚め',
  },
  {
    id: 'q2_create_deal',
    icon: '📋',
    title: '最初の案件を登録しよう',
    description: '案件管理ページで「+ 新規案件」ボタンを押して、お客様名・案件名・金額を入れてみよう。',
    hint: 'クライアント名と案件名は必須。金額は後から変えてOK！',
    href: '/deals',
    buttonLabel: '案件管理へ',
    reward: 'はじめての一歩',
  },
  {
    id: 'q3_quick_input',
    icon: '📈',
    title: '今日の進捗を入れよう',
    description: 'ダッシュボードの青いカード「今日の進捗を入れる」から、商談したことや売上を記録しよう。',
    hint: '「商談した」→ 案件を選んで → メモを書いて → 記録する！',
    href: '/home',
    buttonLabel: 'ダッシュボードへ',
    reward: '行動の戦士',
  },
  {
    id: 'q4_minutes',
    icon: '🎤',
    title: 'AIで議事録を作ろう',
    description: '案件詳細の「打合せ」タブで、メモを書いて「AIで議事録に整形」を押してみよう。走り書きでOK！',
    hint: '音声入力もできるよ。Chrome推奨。',
    href: '/deals',
    buttonLabel: '案件管理へ',
    reward: 'AI使い見習い',
  },
  {
    id: 'q5_proposal',
    icon: '📝',
    title: 'AIで提案書を作ろう',
    description: '案件詳細の「提案書」タブで「AIで生成」ボタンを押すと、案件情報から自動で提案書ができあがる！',
    hint: '議事録やニーズが溜まっていると、より精度の高い提案書が生成されるよ。',
    href: '/deals',
    buttonLabel: '案件管理へ',
    reward: '提案マスター',
  },
  {
    id: 'q6_photo_deal',
    icon: '📸',
    title: '名刺から案件を作ろう',
    description: '案件管理の「インポート」ボタンから、名刺の写真を撮るだけで顧客情報が自動登録されるよ。',
    hint: 'スマホのカメラで名刺を撮影 → AIが読み取り → 案件に変換！',
    href: '/deals',
    buttonLabel: 'インポートへ',
    reward: 'デジタル名刺マイスター',
  },
  {
    id: 'q7_weekly',
    icon: '📊',
    title: '週次ダッシュボードを見よう',
    description: 'チーム全体の着地見込み・個人別実績・TODOが一目でわかる。毎週月曜に確認しよう。',
    hint: '自分の数字だけじゃなく、チーム全体の流れを見るのがコツ！',
    href: '/weekly',
    buttonLabel: '週次へ',
    reward: '経営の目覚め',
  },
  {
    id: 'q8_monthly',
    icon: '📈',
    title: '月次報告会を体験しよう',
    description: '月次ダッシュボードでP/L予実を見て、「報告会スライド生成」を押すと…AIが月次報告を作ってくれる！',
    hint: '事業計画（/budget）に予算を入れておくと、予実比較ができるよ。',
    href: '/monthly',
    buttonLabel: '月次へ',
    reward: '報告いらず',
  },
];

const RANKS = [
  { min: 0, label: '新人冒険者', icon: '🌱', color: 'from-gray-100 to-gray-200 text-gray-700' },
  { min: 2, label: '見習い営業', icon: '⚔️', color: 'from-blue-50 to-blue-100 text-blue-700' },
  { min: 4, label: '一人前の戦士', icon: '🛡️', color: 'from-emerald-50 to-emerald-100 text-emerald-700' },
  { min: 6, label: 'AI使いの魔法使い', icon: '🧙', color: 'from-purple-50 to-purple-100 text-purple-700' },
  { min: 8, label: '伝説の営業マスター', icon: '👑', color: 'from-amber-50 to-amber-100 text-amber-700' },
];

const STORAGE_KEY = 'tripot_tutorial_progress';

function loadProgress(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function saveProgress(set: Set<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

function getRank(count: number) {
  return [...RANKS].reverse().find((r) => count >= r.min) ?? RANKS[0];
}

function ConfettiEffect() {
  const [particles] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random(),
      color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'][i % 6],
      size: 6 + Math.random() * 6,
    }))
  );

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-bounce"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

function QuestCard({
  quest,
  index,
  done,
  isNext,
  onComplete,
  onNavigate,
}: {
  quest: Quest;
  index: number;
  done: boolean;
  isNext: boolean;
  onComplete: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className={`relative border rounded-2xl p-5 transition-all duration-300 ${
      done
        ? 'bg-emerald-50 border-emerald-200'
        : isNext
          ? 'bg-white border-blue-300 shadow-sm ring-2 ring-blue-100'
          : 'bg-gray-50 border-gray-200 opacity-60'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
          done ? 'bg-emerald-100' : isNext ? 'bg-blue-100' : 'bg-gray-100'
        }`}>
          {done ? '✅' : quest.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              done
                ? 'bg-emerald-100 text-emerald-700'
                : isNext
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-500'
            }`}>
              Quest {index + 1}
            </span>
            {done && (
              <span className="text-xs font-semibold text-emerald-600">
                {quest.reward} 獲得！
              </span>
            )}
          </div>

          <h3 className={`text-base font-semibold mb-1 ${done ? 'text-emerald-800' : 'text-gray-900'}`}>
            {quest.title}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{quest.description}</p>

          {isNext && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">ヒント:</span> {quest.hint}
              </p>
            </div>
          )}

          {!done && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onNavigate}
                className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl active:scale-[0.98] transition-all hover:bg-gray-50"
              >
                {quest.buttonLabel}
              </button>
              <button
                onClick={onComplete}
                className={`px-4 py-2 text-sm font-semibold rounded-xl active:scale-[0.98] transition-all ${
                  isNext
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                クリア！
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuidePage() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompleted(loadProgress());
    setMounted(true);
  }, []);

  const completedCount = completed.size;
  const totalCount = QUESTS.length;
  const pct = Math.round((completedCount / totalCount) * 100);
  const rank = getRank(completedCount);
  const nextQuestIndex = QUESTS.findIndex((q) => !completed.has(q.id));

  const handleComplete = (questId: string) => {
    const next = new Set(completed);
    next.add(questId);
    setCompleted(next);
    saveProgress(next);
    setJustCompleted(questId);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
    setTimeout(() => setJustCompleted(null), 3000);
  };

  const handleReset = () => {
    setCompleted(new Set());
    saveProgress(new Set());
  };

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-32 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      {showConfetti && <ConfettiEffect />}

      {justCompleted && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-full shadow-sm text-sm font-semibold flex items-center gap-2 animate-bounce">
          <span className="text-lg">🎉</span>
          クエストクリア！ 「{QUESTS.find((q) => q.id === justCompleted)?.reward}」を獲得！
        </div>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{rank.icon}</span>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">はじめてガイド</h1>
            <p className="text-sm text-gray-500">クエストをクリアしてシステムをマスターしよう！</p>
          </div>
        </div>
      </div>

      <div className={`bg-gradient-to-r ${rank.color} rounded-2xl p-5 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-semibold opacity-70 uppercase tracking-widest">現在のランク</p>
            <p className="text-lg font-semibold mt-0.5">{rank.icon} {rank.label}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">{completedCount}<span className="text-base opacity-60">/{totalCount}</span></p>
            <p className="text-xs opacity-70">クエスト達成</p>
          </div>
        </div>
        <div className="w-full bg-white/40 rounded-full h-2.5 overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs opacity-60">
          <span>0%</span>
          <span>{pct}% 達成</span>
          <span>100%</span>
        </div>
      </div>

      {completedCount === totalCount && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 mb-6 text-center">
          <span className="text-5xl block mb-3">🏆</span>
          <h2 className="text-lg font-semibold text-amber-900 mb-1">全クエスト制覇！</h2>
          <p className="text-sm text-amber-700 mb-4">
            おめでとうございます！あなたは「伝説の営業マスター」の称号を手に入れました。
            <br />もうこのシステムを自在に使いこなせるはず！
          </p>
          <button
            onClick={handleReset}
            className="text-xs text-amber-600 underline active:scale-[0.98]"
          >
            最初からやり直す
          </button>
        </div>
      )}

      <div className="space-y-3">
        {QUESTS.map((quest, i) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            index={i}
            done={completed.has(quest.id)}
            isNext={i === nextQuestIndex}
            onComplete={() => handleComplete(quest.id)}
            onNavigate={() => {
              if (quest.href === '/home') {
                router.push('/home/toki');
              } else {
                router.push(quest.href);
              }
            }}
          />
        ))}
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">獲得した称号</h3>
        <div className="flex flex-wrap gap-2">
          {QUESTS.filter((q) => completed.has(q.id)).map((q) => (
            <span
              key={q.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-700"
            >
              {q.icon} {q.reward}
            </span>
          ))}
          {completedCount === 0 && (
            <p className="text-xs text-gray-500">まだ称号がありません。最初のクエストをクリアしよう！</p>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          困ったら隊長（土岐）に聞いてね！ いつでもこのページに戻れます。
        </p>
      </div>
    </div>
  );
}
