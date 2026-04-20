'use client';

import { useState } from 'react';

const STEPS = [
  {
    icon: '📋',
    title: '案件を登録する',
    desc: 'アタックリストから名刺情報を入力。案件化したら案件管理で進捗を追跡。',
    bg: 'bg-blue-50',
  },
  {
    icon: '📝',
    title: '毎日の行動を入れる',
    desc: 'ダッシュボードから「今日のアクション」を確認。タスクをこなすだけでOK。',
    bg: 'bg-green-50',
  },
  {
    icon: '📊',
    title: '週次・月次は自動集計',
    desc: '報告書を書く必要なし。入力したデータが自動で週次・月次に吸い上がる。',
    bg: 'bg-amber-50',
  },
];

type Props = {
  memberName: string;
  onComplete: () => void;
};

export function OnboardingModal({ memberName, onComplete }: Props) {
  const [step, setStep] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 animate-[fade-in_200ms_ease-out]" />
      <div className="relative bg-white rounded-xl shadow-sm max-w-sm w-full p-6 z-10 animate-[scale-in_150ms_ease-out]">
        <div className="text-center mb-6">
          <p className="text-2xl mb-2">✨</p>
          <h2 className="text-lg font-semibold text-gray-900">ようこそ、{memberName}さん！</h2>
          <p className="text-xs text-gray-500 mt-1">Coaris AI の使い方を簡単にご紹介</p>
        </div>

        <div className={`${current.bg} rounded-lg p-5 mb-5`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{current.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-900">{current.title}</p>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">{current.desc}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === step ? 'bg-blue-600' : i < step ? 'bg-blue-300' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-xs px-3 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 active:scale-[0.98]"
              >
                戻る
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onComplete();
                } else {
                  setStep(step + 1);
                }
              }}
              className="text-xs px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors"
            >
              {isLast ? 'はじめる' : '次へ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
