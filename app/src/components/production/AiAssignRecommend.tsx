'use client';

import { useState, useMemo } from 'react';

type TaskContext = {
  taskName: string;
  requiredSkills: string[];
  estimatedHours: number;
  deadline: string;
};

type ResourceOption = {
  id: string;
  name: string;
  type: 'inhouse' | 'outsource';
  role: string;
  skills: string[];
  loadRate: number;
  avgSpeedRate: number;
  qualityScore: number;
  unitPrice: number;
};

type Props = {
  task: TaskContext;
  resources: ResourceOption[];
  onAssign: (resourceId: string) => void;
};

export const MOCK_RESOURCES: ResourceOption[] = [
  { id: 'inukai', name: '犬飼 智之', type: 'inhouse', role: 'エンジニア', skills: ['Next.js', 'TypeScript', 'API設計', 'Supabase'], loadRate: 90, avgSpeedRate: 92, qualityScore: 4.9, unitPrice: 750000 },
  { id: 'izumi', name: '和泉 阿委璃', type: 'inhouse', role: 'ディレクター', skills: ['React', 'デザイン', 'PM'], loadRate: 40, avgSpeedRate: 96, qualityScore: 4.7, unitPrice: 700000 },
  { id: 'tech-bridge', name: 'テックブリッジ', type: 'outsource', role: 'インフラ/DevOps', skills: ['AWS', 'Docker', 'Terraform'], loadRate: 25, avgSpeedRate: 98, qualityScore: 4.6, unitPrice: 850000 },
  { id: 'create-design', name: 'クリエイトデザイン', type: 'outsource', role: 'UIデザイン', skills: ['Figma', 'LP', 'コーポレートサイト'], loadRate: 50, avgSpeedRate: 115, qualityScore: 4.0, unitPrice: 600000 },
];

export const MOCK_TASK: TaskContext = {
  taskName: '学習進捗ダッシュボード',
  requiredSkills: ['Next.js', 'TypeScript'],
  estimatedHours: 80,
  deadline: '2026-05-09',
};

function calcScore(resource: ResourceOption, task: TaskContext): number {
  let score = 0;

  const matchedSkills = task.requiredSkills.filter((s) => resource.skills.includes(s));
  score += matchedSkills.length * 30;

  if (resource.loadRate < 50) {
    score += 20;
  } else if (resource.loadRate <= 80) {
    score += 10;
  } else {
    score -= 20;
  }

  if (resource.avgSpeedRate < 100) {
    score += 15;
  }

  if (resource.qualityScore >= 4.5) {
    score += 10;
  }

  const allPrices = MOCK_RESOURCES.map((r) => r.unitPrice);
  const minPrice = Math.min(...allPrices);
  if (resource.unitPrice === minPrice) {
    score += 5;
  }

  return score;
}

function buildReason(resource: ResourceOption, task: TaskContext, rank: number): string {
  const matchedSkills = task.requiredSkills.filter((s) => resource.skills.includes(s));
  const isFullMatch = matchedSkills.length === task.requiredSkills.length;

  if (rank === 1) {
    if (resource.loadRate > 80) {
      return `稼働が高めだが最もスキルマッチ`;
    }
    return `スキルマッチ・稼働バランスが最良`;
  }

  if (resource.loadRate < 50) {
    return `稼働に余裕あり。育成も兼ねて`;
  }

  if (resource.type === 'outsource') {
    return `外注。コスト¥${(resource.unitPrice / 10000).toFixed(0)}万/月`;
  }

  if (!isFullMatch) {
    return `部分マッチ。サポート体制で補完可`;
  }

  return `バランス型。安定したアウトプット`;
}

function StarRating({ value }: { value: number }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className="text-xs text-gray-500">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {' '}
      <span className="font-medium text-gray-700">{value.toFixed(1)}</span>
    </span>
  );
}

