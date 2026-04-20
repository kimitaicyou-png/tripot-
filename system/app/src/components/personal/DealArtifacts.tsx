'use client';

type DealArtifact = {
  proposal: boolean;
  estimate: boolean;
  budget: boolean;
  requirement: boolean;
  schedule: boolean;
};

type Props = {
  artifacts: DealArtifact;
  grossMarginRate?: number;
  onView?: (type: 'proposal' | 'estimate' | 'budget' | 'requirement') => void;
};

type ArtifactItem = {
  key: keyof DealArtifact;
  icon: string;
  label: string;
  viewKey?: 'proposal' | 'estimate' | 'budget' | 'requirement';
};

const ARTIFACT_ITEMS: ArtifactItem[] = [
  { key: 'proposal',    icon: '📄', label: '提案書',       viewKey: 'proposal' },
  { key: 'estimate',    icon: '📋', label: '見積書',       viewKey: 'estimate' },
  { key: 'budget',      icon: '💰', label: '予算',         viewKey: 'budget' },
  { key: 'requirement', icon: '📝', label: '要件定義',     viewKey: 'requirement' },
  { key: 'schedule',    icon: '📅', label: 'スケジュール' },
];

export default function DealArtifacts({ artifacts, grossMarginRate, onView }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-1">
      <p className="text-xs font-semibold text-gray-500 mb-2">成果物</p>
      {ARTIFACT_ITEMS.map((item) => {
        const done = artifacts[item.key];
        return (
          <div key={item.key} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5">
              <span>{item.icon}</span>
              <span className={done ? 'text-gray-900' : 'text-gray-500'}>{item.label}</span>
              {done ? (
                <span className="text-blue-600 font-semibold">✓</span>
              ) : (
                <span className="text-gray-500">○ 未作成</span>
              )}
              {item.key === 'budget' && done && grossMarginRate !== undefined && (
                <span className="text-gray-500 text-xs">粗利{grossMarginRate}%</span>
              )}
            </div>
            {done && item.viewKey && onView && (
              <button
                type="button"
                onClick={() => onView(item.viewKey!)}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                表示
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export type { DealArtifact };

export const MOCK_ARTIFACTS: Record<string, DealArtifact> = {};

export const MOCK_GROSS_MARGIN_RATES: Record<string, number> = {};
