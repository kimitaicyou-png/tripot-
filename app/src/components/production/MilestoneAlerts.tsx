'use client';

type MilestoneAlert = {
  id: string;
  projectName: string;
  milestoneName: string;
  dueDate: string;
  daysOverdue: number;
  assignee: string;
  impact: 'low' | 'medium' | 'high';
};

type Props = {
  alerts: MilestoneAlert[];
};

const IMPACT_LABEL: Record<MilestoneAlert['impact'], string> = {
  low:    '影響小',
  medium: '影響中',
  high:   '影響大',
};

const IMPACT_BADGE: Record<MilestoneAlert['impact'], string> = {
  low:    'bg-gray-100 text-gray-500',
  medium: 'bg-blue-50 text-blue-600 border border-blue-200',
  high:   'bg-red-50 text-red-600 border border-red-200',
};

const IMPACT_BORDER: Record<MilestoneAlert['impact'], string> = {
  low:    'border-l-gray-300',
  medium: 'border-l-blue-600',
  high:   'border-l-red-600',
};

export default function MilestoneAlerts({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-sm text-gray-500">遅延中のマイルストーンはありません</p>
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) {
      return impactOrder[a.impact] - impactOrder[b.impact];
    }
    return b.daysOverdue - a.daysOverdue;
  });

  const highCount = alerts.filter((a) => a.impact === 'high').length;
  const mediumCount = alerts.filter((a) => a.impact === 'medium').length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-red-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-widest">マイルストーン遅延アラート</span>
            <span className="text-xs font-semibold text-red-600">{alerts.length}件</span>
          </div>
          <div className="flex gap-3">
            {highCount > 0 && (
              <span className="text-xs font-semibold text-red-600">{highCount}件 影響大</span>
            )}
            {mediumCount > 0 && (
              <span className="text-xs font-semibold text-blue-600">{mediumCount}件 影響中</span>
            )}
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {sorted.map((alert) => (
          <div
            key={alert.id}
            className={`px-4 py-3 border-l-4 hover:bg-gray-50 ${IMPACT_BORDER[alert.impact]}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{alert.milestoneName}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${IMPACT_BADGE[alert.impact]}`}>
                    {IMPACT_LABEL[alert.impact]}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500">{alert.projectName}</span>
                  <span className="text-xs text-gray-500">担当: {alert.assignee}</span>
                  <span className="text-xs text-gray-500">
                    期日: {alert.dueDate.slice(5).replace('-', '/')}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold text-red-600 tabular-nums">{alert.daysOverdue}日遅延</p>
                <p className="text-xs text-gray-500">即対応が必要です</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { MilestoneAlert };

export const MOCK_MILESTONE_ALERTS: MilestoneAlert[] = [
  {
    id: 'ma1',
    projectName: '基幹システム開発',
    milestoneName: 'フロントエンド結合テスト完了',
    dueDate: '2026-03-31',
    daysOverdue: 5,
    assignee: '犬飼 智之',
    impact: 'high',
  },
  {
    id: 'ma2',
    projectName: 'ECサイトリニューアル',
    milestoneName: 'デザインカンプ最終承認',
    dueDate: '2026-04-02',
    daysOverdue: 3,
    assignee: 'クリエイトデザイン',
    impact: 'medium',
  },
  {
    id: 'ma3',
    projectName: '基幹システム開発',
    milestoneName: 'テスト仕様書レビュー',
    dueDate: '2026-04-04',
    daysOverdue: 1,
    assignee: '小野 崇',
    impact: 'low',
  },
];