function SkillMatchBadge({ skills, required }: { skills: string[]; required: string[] }) {
  const matched = required.filter((s) => skills.includes(s));
  const partial = skills.some((s) => required.some((r) => s !== r && s.toLowerCase().includes(r.toLowerCase())));

  if (matched.length === required.length) {
    return <span className="text-green-600 text-xs font-medium">スキル✓</span>;
  }
  if (matched.length > 0 || partial) {
    return <span className="text-yellow-600 text-xs font-medium">スキル△</span>;
  }
  return <span className="text-gray-500 text-xs font-medium">スキル×</span>;
}

export function AiAssignRecommend({ task, resources, onAssign }: Props) {
  const [assignedId, setAssignedId] = useState<string | null>(null);

  const ranked = useMemo(() => {
    return resources
      .map((r) => ({ ...r, score: calcScore(r, task) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [resources, task]);

  const handleAssign = (id: string) => {
    setAssignedId(id);
    onAssign(id);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white w-full max-w-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-gray-900">AI推薦</span>
      </div>

      <div className="mb-4 space-y-1">
        <p className="text-sm text-gray-700">
          <span className="text-gray-500">タスク:</span>{' '}
          <span className="font-medium">{task.taskName}</span>
        </p>
        <p className="text-sm text-gray-700">
          <span className="text-gray-500">必要スキル:</span>{' '}
          {task.requiredSkills.join(', ')}
        </p>
        <p className="text-sm text-gray-700">
          <span className="text-gray-500">想定工数:</span>{' '}
          {task.estimatedHours}h &nbsp;
          <span className="text-gray-500">期日:</span>{' '}
          {task.deadline}
        </p>
      </div>

      <div className="space-y-3">
        {ranked.map((resource, index) => {
          const matchedSkills = task.requiredSkills.filter((s) => resource.skills.includes(s));
          const reason = buildReason(resource, task, index + 1);
          const isAssigned = assignedId === resource.id;

          return (
            <div
              key={resource.id}
              className={`rounded-lg border p-3 transition-colors ${
                isAssigned
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">推薦{index + 1}</span>
                    <span className="font-semibold text-gray-900 text-sm">{resource.name}</span>
                    <span className="text-blue-600 font-semibold text-sm">
                      スコア{resource.score}
                    </span>
                    {resource.type === 'outsource' && (
                      <span className="text-xs bg-gray-200 text-gray-600 rounded px-1.5 py-0.5">
                        外注
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex items-center gap-2 flex-wrap text-xs text-gray-600">
                    <SkillMatchBadge skills={resource.skills} required={task.requiredSkills} />
                    <span>{matchedSkills.length > 0 ? matchedSkills.join(', ') : resource.skills[0]}</span>
                  </div>

                  <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className={`text-xs font-medium ${resource.loadRate > 80 ? 'text-red-600' : resource.loadRate < 50 ? 'text-green-600' : 'text-gray-600'}`}>
                      稼働{resource.loadRate}%
                      {resource.loadRate > 80 ? ' ⚠' : resource.loadRate < 50 ? ' 空き' : ''}
                    </span>
                    <span className="text-xs text-gray-500">
                      速度 <StarRating value={resource.avgSpeedRate / 20} />
                    </span>
                    <span className="text-xs text-gray-500">
                      品質 <StarRating value={resource.qualityScore} />
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-gray-500">→ {reason}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        {ranked.slice(0, 2).map((resource) => {
          const isAssigned = assignedId === resource.id;
          return (
            <button
              key={resource.id}
              onClick={() => handleAssign(resource.id)}
              disabled={assignedId !== null}
              className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                isAssigned
                  ? 'bg-blue-600 text-white cursor-default'
                  : assignedId !== null
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isAssigned ? `${resource.name} アサイン済` : `${resource.name}をアサイン`}
            </button>
          );
        })}
        {assignedId !== null && (
          <button
            onClick={() => setAssignedId(null)}
            className="px-3 py-2 rounded text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 hover:border-gray-300"
          >
            取り消し
          </button>
        )}
      </div>
    </div>
  );
}
