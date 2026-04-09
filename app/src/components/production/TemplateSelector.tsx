'use client';

import { useState } from 'react';
import type { ProductionCard, ProductionCardTask, Milestone } from '@/lib/stores/types';
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@/lib/constants/templates';

type Props = {
  card: ProductionCard;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
};

function buildTasksFromTemplate(tpl: ProjectTemplate): ProductionCardTask[] {
  return tpl.tasks.map((t, i) => ({
    id: `tsk_tpl_${Date.now()}_${i}`,
    title: t.title,
    status: 'todo' as const,
    assigneeType: t.assigneeType,
    estimatedCost: t.estimatedCost,
  }));
}

function buildMilestonesFromTemplate(tpl: ProjectTemplate): Milestone[] {
  const today = new Date();
  return tpl.milestones.map((m, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + m.offsetDays);
    return {
      id: `ms_tpl_${Date.now()}_${i}`,
      label: m.label,
      dueDate: d.toISOString().slice(0, 10),
      done: false,
    };
  });
}

export function TemplateSelector({ card, onUpdate }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const hasExisting = card.tasks.length > 0 || card.milestones.length > 0;

  const handleApply = () => {
    const tpl = PROJECT_TEMPLATES.find((t) => t.id === selected);
    if (!tpl) return;

    const newTasks = buildTasksFromTemplate(tpl);
    const newMilestones = buildMilestonesFromTemplate(tpl);

    onUpdate(card.id, {
      tasks: [...card.tasks, ...newTasks],
      milestones: [...card.milestones, ...newMilestones],
    });
    setSelected(null);
    setConfirming(false);
  };

  const handleClick = (tplId: string) => {
    setSelected(tplId);
    if (hasExisting) {
      setConfirming(true);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">テンプレートからタスク生成</h3>

      <div className="grid grid-cols-2 gap-2">
        {PROJECT_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => handleClick(tpl.id)}
            className={`text-left p-3 rounded-lg border transition-colors active:scale-[0.98] ${
              selected === tpl.id
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">{tpl.icon}</span>
              <span className="text-sm font-medium text-gray-900">{tpl.name}</span>
            </div>
            <p className="text-xs text-gray-500">
              {tpl.tasks.length}タスク・{tpl.milestones.length}マイルストーン
            </p>
          </button>
        ))}
      </div>

      {confirming && selected && (
        <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 space-y-2">
          <p className="text-xs text-amber-700">
            既にタスク {card.tasks.length}件・マイルストーン {card.milestones.length}件が存在します。
            テンプレートのタスクは既存に追加されます。
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setConfirming(false); setSelected(null); }}
              className="text-xs px-3 py-1.5 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 active:scale-[0.98]"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98]"
            >
              追加する
            </button>
          </div>
        </div>
      )}

      {!confirming && selected && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleApply}
            className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors"
          >
            タスクを生成
          </button>
        </div>
      )}
    </div>
  );
}
