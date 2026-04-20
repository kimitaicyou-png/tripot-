'use client';

import { useState } from 'react';

type TestCase = {
  id: string;
  name: string;
  category: 'unit' | 'integration' | 'e2e' | 'manual';
  status: 'not_run' | 'pass' | 'fail' | 'skip';
  assignee: string;
  lastRun?: string;
};

type Props = {
  testCases: TestCase[];
  onChange: (testCases: TestCase[]) => void;
};

const CATEGORY_LABEL: Record<TestCase['category'], string> = {
  unit:        'ユニット',
  integration: '結合',
  e2e:         'E2E',
  manual:      '手動',
};

const STATUS_STYLE: Record<TestCase['status'], string> = {
  not_run: 'bg-gray-100 text-gray-500',
  pass:    'bg-blue-50 text-blue-700 border border-blue-200',
  fail:    'bg-red-50 text-red-700 border border-red-200',
  skip:    'bg-gray-100 text-gray-500',
};

const STATUS_LABEL: Record<TestCase['status'], string> = {
  not_run: '未実行',
  pass:    'PASS',
  fail:    'FAIL',
  skip:    'SKIP',
};

export default function TestCases({ testCases, onChange }: Props) {
  const [generating, setGenerating] = useState(false);

  const handleStatusChange = (id: string, status: TestCase['status']) => {
    const today = new Date('2026-04-05').toISOString().slice(0, 10);
    onChange(testCases.map((t) =>
      t.id === id
        ? { ...t, status, lastRun: status !== 'not_run' ? today : t.lastRun }
        : t
    ));
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => setGenerating(false), 1500);
  };

  const passCount = testCases.filter((t) => t.status === 'pass').length;
  const failCount = testCases.filter((t) => t.status === 'fail').length;
  const runCount = testCases.filter((t) => t.status !== 'not_run').length;
  const passRate = runCount > 0 ? Math.round((passCount / runCount) * 100) : 0;

  const categoryGroups = (['unit', 'integration', 'e2e', 'manual'] as TestCase['category'][])
    .map((cat) => ({ category: cat, items: testCases.filter((t) => t.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">テストケース</span>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 font-semibold"
          >
            {generating ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                生成中...
              </span>
            ) : 'AIでテストケース生成'}
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-gray-500">{testCases.length}件</span>
          <span className="text-blue-700 font-semibold">{passCount} PASS</span>
          {failCount > 0 && <span className="text-red-700 font-semibold">{failCount} FAIL</span>}
          {runCount > 0 && (
            <span className="text-gray-600 font-semibold">合格率 {passRate}%</span>
          )}
        </div>
        {runCount > 0 && (
          <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${passRate}%` }}
            />
          </div>
        )}
      </div>

      {testCases.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">テストケースはありません</p>
      ) : (
        <div>
          {categoryGroups.map((group) => (
            <div key={group.category}>
              <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">{CATEGORY_LABEL[group.category]}</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {group.items.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="text-sm text-gray-900 font-semibold">{t.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {t.assignee && <span className="text-xs text-gray-500">{t.assignee}</span>}
                          {t.lastRun && <span className="text-xs text-gray-500">{t.lastRun}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value as TestCase['status'])}
                          className={`text-xs font-semibold px-2 py-1 rounded border-0 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer ${STATUS_STYLE[t.status]}`}
                        >
                          {(Object.keys(STATUS_LABEL) as TestCase['status'][]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export type { TestCase };

export const MOCK_TEST_CASES: TestCase[] = [];
