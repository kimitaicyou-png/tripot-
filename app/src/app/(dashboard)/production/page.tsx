'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { formatYen } from '@/lib/format';
import { loadProductionCards, fetchProductionCards, updateProductionCard, parseRequirementItems, PROJECT_TEMPLATES, type ProductionCard, type ProductionCardTask, type ProductionNextAction, type ProductionAction, type ProductionActionType, type ProductionAttachment, type ProductionAttachmentKind, type RequirementItem, type RevenueAmendment, type SentLogEntry, type ProjectTemplate } from '@/lib/productionCards';
import { MEMBERS as ALL_MEMBERS } from '@/lib/currentMember';
import NextAction, { type NextActionData } from '@/components/personal/NextAction';
import { VENDORS } from '@/lib/data/vendors';

function yen(v: number): string {
  if (v === 0) return '—';
  return formatYen(v);
}

const TODAY = new Date('2026-04-05');

const PHASE_LABELS: Record<ProductionCard['phase'], string> = {
  kickoff: 'キックオフ前',
  requirements: '要件整理',
  design: '設計中',
  development: '開発中',
  test: 'テスト中',
  release: 'リリース',
  operation: '運用',
};

const RISK_COLORS: Record<ProductionCard['risk'], string> = {
  none: 'bg-gray-100 text-gray-500 border-gray-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-300',
  high: 'bg-red-50 text-red-700 border-red-300',
};

const RISK_LABELS: Record<ProductionCard['risk'], string> = {
  none: 'リスクなし',
  low: 'リスク低',
  medium: 'リスク中',
  high: 'リスク高',
};

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - TODAY.getTime()) / 86400000);
}

function getDeliveryDate(card: ProductionCard): string {
  const lastMilestone = [...(card.milestones ?? [])].reverse().find((m) => m.dueDate);
  return lastMilestone?.dueDate || '';
}

type View = 'kanban' | 'list' | 'gantt';
type PhaseFilter = 'all' | ProductionCard['phase'];

const PHASE_ORDER: ProductionCard['phase'][] = ['kickoff', 'requirements', 'design', 'development', 'test', 'release', 'operation'];

export default function ProductionDashboardPage() {
  const [cards, setCards] = useState<ProductionCard[]>([]);
  const [view, setView] = useState<View>('kanban');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [tasksGenerating, setTasksGenerating] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');
  const [hideInactive, setHideInactive] = useState(false);
  const [showBudgetOverview, setShowBudgetOverview] = useState(false);

  useEffect(() => {
    fetchProductionCards().then(setCards);
    fetchProductionCards().then(setCards);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === '1') setView('kanban');
      if (e.key === '2') setView('list');
      if (e.key === '3') setView('gantt');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const movePhase = async (cardId: string, to: ProductionCard['phase']) => {
    await updateProductionCard(cardId, { phase: to });
    fetchProductionCards().then(setCards);
  };

  const setNextActionFor = async (cardId: string, next: ProductionNextAction | null) => {
    await updateProductionCard(cardId, { nextAction: next });
    fetchProductionCards().then(setCards);
  };

  const updateTaskFor = async (cardId: string, taskId: string, patch: Partial<ProductionCardTask>) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const now = new Date().toISOString().slice(0, 10);
    const tasks = (card.tasks ?? []).map((t) => {
      if (t.id !== taskId) return t;
      const merged = { ...t, ...patch };
      if (patch.status === 'done' && !t.completedAt) merged.completedAt = now;
      if (patch.status === 'doing' && !t.startedAt) merged.startedAt = now;
      if (patch.status !== 'done' && patch.status !== undefined) merged.completedAt = undefined;
      return merged;
    });
    const updatePatch: Partial<ProductionCard> = { tasks };
    if (patch.status !== undefined) {
      updatePatch.progress = tasks.length > 0
        ? Math.round(tasks.filter((t) => t.status === 'done').length / tasks.length * 100)
        : card.progress ?? 0;
    }
    await updateProductionCard(cardId, updatePatch);
    fetchProductionCards().then(setCards);
  };

  const addTaskFor = async (cardId: string, title: string, assigneeId?: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card || !title.trim()) return;
    const newTask: ProductionCardTask = {
      id: `t_${cardId}_${Date.now()}`,
      title: title.trim(),
      status: 'todo',
      assigneeId,
    };
    await updateProductionCard(cardId, { tasks: [...(card.tasks ?? []), newTask] });
    fetchProductionCards().then(setCards);
  };

  const removeTaskFor = async (cardId: string, taskId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    await updateProductionCard(cardId, { tasks: (card.tasks ?? []).filter((t) => t.id !== taskId) });
    fetchProductionCards().then(setCards);
  };

  const addActionFor = async (cardId: string, action: Omit<ProductionAction, 'id' | 'createdAt'>) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    const entry: ProductionAction = {
      ...action,
      id: `act_${cardId}_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const actions = [entry, ...(card.actions ?? [])];
    await updateProductionCard(cardId, { actions });
    fetchProductionCards().then(setCards);
  };

  const removeActionFor = async (cardId: string, actionId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    await updateProductionCard(cardId, { actions: (card.actions ?? []).filter((a) => a.id !== actionId) });
    fetchProductionCards().then(setCards);
  };

  const updateCardFields = async (cardId: string, patch: Partial<ProductionCard>) => {
    await updateProductionCard(cardId, patch);
    fetchProductionCards().then(setCards);
  };

  const handleGenerateTasks = (card: ProductionCard) => {
    setTasksGenerating(card.id);
    setTimeout(async () => {
      const lines = (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement
        .split('\n')
        .filter((l) => l.trim().startsWith('- ') || /^\d+\./.test(l.trim()))
        .slice(0, 6);
      const fallback = ['要件確認MTG', '画面設計', 'API設計', '実装', 'テスト', 'リリース'];
      const titles = lines.length > 0 ? lines.map((l) => l.replace(/^[-\d.)\s]+/, '').trim()) : fallback;
      const newTasks = titles.map((title, i) => ({
        id: `t_${card.id}_${i}`,
        title,
        status: 'todo' as const,
        assigneeId: i === 0 ? (card.pmId ?? '') : (card.teamMemberIds ?? [])[i % Math.max((card.teamMemberIds ?? []).length, 1)] ?? (card.pmId ?? ''),
      }));
      await updateProductionCard(card.id, { tasks: newTasks, phase: 'requirements' });
      fetchProductionCards().then(setCards);
      setTasksGenerating(null);
    }, 900);
  };

  const filtered = useMemo(() => {
    let result = cards;
    if (hideInactive) result = result.filter((c) => c.status === 'active');
    if (phaseFilter !== 'all') result = result.filter((c) => c.phase === phaseFilter);
    return result;
  }, [cards, phaseFilter, hideInactive]);

  const totalRevenue = cards.reduce((s, c) => s + (c.amount ?? 0) + (c.amendments ?? []).reduce((a, x) => a + x.amount, 0), 0);
  const totalBudget = cards.reduce((s, c) => s + (c.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget, 0);
  const grossProfit = totalRevenue - totalBudget;
  const grossMarginRate = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const avgProgress = cards.length > 0 ? Math.round(cards.reduce((s, c) => s + (c.progress ?? 0), 0) / cards.length) : 0;

  const alerts: { level: 'red' | 'amber'; msg: string }[] = [];
  cards.forEach((c) => {
    const incompleteMilestones = (c.milestones ?? []).filter((m) => !m.done);
    const lastIncomplete = [...incompleteMilestones].reverse().find((m) => m.dueDate);
    const deliveryDate = lastIncomplete?.dueDate || '';
    const d = daysUntil(deliveryDate);
    if (d !== null && d >= 0 && d <= 14) alerts.push({ level: 'red', msg: `【納期迫る】${c.dealName} — 残${d}日` });
    if (c.risk === 'high') alerts.push({ level: 'red', msg: `【リスク高】${c.dealName}` });
    else if (c.risk === 'medium') alerts.push({ level: 'amber', msg: `【リスク中】${c.dealName}` });
    if ((c.tasks ?? []).length === 0) alerts.push({ level: 'amber', msg: `【未着手】${c.dealName} — タスク未生成` });
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">トライポット</p>
          <h1 className="text-lg font-semibold text-gray-900 leading-tight">制作管理ダッシュボード</h1>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">2026年4月5日</p>
          <p className="text-xs text-gray-500">{cards.length > 0 ? `案件 ${cards.length} 件` : '引き渡し案件なし'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">💰 粗利合計</p>
          <p className={`text-2xl font-semibold tabular-nums ${grossMarginRate >= 40 ? 'text-blue-600' : grossMarginRate >= 20 ? 'text-gray-900' : 'text-red-600'}`}>
            {yen(grossProfit)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">粗利率 <span className="font-semibold">{grossMarginRate}%</span></p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">📊 売上合計</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{yen(totalRevenue)}</p>
          <p className="text-xs text-gray-500 mt-0.5">予算 {yen(totalBudget)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">📈 平均進捗</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{avgProgress}%</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${avgProgress}%` }} />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">⚠ 要注意</p>
          <p className={`text-2xl font-semibold tabular-nums ${alerts.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>{alerts.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">件のアラート</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <span className="text-sm font-semibold text-red-700">🚨 アラート ({alerts.length})</span>
          </div>
          <div className="p-2 space-y-1 max-h-40 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${a.level === 'red' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                {a.msg}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-white">
          <button
            onClick={() => setView('kanban')}
            title="カンバン (1)"
            className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${view === 'kanban' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            🗂 カンバン
            <kbd className={`text-xs font-normal rounded px-1 ${view === 'kanban' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>1</kbd>
          </button>
          <button
            onClick={() => setView('list')}
            title="一覧 (2)"
            className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${view === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            📋 一覧
            <kbd className={`text-xs font-normal rounded px-1 ${view === 'list' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>2</kbd>
          </button>
          <button
            onClick={() => setView('gantt')}
            title="ガント (3)"
            className={`px-4 py-2 text-sm font-semibold transition-colors flex items-center gap-2 ${view === 'gantt' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            📅 ガント
            <kbd className={`text-xs font-normal rounded px-1 ${view === 'gantt' ? 'bg-white/20' : 'bg-gray-100 text-gray-500'}`}>3</kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {cards.length > 0 && (
            <select
              value={phaseFilter}
              onChange={(e) => setPhaseFilter(e.target.value as PhaseFilter)}
              className="text-sm font-semibold border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              <option value="all">全フェーズ ({cards.length})</option>
              {(Object.keys(PHASE_LABELS) as ProductionCard['phase'][]).map((p) => {
                const count = cards.filter((c) => c.phase === p).length;
                if (count === 0) return null;
                return <option key={p} value={p}>{PHASE_LABELS[p]} ({count})</option>;
              })}
            </select>
          )}
          <button
            onClick={() => setHideInactive(!hideInactive)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border active:scale-[0.98] ${hideInactive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200'}`}
          >{hideInactive ? '✓ 完了/中止を非表示' : '完了/中止を非表示'}</button>
          <button
            onClick={() => setShowBudgetOverview(!showBudgetOverview)}
            className={`text-xs font-semibold rounded-full px-3 py-1.5 border active:scale-[0.98] ${showBudgetOverview ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-800 border-gray-200'}`}
          >💰 予算一覧</button>
        </div>
      </div>

      {showBudgetOverview && cards.length > 0 && (
        <BudgetOverview cards={cards} />
      )}

      {cards.length === 0 && (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📥</div>
          <p className="text-base font-semibold text-gray-900 mb-1">制作カードはまだありません</p>
          <p className="text-sm text-gray-500 mb-4">案件詳細の「制作カードを作成」ボタンで登録できます。</p>
          <Link href="/deals" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition">
            案件管理を開く →
          </Link>
        </div>
      )}

      {cards.length > 0 && view === 'kanban' && <KanbanView cards={filtered} onMove={movePhase} onOpen={setDetailId} />}

      {detailId && (() => {
        const card = cards.find((c) => c.id === detailId);
        if (!card) return null;
        return (
          <CardDetailModal
            card={card}
            allCards={cards}
            generating={tasksGenerating === card.id}
            onClose={() => setDetailId(null)}
            onGenerateTasks={() => handleGenerateTasks(card)}
            onNextActionChange={(a) => setNextActionFor(card.id, a)}
            onTaskUpdate={(tid, patch) => updateTaskFor(card.id, tid, patch)}
            onTaskAdd={(title, assigneeId) => addTaskFor(card.id, title, assigneeId)}
            onTaskRemove={(tid) => removeTaskFor(card.id, tid)}
            onActionAdd={(a) => addActionFor(card.id, a)}
            onActionRemove={(aid) => removeActionFor(card.id, aid)}
            onFieldChange={(patch) => updateCardFields(card.id, patch)}
          />
        );
      })()}

      {cards.length > 0 && view === 'list' && (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
              このフェーズの案件はありません
            </div>
          ) : (
            filtered.map((card) => (
              <CardRow
                key={card.id}
                card={card}
                isOpen={expandedId === card.id}
                onToggle={() => setExpandedId(expandedId === card.id ? null : card.id)}
                onGenerateTasks={() => handleGenerateTasks(card)}
                generating={tasksGenerating === card.id}
              />
            ))
          )}
        </div>
      )}

      {cards.length > 0 && view === 'gantt' && (
        <>
          <CrossProjectGantt cards={cards} onOpen={setDetailId} />
          <GanttView cards={filtered} />
        </>
      )}
    </div>
  );
}

function CardRow({
  card,
  isOpen,
  onToggle,
  onGenerateTasks,
  generating,
}: {
  card: ProductionCard;
  isOpen: boolean;
  onToggle: () => void;
  onGenerateTasks: () => void;
  generating: boolean;
}) {
  const pmMember = ALL_MEMBERS.find((m) => m.id === card.pmId);
  const teamNames = (card.teamMemberIds ?? []).map((id) => ALL_MEMBERS.find((m) => m.id === id)?.name).filter(Boolean);
  const delivery = getDeliveryDate(card);
  const dl = daysUntil(delivery);
  const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-500';
  const grossProfit = (card.amount ?? 0) + (card.amendments ?? []).reduce((s, a) => s + a.amount, 0) - (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget;
  const grossRate = (card.amount ?? 0) > 0 ? Math.round((grossProfit / (card.amount ?? 0)) * 100) : 0;
  const needsTasks = (card.tasks ?? []).length === 0;

  return (
    <div id={`handoff-${card.id}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-blue-300 transition-colors scroll-mt-4">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                {PHASE_LABELS[card.phase]}
              </span>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${RISK_COLORS[card.risk]}`}>
                {RISK_LABELS[card.risk]}
              </span>
              {needsTasks && (
                <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-300 rounded-full px-2 py-0.5 animate-pulse">
                  ⚠ タスク未生成
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-gray-900 truncate">{card.dealName}</p>
            <p className="text-xs text-gray-500 mt-0.5">{card.clientName}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-semibold text-gray-900 tabular-nums">{yen(card.amount)}</p>
            <p className={`text-xs font-semibold tabular-nums ${grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-500' : 'text-red-600'}`}>
              粗利 {grossRate}%
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${card.progress}%` }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 tabular-nums w-8 text-right">{card.progress}%</span>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap text-xs text-gray-600">
          <div className="flex items-center gap-3 flex-wrap">
            <span>PM: <span className="font-semibold text-gray-900">{pmMember?.name ?? card.pmName}</span></span>
            {teamNames.length > 0 && (
              <span>チーム: <span className="font-semibold text-gray-900">{teamNames.join('・')}</span></span>
            )}
            <span>タスク: <span className="font-semibold text-gray-900">{(card.tasks ?? []).length}件</span></span>
            {delivery && (
              <span className={`font-semibold ${dlColor}`}>
                納期 {delivery.slice(5)} ({dl !== null && dl >= 0 ? `残${dl}日` : dl !== null ? `${Math.abs(dl)}日超過` : ''})
              </span>
            )}
          </div>
          <button onClick={onToggle} className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98]">
            {isOpen ? '閉じる ↑' : '詳細 ↓'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📝 要件定義</p>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto font-sans">{(card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement || '(未生成)'}</pre>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">💰 見積・予算</p>
              <div className="space-y-1 text-xs text-gray-800">
                <div className="flex justify-between"><span>受注金額</span><span className="font-semibold tabular-nums">{yen(card.amount)}</span></div>
                <div className="flex justify-between"><span>予算</span><span className="font-semibold tabular-nums">{yen((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget)}</span></div>
                <div className="flex justify-between border-t border-gray-100 pt-1 mt-1"><span>粗利</span><span className="font-semibold tabular-nums text-blue-600">{yen(grossProfit)}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">📄 提案</p>
              <p className="text-xs text-gray-800 leading-relaxed">{(card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).proposalSummary}</p>
            </div>
          </div>

          {needsTasks ? (
            <button
              onClick={onGenerateTasks}
              disabled={generating}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98]">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  要件定義からタスクを生成中...
                </span>
              ) : '🤖 AIで要件定義からタスクを生成'}
            </button>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">タスク ({(card.tasks ?? []).length}件)</p>
                <button onClick={onGenerateTasks} className="text-xs font-medium text-gray-500 hover:text-gray-700">再生成</button>
              </div>
              <div className="p-2 space-y-1">
                {(card.tasks ?? []).map((t) => {
                  const a = ALL_MEMBERS.find((m) => m.id === t.assigneeId);
                  return (
                    <div key={t.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-gray-50">
                      <span className="text-xs text-gray-800 flex-1 truncate">・{t.title}</span>
                      <span className="text-xs text-gray-500 shrink-0">{a?.name ?? '未割当'}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${t.status === 'done' ? 'bg-emerald-50 text-emerald-700' : t.status === 'doing' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{t.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KanbanView({ cards, onMove, onOpen }: { cards: ProductionCard[]; onMove: (id: string, to: ProductionCard['phase']) => void; onOpen: (id: string) => void }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overPhase, setOverPhase] = useState<ProductionCard['phase'] | null>(null);

  const grouped = PHASE_ORDER.map((phase) => ({
    phase,
    items: cards.filter((c) => c.phase === phase),
  }));

  const totalByPhase = (phase: ProductionCard['phase']) =>
    cards.filter((c) => c.phase === phase).reduce((s, c) => s + c.amount, 0);

  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-2">
      <div className="flex gap-3 min-w-max">
        {grouped.map(({ phase, items }) => {
          const isOver = overPhase === phase;
          return (
            <div
              key={phase}
              onDragOver={(e) => { e.preventDefault(); setOverPhase(phase); }}
              onDragLeave={() => setOverPhase((p) => (p === phase ? null : p))}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) onMove(dragId, phase);
                setDragId(null);
                setOverPhase(null);
              }}
              className={`w-72 shrink-0 rounded-xl border transition-colors ${isOver ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-inherit rounded-t-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate">{PHASE_LABELS[phase]}</span>
                  <span className="text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-full px-2 py-0.5 tabular-nums">{items.length}</span>
                </div>
                <span className="text-xs font-semibold text-gray-800 tabular-nums shrink-0">{items.length > 0 ? yen(totalByPhase(phase)) : '—'}</span>
              </div>
              <div className="p-2 space-y-2 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="text-xs text-gray-600 text-center py-6">—</div>
                ) : (
                  items.map((card) => <KanbanCard key={card.id} card={card} onOpen={() => onOpen(card.id)} onDragStart={() => setDragId(card.id)} onDragEnd={() => { setDragId(null); setOverPhase(null); }} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({ card, onOpen, onDragStart, onDragEnd }: { card: ProductionCard; onOpen: () => void; onDragStart: () => void; onDragEnd: () => void }) {
  const pmMember = ALL_MEMBERS.find((m) => m.id === (card.pmId ?? ''));
  const delivery = getDeliveryDate(card);
  const dl = daysUntil(delivery);
  const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-700';
  const grossProfit = (card.amount ?? 0) + (card.amendments ?? []).reduce((s, a) => s + a.amount, 0) - (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget;
  const grossRate = (card.amount ?? 0) > 0 ? Math.round((grossProfit / (card.amount ?? 0)) * 100) : 0;
  const needsTasks = (card.tasks ?? []).length === 0;
  const taskCostTotal = (card.tasks ?? []).reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const budgetUsedPct = (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget > 0 ? Math.round((taskCostTotal / (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget) * 100) : 0;
  const budgetBadge =
    budgetUsedPct > 100 ? { label: `🔥 予算超過 ${budgetUsedPct}%`, cls: 'bg-red-50 text-red-700 border-red-300' } :
    budgetUsedPct >= 80 ? { label: `⚠ 予算 ${budgetUsedPct}%`,      cls: 'bg-amber-50 text-amber-700 border-amber-300' } :
    null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      className={`border rounded-lg p-3 cursor-pointer active:scale-[0.98] hover:border-blue-300 transition-all ${
        card.status === 'cancelled' ? 'bg-gray-50 border-red-200 opacity-60' :
        card.status === 'done' ? 'bg-gray-50 border-emerald-200 opacity-70' :
        card.status === 'paused' ? 'bg-amber-50/40 border-amber-200 opacity-80' :
        'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className={`text-sm font-semibold leading-tight truncate flex-1 ${card.status === 'cancelled' ? 'line-through text-gray-600' : 'text-gray-900'}`}>{card.dealName}</p>
        <span className={`text-xs font-semibold rounded-full px-1.5 py-0.5 border shrink-0 ${RISK_COLORS[card.risk]}`}>{RISK_LABELS[card.risk]}</span>
      </div>
      <p className="text-xs text-gray-700 truncate mb-2">{card.clientName}</p>
      <div className="flex items-center gap-1.5 mb-1">
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${card.progress}%` }} />
        </div>
        <span className="text-xs font-semibold text-gray-800 tabular-nums w-7 text-right">{card.progress}%</span>
      </div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-700 tabular-nums">{(card.tasks ?? []).filter((t) => t.status === 'done').length}/{(card.tasks ?? []).length} タスク完了</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-800 truncate">{pmMember?.name ?? card.pmName}</span>
        <span className={`font-semibold tabular-nums ${grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-800' : 'text-red-600'}`}>{grossRate}%</span>
      </div>
      <div className="flex items-center justify-between text-xs mt-1">
        <span className="text-gray-900 font-semibold tabular-nums">{yen(card.amount)}</span>
        {delivery && <span className={`font-semibold ${dlColor}`}>{delivery.slice(5)}{dl !== null && dl >= 0 ? ` (残${dl})` : dl !== null ? ` (${Math.abs(dl)}超過)` : ''}</span>}
      </div>
      {card.status !== 'active' && (
        <div className={`mt-2 text-xs font-semibold rounded px-1.5 py-0.5 text-center border ${
          card.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
          card.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
          'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>{card.status === 'cancelled' ? '🚫 中止' : card.status === 'paused' ? '⏸ 保留' : '✅ 完了'}</div>
      )}
      {budgetBadge && (
        <div className={`mt-2 text-xs font-semibold rounded px-1.5 py-0.5 text-center border ${budgetBadge.cls}`}>{budgetBadge.label}</div>
      )}
      {needsTasks && card.status === 'active' && <div className="mt-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 text-center">⚠ タスク未生成</div>}
    </div>
  );
}

function CardDetailModal({
  card,
  allCards,
  generating,
  onClose,
  onGenerateTasks,
  onNextActionChange,
  onTaskUpdate,
  onTaskAdd,
  onTaskRemove,
  onActionAdd,
  onActionRemove,
  onFieldChange,
}: {
  card: ProductionCard;
  allCards: ProductionCard[];
  generating: boolean;
  onClose: () => void;
  onGenerateTasks: () => void;
  onNextActionChange: (a: ProductionNextAction | null) => void;
  onTaskUpdate: (taskId: string, patch: Partial<ProductionCardTask>) => void;
  onTaskAdd: (title: string, assigneeId?: string) => void;
  onTaskRemove: (taskId: string) => void;
  onActionAdd: (action: Omit<ProductionAction, 'id' | 'createdAt'>) => void;
  onActionRemove: (actionId: string) => void;
  onFieldChange: (patch: Partial<ProductionCard>) => void;
}) {
  type Tab = 'requirements' | 'structure' | 'tasks' | 'progress';
  const [tab, setTab] = useState<Tab>('tasks');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState<string>(card.pmId);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  async function callAI(action: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    setAiBusy(action);
    try {
      const res = await fetch('/api/production/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) throw new Error(`AI error ${res.status}`);
      return await res.json();
    } finally {
      setAiBusy(null);
    }
  }

  const [lastVoiceSummary, setLastVoiceSummary] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<{ field: string; value: string }[]>([]);

  const appendToRequirements = (text: string) => {
    const current = (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '';
    const separator = current.trim() ? '\n\n' : '';
    onFieldChange({ referenceArtifacts: { ...card.referenceArtifacts, requirement: current + separator + `## 打ち合わせメモ (${new Date().toLocaleDateString('ja-JP')})\n${text}` } });
    setLastVoiceSummary(null);
  };

  const pushUndo = (field: string, value: string) => setUndoStack((s) => [...s, { field, value }]);
  const popUndo = (field: string) => {
    const entry = [...undoStack].reverse().find((u) => u.field === field);
    if (!entry) return;
    if (field === 'requirement') onFieldChange({ referenceArtifacts: { ...card.referenceArtifacts, requirement: entry.value } });
    if (field === 'sitemap') onFieldChange({ sitemap: entry.value });
    setUndoStack((s) => { const i = s.lastIndexOf(entry); return i >= 0 ? [...s.slice(0, i), ...s.slice(i + 1)] : s; });
  };
  const hasUndo = (field: string) => undoStack.some((u) => u.field === field);

  const runRefineRequirements = async () => {
    pushUndo('requirement', (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '');
    const j = await callAI('refine-requirements', { requirement: (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement });
    const text = typeof j.text === 'string' ? j.text : '';
    if (text) onFieldChange({ referenceArtifacts: { ...card.referenceArtifacts, requirement: text } });
  };

  const runGenerateSitemap = async () => {
    pushUndo('sitemap', card.sitemap ?? '');
    const j = await callAI('generate-sitemap', {
      requirement: (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement,
      proposalSummary: (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).proposalSummary,
    });
    const text = typeof j.text === 'string' ? j.text : '';
    if (text) onFieldChange({ sitemap: text });
  };

  const runGenerateTasksAI = async () => {
    const members = ALL_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.level,
      skills: m.skills,
      load: (memberLoad.get(m.id)?.active) ?? 0,
    }));
    const j = await callAI('generate-tasks', {
      requirement: (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement,
      budget: (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget,
      members,
      vendors: VENDORS.map((v) => ({ name: v.name, specialty: v.specialty })),
    });
    const tasks = Array.isArray((j as { tasks?: unknown }).tasks) ? (j as { tasks: Array<{ title: string; assigneeType?: string; suggestedMemberName?: string; suggestedVendorName?: string; estimatedCost?: number }> }).tasks : [];
    if (tasks.length === 0) return;
    const mapped: ProductionCardTask[] = tasks.map((t, i) => {
      const memberMatch = ALL_MEMBERS.find((m) => t.suggestedMemberName && m.name === t.suggestedMemberName);
      return {
        id: `t_${card.id}_ai_${Date.now()}_${i}`,
        title: t.title,
        status: 'todo',
        assigneeType: t.assigneeType === 'external' ? 'external' : 'internal',
        assigneeId: memberMatch?.id,
        externalPartnerName: t.suggestedVendorName,
        estimatedCost: t.estimatedCost,
      };
    });
    onFieldChange({ tasks: [...(card.tasks ?? []), ...mapped] });
  };
  const [actionDraft, setActionDraft] = useState<{ type: ProductionActionType; content: string; date: string; time: string; assignee: string }>({
    type: 'meet',
    content: '',
    date: '2026-04-05',
    time: '',
    assignee: ALL_MEMBERS.find((m) => m.id === card.pmId)?.name ?? '',
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pmMember = ALL_MEMBERS.find((m) => m.id === (card.pmId ?? ''));
  const teamNames = (card.teamMemberIds ?? []).map((id) => ALL_MEMBERS.find((m) => m.id === id)?.name).filter(Boolean);
  const delivery = getDeliveryDate(card);
  const dl = daysUntil(delivery);
  const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-700';
  const grossProfit = (card.amount ?? 0) + (card.amendments ?? []).reduce((s, a) => s + a.amount, 0) - (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget;
  const grossRate = (card.amount ?? 0) > 0 ? Math.round((grossProfit / (card.amount ?? 0)) * 100) : 0;
  const needsTasks = (card.tasks ?? []).length === 0;
  const taskCostTotal = (card.tasks ?? []).reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const budgetRemaining = (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget - taskCostTotal;
  const budgetUsedPct = (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget > 0 ? Math.round((taskCostTotal / (card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget) * 100) : 0;
  const memberLoad = useMemo(() => {
    const map = new Map<string, { active: number; cost: number }>();
    for (const c of allCards) {
      for (const t of c.tasks ?? []) {
        if (!t.assigneeId || t.status === 'done') continue;
        const prev = map.get(t.assigneeId) ?? { active: 0, cost: 0 };
        prev.active += 1;
        prev.cost += t.estimatedCost ?? 0;
        map.set(t.assigneeId, prev);
      }
    }
    return map;
  }, [allCards]);
  const requirementItems = useMemo(() => parseRequirementItems((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement), [(card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement]);
  const tasksByRequirementId = useMemo(() => {
    const map = new Map<string, ProductionCardTask[]>();
    for (const t of (card.tasks ?? []) ?? []) {
      for (const ref of t.requirementRefs ?? []) {
        const arr = map.get(ref) ?? [];
        arr.push(t);
        map.set(ref, arr);
      }
    }
    return map;
  }, [(card.tasks ?? []) ?? []]);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'requirements', label: '要件',      icon: '📝' },
    { id: 'structure',    label: '構成',      icon: '🗺' },
    { id: 'tasks',        label: 'タスク',    icon: '📋' },
    { id: 'progress',     label: '進捗',      icon: '🏃' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-4xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col shadow-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">{PHASE_LABELS[card.phase]}</span>
              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${RISK_COLORS[card.risk]}`}>{RISK_LABELS[card.risk]}</span>
            </div>
            <p className="text-base font-semibold text-gray-900 truncate">{card.dealName}</p>
            <p className="text-xs text-gray-700 mt-0.5">{card.clientName}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full text-gray-700 hover:bg-gray-100 active:scale-[0.98] flex items-center justify-center text-lg">✕</button>
        </div>

        <div className="px-5 pt-3 pb-0 bg-white border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
            <div><p className="text-gray-700 mb-0.5">受注額</p><p className="font-semibold text-gray-900 tabular-nums">{yen(card.amount)}</p></div>
            <div><p className="text-gray-700 mb-0.5">粗利</p><p className={`font-semibold tabular-nums ${grossRate >= 40 ? 'text-blue-600' : grossRate >= 20 ? 'text-gray-900' : 'text-red-600'}`}>{yen(grossProfit)}（{grossRate}%）</p></div>
            <div><p className="text-gray-700 mb-0.5">進捗</p><p className="font-semibold text-gray-900 tabular-nums">{card.progress}% <span className="font-normal text-gray-700">({(card.tasks ?? []).filter((t) => t.status === 'done').length}/{(card.tasks ?? []).length})</span></p></div>
            <div><p className="text-gray-700 mb-0.5">納期</p><p className={`font-semibold ${dlColor} tabular-nums`}>{delivery || '—'}{dl !== null && dl >= 0 ? ` (残${dl}日)` : dl !== null ? ` (${Math.abs(dl)}日超過)` : ''}</p></div>
          </div>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors active:scale-[0.98] ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-700 hover:text-gray-700'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <HandoffPanel
            card={card}
            open={handoffOpen}
            setOpen={setHandoffOpen}
            pmName={pmMember?.name ?? card.pmName}
            teamNames={teamNames as string[]}
            grossProfit={grossProfit}
            grossRate={grossRate}
            onFieldChange={onFieldChange}
          />

          {tab === 'requirements' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold text-gray-900">📝 要件定義</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {hasUndo('requirement') && (
                      <button
                        onClick={() => popUndo('requirement')}
                        className="text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 rounded px-2 py-1 hover:bg-gray-200 active:scale-[0.98]"
                      >↩ 元に戻す</button>
                    )}
                    <button
                      onClick={runRefineRequirements}
                      disabled={aiBusy !== null}
                      className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-1 hover:bg-purple-100 active:scale-[0.98] disabled:opacity-50"
                    >{aiBusy === 'refine-requirements' ? '整形中...' : '✨ AIで整形'}</button>
                    <button
                      onClick={runGenerateSitemap}
                      disabled={aiBusy !== null || !((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '').trim()}
                      className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 active:scale-[0.98] disabled:opacity-50"
                    >{aiBusy === 'generate-sitemap' ? '生成中...' : '🗺 サイトマップ生成'}</button>
                    <button
                      onClick={runGenerateTasksAI}
                      disabled={aiBusy !== null || !((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '').trim()}
                      className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-1 hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
                    >{aiBusy === 'generate-tasks' ? '生成中...' : '🤖 タスク自動生成'}</button>
                  </div>
                </div>
                <textarea
                  value={(card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? ''}
                  onChange={(e) => onFieldChange({ referenceArtifacts: { ...card.referenceArtifacts, requirement: e.target.value } })}
                  placeholder="# 要件定義書&#10;&#10;## 機能要件&#10;- ..."
                  className="w-full min-h-[260px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y font-mono text-gray-900"
                />
              </div>

              {requirementItems.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">🔗 要件項目 ⇔ タスク <span className="text-gray-700 font-normal text-xs">各要件にいくつタスクが紐付いているか</span></p>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {requirementItems.map((item) => {
                      const linked = tasksByRequirementId.get(item.id) ?? [];
                      const covered = linked.length > 0;
                      return (
                        <li key={item.id} className="px-3 py-2">
                          <div className="flex items-start gap-2">
                            <span style={{ paddingLeft: `${item.depth * 12}px` }} className={`text-sm flex-1 ${covered ? 'text-gray-900' : 'text-gray-700'}`}>・{item.text}</span>
                            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border shrink-0 ${covered ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                              {covered ? `✓ ${linked.length}タスク` : '未カバー'}
                            </span>
                          </div>
                          {covered && (
                            <div className="flex flex-wrap gap-1 mt-1 pl-3">
                              {linked.map((t) => (
                                <span key={t.id} className="text-xs text-gray-800 bg-gray-100 rounded px-1.5 py-0.5">{t.title}</span>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <NextAction
                action={card.nextAction ? { ...card.nextAction } : null}
                onChange={(a: NextActionData | null) => onNextActionChange(a ? { date: a.date, time: a.time, content: a.content, assignee: a.assignee } : null)}
              />

              <ActionLogSection
                actions={card.actions ?? []}
                draft={actionDraft}
                setDraft={setActionDraft}
                onAdd={() => {
                  if (!actionDraft.content.trim() || !actionDraft.date) return;
                  onActionAdd({
                    type: actionDraft.type,
                    content: actionDraft.content.trim(),
                    date: actionDraft.date,
                    time: actionDraft.time || undefined,
                    assignee: actionDraft.assignee,
                  });
                  setActionDraft({ ...actionDraft, content: '', time: '' });
                }}
                onRemove={onActionRemove}
                onUpdateAction={(id, patch) => {
                  const actions = (card.actions ?? []).map((a) => a.id === id ? { ...a, ...patch } : a);
                  onFieldChange({ actions });
                }}
                onVoiceSummary={(text) => setLastVoiceSummary(text)}
              />

              {lastVoiceSummary && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-purple-700 mb-1">🎙 音声要約を要件に反映できます</p>
                    <p className="text-xs text-gray-900 whitespace-pre-wrap leading-relaxed">{lastVoiceSummary}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => appendToRequirements(lastVoiceSummary)}
                      className="text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded hover:bg-purple-700 active:scale-[0.98]"
                    >📝 要件に追記</button>
                    <button
                      type="button"
                      onClick={() => setLastVoiceSummary(null)}
                      className="text-xs font-semibold bg-white border border-gray-200 text-gray-800 px-2 py-1.5 rounded hover:bg-gray-50 active:scale-[0.98]"
                    >✕</button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === 'structure' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-gray-900">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">🗺 サイトマップ / 画面構成</p>
                {hasUndo('sitemap') && (
                  <button
                    onClick={() => popUndo('sitemap')}
                    className="text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 rounded px-2 py-1 hover:bg-gray-200 active:scale-[0.98]"
                  >↩ 元に戻す</button>
                )}
                <button
                  onClick={runGenerateSitemap}
                  disabled={aiBusy !== null || !((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).requirement ?? '').trim()}
                  className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-1 hover:bg-blue-100 active:scale-[0.98] disabled:opacity-50"
                >{aiBusy === 'generate-sitemap' ? '生成中...' : '🤖 要件から自動生成'}</button>
              </div>
              <textarea
                value={card.sitemap ?? ''}
                onChange={(e) => onFieldChange({ sitemap: e.target.value })}
                placeholder={'# サイトマップ\n- トップ\n  - お知らせ\n  - サービス\n- 管理画面\n  - ダッシュボード\n  - ユーザー管理\n\n# 画面構成メモ\n- 認証: メール+パスワード / SSO\n- 権限: admin / user\n'}
                className="w-full min-h-[320px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y font-mono text-gray-900"
              />
            </div>
          )}

          {tab === 'tasks' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-gray-900">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">💰 予算消化</p>
                </div>
                <div className="p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <span>制作予算</span>
                    <span className="font-semibold text-gray-900 tabular-nums">{yen((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget)}</span>
                    <span className="mx-1 text-gray-700">/</span>
                    <span>割当済</span>
                    <span className={`font-semibold tabular-nums ${budgetUsedPct > 100 ? 'text-red-600' : 'text-gray-900'}`}>{yen(taskCostTotal)}</span>
                    <span className="mx-1 text-gray-700">/</span>
                    <span>残</span>
                    <span className={`font-semibold tabular-nums ${budgetRemaining < 0 ? 'text-red-600' : 'text-blue-600'}`}>{yen(budgetRemaining)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${budgetUsedPct > 100 ? 'bg-red-600' : budgetUsedPct > 80 ? 'bg-amber-500' : 'bg-blue-600'}`}
                      style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">👥 内部メンバー稼働 <span className="text-gray-700 font-normal text-xs">全制作カード横断の未完タスク</span></p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {ALL_MEMBERS.map((m) => {
                    const load = memberLoad.get(m.id) ?? { active: 0, cost: 0 };
                    const level = load.active >= 8 ? 'bg-red-50 text-red-700 border-red-200' : load.active >= 4 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                    return (
                      <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                        <span className="text-sm font-semibold text-gray-900 flex-1 truncate">{m.name}</span>
                        <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${level} tabular-nums`}>{load.active}件</span>
                        <span className="text-xs text-gray-700 tabular-nums w-24 text-right">原価{yen(load.cost)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">🤝 外注先マスタ <span className="text-gray-700 font-normal text-xs">「コピー」でタスクの外注先欄に貼れます</span></p>
                </div>
                <ul className="divide-y divide-gray-100">
                  {VENDORS.map((v) => {
                    const owner = ALL_MEMBERS.find((m) => m.id === v.internalOwnerId);
                    const backup = v.backupVendorId ? VENDORS.find((x) => x.id === v.backupVendorId) : null;
                    return (
                      <li key={v.id} className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                              <span className="text-xs font-semibold text-amber-700 shrink-0">{'★'.repeat(Math.round(v.rating))}{'☆'.repeat(5 - Math.round(v.rating))} {v.rating}</span>
                            </div>
                            <p className="text-xs text-gray-700 truncate">{v.specialty}{v.defaultRate ? ` ・ ${v.defaultRate}` : ''}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-700 mt-0.5">
                              <span>実績{v.pastProjects}件</span>
                              <span>納期遵守{v.onTimeRate}%</span>
                              {owner && <span>窓口: <span className="font-semibold text-gray-900">{owner.name}</span></span>}
                              {backup && <span>代替: {backup.name}</span>}
                            </div>
                            {v.note && <p className="text-xs text-gray-700 mt-0.5">{v.note}</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => { if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(v.name); }}
                            className="shrink-0 text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98]"
                          >コピー</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">📋 タスク <span className="text-gray-700 font-normal">({(card.tasks ?? []).length}件)</span></p>
                  {!needsTasks && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const dups: ProductionCardTask[] = (card.tasks ?? []).filter((x) => x.status !== 'done').map((x, i) => ({ ...x, id: `t_${card.id}_bulkdup_${Date.now()}_${i}`, status: 'todo' as const }));
                          if (dups.length > 0) onFieldChange({ tasks: [...(card.tasks ?? []), ...dups] });
                        }}
                        className="text-xs font-semibold text-gray-800 hover:text-blue-600 active:scale-[0.98]"
                      >📋 全タスク複製</button>
                      <button onClick={onGenerateTasks} className="text-xs font-semibold text-gray-800 hover:text-gray-900">🤖 再生成</button>
                    </div>
                  )}
                </div>
                {needsTasks ? (
                  <div className="p-4 space-y-3">
                    <button
                      onClick={runGenerateTasksAI}
                      disabled={aiBusy !== null}
                      className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-[0.98]">
                      {aiBusy === 'generate-tasks' ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          要件定義からタスクを生成中...
                        </span>
                      ) : '🤖 AIで要件定義からタスクを生成（担当・原価・外注先つき）'}
                    </button>
                    <div>
                      <p className="text-xs font-semibold text-gray-800 mb-1.5">📋 テンプレートから追加</p>
                      <TemplateApplier card={card} onFieldChange={onFieldChange} />
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {(card.tasks ?? []).map((t) => (
                      <div key={t.id} className="px-3 py-2.5 hover:bg-gray-50 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col shrink-0 -mr-0.5">
                            <button
                              type="button"
                              disabled={(card.tasks ?? []).indexOf(t) === 0}
                              onClick={() => {
                                const idx = (card.tasks ?? []).indexOf(t);
                                if (idx <= 0) return;
                                const arr = [...(card.tasks ?? [])];
                                [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
                                onFieldChange({ tasks: arr });
                              }}
                              className="text-gray-600 hover:text-gray-900 text-xs leading-none disabled:opacity-20 active:scale-[0.9]"
                            >▲</button>
                            <button
                              type="button"
                              disabled={(card.tasks ?? []).indexOf(t) === (card.tasks ?? []).length - 1}
                              onClick={() => {
                                const idx = (card.tasks ?? []).indexOf(t);
                                if (idx >= (card.tasks ?? []).length - 1) return;
                                const arr = [...(card.tasks ?? [])];
                                [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                onFieldChange({ tasks: arr });
                              }}
                              className="text-gray-600 hover:text-gray-900 text-xs leading-none disabled:opacity-20 active:scale-[0.9]"
                            >▼</button>
                          </div>
                          <select
                            value={t.status}
                            onChange={(e) => onTaskUpdate(t.id, { status: e.target.value as ProductionCardTask['status'] })}
                            className={`text-xs font-semibold px-2 py-1 rounded-full border-0 focus:ring-2 focus:ring-blue-500 shrink-0 cursor-pointer ${t.status === 'done' ? 'bg-emerald-50 text-emerald-700' : t.status === 'doing' ? 'bg-blue-50 text-blue-700' : t.status === 'review' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}
                          >
                            <option value="todo">todo</option>
                            <option value="doing">doing</option>
                            <option value="review">review</option>
                            <option value="done">done</option>
                          </select>
                          <input
                            type="text"
                            value={t.title}
                            onChange={(e) => onTaskUpdate(t.id, { title: e.target.value })}
                            className={`text-sm flex-1 bg-transparent border-0 focus:ring-2 focus:ring-blue-500 focus:bg-white rounded px-1 py-0.5 ${t.status === 'done' ? 'line-through text-gray-700' : 'text-gray-900'}`}
                          />
                          <button
                            onClick={() => {
                              const dup: ProductionCardTask = { ...t, id: `t_${card.id}_dup_${Date.now()}`, status: 'todo' };
                              onFieldChange({ tasks: [...(card.tasks ?? []), dup] });
                            }}
                            className="text-gray-700 hover:text-blue-600 text-sm shrink-0 active:scale-[0.98] w-6 h-6 rounded hover:bg-blue-50 flex items-center justify-center"
                            title="複製"
                          >📋</button>
                          <button
                            onClick={() => onTaskRemove(t.id)}
                            className="text-gray-700 hover:text-red-600 text-sm shrink-0 active:scale-[0.98] w-6 h-6 rounded hover:bg-red-50 flex items-center justify-center"
                            title="削除"
                          >✕</button>
                        </div>
                        <div className="flex items-center gap-2 text-xs pl-1">
                          <select
                            value={t.assigneeType ?? 'internal'}
                            onChange={(e) => onTaskUpdate(t.id, { assigneeType: e.target.value as 'internal' | 'external' })}
                            className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 shrink-0 text-gray-900"
                          >
                            <option value="internal">内部</option>
                            <option value="external">外部</option>
                          </select>
                          {(t.assigneeType ?? 'internal') === 'internal' ? (
                            <>
                              <select
                                value={t.assigneeId ?? ''}
                                onChange={(e) => onTaskUpdate(t.id, { assigneeId: e.target.value || undefined })}
                                className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 min-w-[12rem] text-gray-900"
                              >
                                <option value="">未割当</option>
                                {ALL_MEMBERS.map((m) => {
                                  const load = memberLoad.get(m.id)?.active ?? 0;
                                  const lvl = m.level === 'junior' ? 'Jr' : m.level === 'mid' ? 'Mid' : m.level === 'senior' ? 'Sr' : m.level === 'lead' ? 'Lead' : '';
                                  const warn = load >= 8 ? '🔴' : load >= 4 ? '⚠' : '✅';
                                  const skills = (m.skills ?? []).slice(0, 3).join(',');
                                  return <option key={m.id} value={m.id}>{m.name} [{lvl}] {skills} | {load}件{warn}</option>;
                                })}
                              </select>
                              {t.assigneeId && <AssignContactButtons taskId={t.id} taskTitle={t.title} cardTitle={card.dealName} clientName={card.clientName} memberId={t.assigneeId} sentLog={card.sentLog} onSent={(entry) => onFieldChange({ sentLog: [...(card.sentLog ?? []), { ...entry, id: `sent_${Date.now()}` }] })} />}
                            </>
                          ) : (
                            <>
                              <input
                                type="text"
                                value={t.externalPartnerName ?? ''}
                                onChange={(e) => onTaskUpdate(t.id, { externalPartnerName: e.target.value })}
                                placeholder="外注先"
                                className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 min-w-[8rem] text-gray-900"
                              />
                              {t.externalPartnerName && (() => {
                                const vendor = VENDORS.find((v) => v.name === t.externalPartnerName);
                                const email = vendor?.email;
                                if (!email) return null;
                                const subject = `【${card.dealName}】${t.title}`;
                                const body = `${t.externalPartnerName} 様\n\nお世話になっております。トライポットです。\n以下の作業をご依頼したく、ご連絡いたします。\n\n案件: ${card.dealName}（${card.clientName}）\n内容: ${t.title}\n${t.estimatedCost ? `原価: ¥${t.estimatedCost.toLocaleString()}` : ''}\n${t.dueDate ? `納期: ${t.dueDate}` : ''}\n\nよろしくお願いいたします。`;
                                const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                return (
                                  <a href={url} target="_blank" rel="noreferrer" title={`Gmail: ${t.externalPartnerName}`} className="text-xs font-semibold bg-red-50 text-red-700 border border-red-200 rounded px-1.5 py-1 hover:bg-red-100 active:scale-[0.98] shrink-0">✉️</a>
                                );
                              })()}
                            </>
                          )}
                          <span className="text-gray-700">原価</span>
                          <input
                            type="number"
                            value={t.estimatedCost ?? ''}
                            onChange={(e) => onTaskUpdate(t.id, { estimatedCost: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="円"
                            className="text-xs text-gray-900 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 w-24 tabular-nums"
                          />
                          <span className="text-gray-700 text-gray-900">納期</span>
                          <input
                            type="date"
                            value={t.dueDate ?? ''}
                            onChange={(e) => onTaskUpdate(t.id, { dueDate: e.target.value || undefined })}
                            className="text-xs text-gray-900 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {(t.assigneeType === 'external') && (
                          <div className="flex items-center gap-2 text-xs pl-1">
                            <span className="text-gray-800">レビュー担当</span>
                            <select
                              value={t.reviewerId ?? ''}
                              onChange={(e) => onTaskUpdate(t.id, { reviewerId: e.target.value || undefined })}
                              className="text-xs bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 text-gray-900"
                            >
                              <option value="">未設定</option>
                              {ALL_MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            {t.reviewerId && (
                              <select
                                value={t.reviewStatus ?? 'pending'}
                                onChange={(e) => {
                                  const rs = e.target.value as 'pending' | 'in_review' | 'approved' | 'rejected';
                                  const statusPatch: Partial<ProductionCardTask> = { reviewStatus: rs };
                                  if (rs === 'approved') statusPatch.status = 'done';
                                  if (rs === 'rejected') statusPatch.status = 'doing';
                                  onTaskUpdate(t.id, statusPatch);
                                }}
                                className={`text-xs font-semibold rounded-full px-2 py-0.5 border focus:ring-2 focus:ring-blue-500 ${
                                  (t.reviewStatus ?? 'pending') === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  (t.reviewStatus ?? 'pending') === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                                  (t.reviewStatus ?? 'pending') === 'in_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  'bg-gray-100 text-gray-700 border-gray-200'
                                }`}
                              >
                                <option value="pending">⏳ 待ち</option>
                                <option value="in_review">🔍 レビュー中</option>
                                <option value="approved">✅ 承認 → done</option>
                                <option value="rejected">❌ 差し戻し → doing</option>
                              </select>
                            )}
                          </div>
                        )}
                        {requirementItems.length > 0 && (
                          <TaskRequirementLinker
                            taskRefs={t.requirementRefs ?? []}
                            items={requirementItems}
                            onToggle={(itemId) => {
                              const current = t.requirementRefs ?? [];
                              const next = current.includes(itemId) ? current.filter((x) => x !== itemId) : [...current, itemId];
                              onTaskUpdate(t.id, { requirementRefs: next });
                            }}
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-900">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newTaskTitle.trim()) {
                            onTaskAdd(newTaskTitle, newTaskAssignee);
                            setNewTaskTitle('');
                          }
                        }}
                        placeholder="+ タスクを追加してEnter"
                        className="text-sm flex-1 bg-white border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                      />
                      <select
                        value={newTaskAssignee}
                        onChange={(e) => setNewTaskAssignee(e.target.value)}
                        className="text-xs text-gray-700 bg-white border border-gray-200 rounded px-1.5 py-1 focus:ring-2 focus:ring-blue-500 shrink-0 max-w-[7rem] text-gray-900"
                      >
                        {ALL_MEMBERS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (newTaskTitle.trim()) {
                            onTaskAdd(newTaskTitle, newTaskAssignee);
                            setNewTaskTitle('');
                          }
                        }}
                        disabled={!newTaskTitle.trim()}
                        className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] shrink-0"
                      >追加</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {tab === 'progress' && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900">進捗</p>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{card.progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${card.progress}%` }} />
                </div>
                {(card.tasks ?? []).length > 0 && (
                  <p className="text-xs text-gray-700">
                    タスク {(card.tasks ?? []).filter((t) => t.status === 'done').length}/{(card.tasks ?? []).length} 完了
                    {' '}— タスクを完了にすると進捗が自動で進みます
                  </p>
                )}
                {(card.tasks ?? []).length === 0 && (
                  <p className="text-xs text-gray-700">タスクを追加すると、完了数に応じて進捗が自動計算されます</p>
                )}
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">リスク</span>
                    <select
                      value={card.risk}
                      onChange={(e) => onFieldChange({ risk: e.target.value as ProductionCard['risk'] })}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border focus:ring-2 focus:ring-blue-500 ${RISK_COLORS[card.risk]} text-gray-900`}
                    >
                      <option value="none">リスクなし</option>
                      <option value="low">リスク低</option>
                      <option value="medium">リスク中</option>
                      <option value="high">リスク高</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800">ステータス</span>
                    <select
                      value={card.status}
                      onChange={(e) => onFieldChange({ status: e.target.value as ProductionCard['status'] })}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        card.status === 'active' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        card.status === 'paused' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        card.status === 'cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <option value="active">🟢 アクティブ</option>
                      <option value="paused">⏸ 保留</option>
                      <option value="done">✅ 完了</option>
                      <option value="cancelled">🚫 中止</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">📝 振り返り <span className="text-gray-700 font-normal text-xs">良かった点・反省・次に活かすこと</span></p>
                </div>
                <textarea
                  value={card.retrospective ?? ''}
                  onChange={(e) => onFieldChange({ retrospective: e.target.value })}
                  placeholder="例:&#10;✅ 良かった: 要件整形AIで初回レビュー前に精度が上がった&#10;⚠ 反省: 外注管理が甘く、デザイン差し戻しが2回&#10;📌 次回: デザインは中間チェックを1回入れる"
                  className="w-full min-h-[120px] text-sm p-3 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none rounded-b-xl resize-y text-gray-900"
                />
              </div>

              {(() => {
                const extVendors = [...new Set((card.tasks ?? []).filter((t) => t.assigneeType === 'external' && t.externalPartnerName).map((t) => t.externalPartnerName!))];
                if (extVendors.length === 0) return null;
                return (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">🤝 外注先評価（案件完了後に更新）</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {extVendors.map((name) => {
                        const v = VENDORS.find((x) => x.name === name);
                        if (!v) return <div key={name} className="px-3 py-2 text-xs text-gray-700">{name}（マスタ未登録）</div>;
                        return (
                          <div key={v.id} className="px-3 py-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">{v.name}</span>
                              <span className="text-xs text-gray-700">{v.specialty}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              <label className="flex items-center gap-1 text-gray-800">
                                評価
                                <select
                                  defaultValue={String(v.rating)}
                                  className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 text-gray-900"
                                >
                                  {[1,2,3,4,5].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5-n)} {n}.0</option>)}
                                </select>
                              </label>
                              <label className="flex items-center gap-1 text-gray-800">
                                納期遵守
                                <select
                                  defaultValue={String(v.onTimeRate)}
                                  className="text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-blue-500 text-gray-900"
                                >
                                  {[100,95,90,85,80,70,60,50].map((n) => <option key={n} value={n}>{n}%</option>)}
                                </select>
                              </label>
                              <span className="text-gray-700">実績 {v.pastProjects}件 → {v.pastProjects + 1}件</span>
                            </div>
                            <p className="text-xs text-gray-700 mt-1">※ 保存は外注先マスタ（vendors.ts）への反映が必要。MVP段階では参考表示</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function AmendmentSection({ card, onFieldChange }: { card: ProductionCard; onFieldChange: (p: Partial<ProductionCard>) => void }) {
  const [draft, setDraft] = useState({ amount: '', reason: '', date: new Date().toISOString().slice(0, 10) });
  const amendments = card.amendments ?? [];
  const totalAmendment = amendments.reduce((s, a) => s + a.amount, 0);

  const add = () => {
    if (!draft.amount || !draft.reason.trim()) return;
    const entry: RevenueAmendment = { id: `amend_${Date.now()}`, date: draft.date, amount: Number(draft.amount), reason: draft.reason.trim() };
    onFieldChange({ amendments: [...amendments, entry] });
    setDraft({ ...draft, amount: '', reason: '' });
  };

  return (
    <div className="mt-3 border-t border-gray-200 pt-2">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">📝 受注額改定 <span className="text-gray-600 font-normal">追加費用・減額</span></p>
      {amendments.length > 0 && (
        <div className="space-y-1 mb-2">
          {amendments.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs">
              <span className="text-gray-700 tabular-nums">{a.date.slice(5)}</span>
              <span className={`font-semibold tabular-nums ${a.amount >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{a.amount >= 0 ? '+' : ''}{formatYen(a.amount)}</span>
              <span className="text-gray-800 flex-1 truncate">{a.reason}</span>
              <button onClick={() => onFieldChange({ amendments: amendments.filter((x) => x.id !== a.id) })} className="text-gray-600 hover:text-red-600 active:scale-[0.98]">✕</button>
            </div>
          ))}
          <div className="text-xs font-semibold text-gray-900">改定後受注額: <span className="tabular-nums">{formatYen(card.amount + totalAmendment)}</span></div>
        </div>
      )}
      <div className="flex gap-1.5 flex-wrap">
        <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="金額（±円）" className="w-24 text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-900" />
        <input type="text" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="理由" className="flex-1 min-w-[8rem] text-xs border border-gray-200 rounded px-1.5 py-1 text-gray-900" />
        <button onClick={add} disabled={!draft.amount || !draft.reason.trim()} className="text-xs font-semibold bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98]">追加</button>
      </div>
    </div>
  );
}

function TemplateApplier({ card, onFieldChange }: { card: ProductionCard; onFieldChange: (p: Partial<ProductionCard>) => void }) {
  const apply = (tpl: ProjectTemplate) => {
    const today = new Date('2026-04-05');
    const tasks: ProductionCardTask[] = tpl.tasks.map((t, i) => ({
      id: `t_${card.id}_tpl_${Date.now()}_${i}`,
      title: t.title,
      status: 'todo',
      assigneeType: t.assigneeType,
      estimatedCost: t.estimatedCost,
    }));
    const milestones = tpl.milestones.map((m, i) => {
      const d = new Date(today.getTime() + m.offsetDays * 86400000);
      return { id: `ms_tpl_${Date.now()}_${i}`, label: m.label, dueDate: d.toISOString().slice(0, 10), done: false };
    });
    onFieldChange({ tasks: [...(card.tasks ?? []), ...tasks], milestones: [...(card.milestones ?? []), ...milestones] });
  };

  return (
    <div className="flex gap-1.5 flex-wrap">
      {PROJECT_TEMPLATES.map((tpl) => (
        <button key={tpl.id} onClick={() => apply(tpl)} className="text-xs font-semibold bg-white border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 active:scale-[0.98] text-gray-900">
          {tpl.icon} {tpl.name}
        </button>
      ))}
    </div>
  );
}

function BudgetOverview({ cards }: { cards: ProductionCard[] }) {
  const active = cards.filter((c) => c.status === 'active' || c.status === 'paused');
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-900">💰 全案件 予算消化一覧</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 text-gray-800">
              <th className="text-left px-3 py-2 font-semibold">案件</th>
              <th className="text-right px-3 py-2 font-semibold">受注額</th>
              <th className="text-right px-3 py-2 font-semibold">予算</th>
              <th className="text-right px-3 py-2 font-semibold">消化</th>
              <th className="text-right px-3 py-2 font-semibold">残</th>
              <th className="px-3 py-2 font-semibold w-28">消化率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {active.map((c) => {
              const cost = c.tasks.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
              const amendments = (c.amendments ?? []).reduce((s, a) => s + a.amount, 0);
              const totalAmount = c.amount + amendments;
              const budget = (c.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget;
              const remain = budget - cost;
              const pct = budget > 0 ? Math.round((cost / budget) * 100) : 0;
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-semibold text-gray-900 truncate max-w-[12rem]">{c.dealName}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">{formatYen(totalAmount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">{formatYen(budget)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-900">{formatYen(cost)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums font-semibold ${remain < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatYen(remain)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 100 ? 'bg-red-600' : pct > 80 ? 'bg-amber-500' : 'bg-blue-600'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className={`text-xs tabular-nums font-semibold ${pct > 100 ? 'text-red-600' : 'text-gray-900'}`}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CrossProjectGantt({ cards, onOpen }: { cards: ProductionCard[]; onOpen?: (id: string) => void }) {
  const TIMELINE_START = new Date('2026-02-01');
  const TIMELINE_END = new Date('2026-09-30');
  const totalDays = Math.ceil((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000);
  const toPct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - TIMELINE_START.getTime()) / 86400000 / totalDays) * 100));
  const todayPct = toPct(new Date('2026-04-05'));
  const months = ['2月','3月','4月','5月','6月','7月','8月','9月'].map((label, i) => ({ label, pct: toPct(new Date(2026, 1 + i, 1)) }));
  const active = cards.filter((c) => c.status !== 'cancelled');

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <p className="text-sm font-semibold text-gray-900 mb-2">📅 全案件タイムライン</p>
      <div className="flex text-xs font-semibold text-gray-700 relative h-4 mb-1">
        {months.map((m) => <span key={m.label} className="absolute" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>{m.label}</span>)}
      </div>
      <div className="space-y-2 relative">
        <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none" style={{ left: `${todayPct}%` }} />
        {active.map((c) => {
          const start = new Date(c.createdAt);
          const lastMs = [...c.milestones].reverse().find((m) => m.dueDate);
          const end = lastMs ? new Date(lastMs.dueDate) : new Date(start.getTime() + 60 * 86400000);
          const startPct = toPct(start);
          const widthPct = Math.max(2, toPct(end) - startPct);
          const statusColor = c.status === 'done' ? 'bg-emerald-500' : c.status === 'paused' ? 'bg-amber-400' : 'bg-blue-600';
          return (
            <div key={c.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded -mx-1 px-1" onClick={() => onOpen?.(c.id)}>
              <div className="w-36 shrink-0 text-xs font-semibold text-gray-900 truncate">{c.dealName}</div>
              <div className="flex-1 relative h-5 bg-gray-100 rounded overflow-hidden">
                <div className={`absolute top-0 h-full rounded ${statusColor}`} style={{ left: `${startPct}%`, width: `${widthPct}%`, opacity: 0.2 + c.progress / 200 }} />
                <div className={`absolute top-0 h-full rounded ${statusColor}`} style={{ left: `${startPct}%`, width: `${(widthPct * c.progress) / 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-xs font-semibold text-gray-900">{c.progress}%</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 text-xs">
        <span className="font-semibold text-gray-700">凡例:</span>
        <span className="flex items-center gap-1 text-gray-700"><span className="inline-block w-3 h-2 bg-blue-600 rounded opacity-30" />未消化</span>
        <span className="flex items-center gap-1 text-gray-700"><span className="inline-block w-3 h-2 bg-blue-600 rounded" />進捗</span>
        <span className="flex items-center gap-1 text-red-600"><span className="inline-block w-0.5 h-2.5 bg-red-500" />今日</span>
      </div>
    </div>
  );
}

function AssignContactButtons({ taskId, taskTitle, cardTitle, clientName, memberId, sentLog, onSent }: { taskId: string; taskTitle: string; cardTitle: string; clientName: string; memberId: string; sentLog?: SentLogEntry[]; onSent?: (entry: Omit<SentLogEntry, 'id'>) => void }) {
  const m = ALL_MEMBERS.find((x) => x.id === memberId);
  if (!m) return null;
  const subject = `【${cardTitle}】${taskTitle}`;
  const body = `${m.name} さん\n\nお疲れさまです。以下のタスクをお願いできますか？\n\n案件: ${cardTitle}（${clientName}）\nタスク: ${taskTitle}\n\nよろしくお願いします。`;
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email ?? '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const slackUrl = m.slackId ? `slack://user?team=&id=${m.slackId}` : '';
  const hasSentGmail = (sentLog ?? []).some((s) => s.taskId === taskId && s.channel === 'gmail');
  const hasSentSlack = (sentLog ?? []).some((s) => s.taskId === taskId && s.channel === 'slack');
  return (
    <div className="flex gap-1 shrink-0">
      {m.email && (
        <a
          href={gmailUrl}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => { e.stopPropagation(); onSent?.({ taskId, channel: 'gmail', to: m.name, sentAt: new Date().toISOString() }); }}
          title={`Gmail: ${m.name}${hasSentGmail ? ' (送信済み)' : ''}`}
          className={`text-xs font-semibold border rounded px-1.5 py-1 active:scale-[0.98] ${hasSentGmail ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'}`}
        >{hasSentGmail ? '✅✉️' : '✉️'}</a>
      )}
      {slackUrl && (
        <a
          href={slackUrl}
          onClick={(e) => { e.stopPropagation(); onSent?.({ taskId, channel: 'slack', to: m.name, sentAt: new Date().toISOString() }); }}
          title={`Slack: ${m.name}${hasSentSlack ? ' (送信済み)' : ''}`}
          className={`text-xs font-semibold border rounded px-1.5 py-1 active:scale-[0.98] ${hasSentSlack ? 'bg-green-50 text-green-700 border-green-200' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'}`}
        >{hasSentSlack ? '✅💬' : '💬'}</a>
      )}
    </div>
  );
}

function TaskRequirementLinker({ taskRefs, items, onToggle }: { taskRefs: string[]; items: RequirementItem[]; onToggle: (itemId: string) => void }) {
  const [open, setOpen] = useState(false);
  const linked = items.filter((i) => taskRefs.includes(i.id));

  return (
    <div className="pl-1 mt-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs font-semibold text-gray-700 hover:text-blue-600 active:scale-[0.98]"
        >
          🔗 要件 {linked.length > 0 ? `(${linked.length})` : '紐付け'}
        </button>
        {linked.map((i) => (
          <span key={i.id} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 truncate max-w-[12rem]" title={i.text}>{i.text}</span>
        ))}
      </div>
      {open && (
        <div className="mt-1.5 p-2 bg-gray-50 border border-gray-200 rounded space-y-1 max-h-56 overflow-y-auto">
          {items.map((i) => {
            const on = taskRefs.includes(i.id);
            return (
              <button
                key={i.id}
                type="button"
                onClick={() => onToggle(i.id)}
                className={`w-full text-left text-xs flex items-center gap-2 px-2 py-1 rounded active:scale-[0.98] ${on ? 'bg-blue-100 text-blue-800' : 'hover:bg-white text-gray-900'}`}
                style={{ paddingLeft: `${8 + i.depth * 10}px` }}
              >
                <span className="shrink-0">{on ? '☑' : '☐'}</span>
                <span className="truncate">{i.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ATTACHMENT_KIND_META: Record<ProductionAttachmentKind, { label: string; icon: string }> = {
  contract: { label: '契約書',   icon: '📜' },
  proposal: { label: '提案書',   icon: '📄' },
  quote:    { label: '見積書',   icon: '🧾' },
  spec:     { label: '仕様書',   icon: '📘' },
  design:   { label: 'デザイン', icon: '🎨' },
  other:    { label: 'その他',   icon: '📎' },
};

function HandoffPanel({
  card,
  open,
  setOpen,
  pmName,
  teamNames,
  grossProfit,
  grossRate,
  onFieldChange,
}: {
  card: ProductionCard;
  open: boolean;
  setOpen: (v: boolean) => void;
  pmName: string;
  teamNames: string[];
  grossProfit: number;
  grossRate: number;
  onFieldChange: (patch: Partial<ProductionCard>) => void;
}) {
  const [attachDraft, setAttachDraft] = useState<{ kind: ProductionAttachmentKind; name: string; url: string; note: string }>({
    kind: 'contract',
    name: '',
    url: '',
    note: '',
  });

  const addAttachment = () => {
    if (!attachDraft.name.trim() || !attachDraft.url.trim()) return;
    const entry: ProductionAttachment = {
      id: `att_${card.id}_${Date.now()}`,
      kind: attachDraft.kind,
      name: attachDraft.name.trim(),
      url: attachDraft.url.trim(),
      note: attachDraft.note.trim() || undefined,
      addedAt: new Date().toISOString(),
    };
    onFieldChange({ attachments: [entry, ...(card.attachments ?? [])] });
    setAttachDraft({ ...attachDraft, name: '', url: '', note: '' });
  };

  const removeAttachment = (id: string) => {
    onFieldChange({ attachments: (card.attachments ?? []).filter((a) => a.id !== id) });
  };

  const attachments = card.attachments ?? [];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-2.5 bg-gray-50 flex items-center justify-between gap-2 hover:bg-gray-100 active:scale-[0.99] transition-colors"
      >
        <div className="flex items-center gap-2 text-left min-w-0">
          <span className="text-sm font-semibold text-gray-900">📥 引き継ぎ情報</span>
          <span className="text-xs text-gray-600 truncate">営業トーク・見積・契約書・添付</span>
          {attachments.length > 0 && <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 shrink-0">📎 {attachments.length}</span>}
        </div>
        <span className="text-gray-600 text-sm shrink-0">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          <div className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">📄 提案サマリー（営業から）</p>
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{(card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).proposalSummary || '(未記載)'}</p>
          </div>

          <div className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">🗣 営業引き継ぎメモ <span className="text-gray-600 font-normal">何を話してどんな空気だったか</span></p>
            <textarea
              value={card.salesHandoffNotes ?? ''}
              onChange={(e) => onFieldChange({ salesHandoffNotes: e.target.value })}
              placeholder="例: 先方決裁者は情シス部長。4月中に契約締結の意向。競合3社あり。Next.js希望。"
              className="w-full min-h-[100px] text-sm p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y text-gray-900"
            />
          </div>

          <div className="p-3 text-gray-900">
            <p className="text-xs font-semibold text-gray-700 mb-1.5">💰 見積・予算</p>
            <div className="space-y-1 text-sm text-gray-900">
              <div className="flex justify-between"><span className="text-gray-700">受注金額</span><span className="font-semibold tabular-nums">{yen(card.amount)}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">見積合計</span><span className="font-semibold tabular-nums">{yen((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).quoteTotal)}</span></div>
              <div className="flex justify-between"><span className="text-gray-700">制作予算（原価上限）</span><span className="font-semibold tabular-nums">{yen((card.referenceArtifacts ?? { budget: 0, requirement: '', proposalSummary: '' }).budget)}</span></div>
              <div className="flex justify-between border-t border-gray-200 pt-1 mt-1"><span className="text-gray-700">目標粗利</span><span className="font-semibold tabular-nums text-blue-600">{yen(grossProfit)}（{grossRate}%）</span></div>
            </div>
            <div className="text-xs text-gray-700 mt-2">
              <span>営業PM: <span className="font-semibold text-gray-900">{pmName}</span></span>
              {teamNames.length > 0 && <span className="ml-3">チーム: <span className="font-semibold text-gray-900">{teamNames.join('・')}</span></span>}
            </div>
            <AmendmentSection card={card} onFieldChange={onFieldChange} />
          </div>

          <div className="p-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">📎 添付資料 <span className="text-gray-600 font-normal">契約書・提案書・仕様書など</span></p>
            {attachments.length === 0 ? (
              <p className="text-xs text-gray-600 mb-2">まだ資料はありません</p>
            ) : (
              <ul className="divide-y divide-gray-100 mb-3 border border-gray-200 rounded-lg overflow-hidden">
                {attachments.map((a) => {
                  const meta = ATTACHMENT_KIND_META[a.kind];
                  return (
                    <li key={a.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                      <span className="text-xs font-semibold text-gray-700 shrink-0">{meta.icon} {meta.label}</span>
                      <a href={a.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate flex-1 font-semibold">{a.name}</a>
                      {a.note && <span className="text-xs text-gray-600 truncate max-w-[10rem]">{a.note}</span>}
                      <button
                        onClick={() => removeAttachment(a.id)}
                        className="shrink-0 w-6 h-6 rounded text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center active:scale-[0.98]"
                        title="削除"
                      >✕</button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <div className="flex gap-2 flex-wrap">
                <select
                  value={attachDraft.kind}
                  onChange={(e) => setAttachDraft({ ...attachDraft, kind: e.target.value as ProductionAttachmentKind })}
                  className="text-xs text-gray-900 bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(ATTACHMENT_KIND_META) as ProductionAttachmentKind[]).map((k) => (
                    <option key={k} value={k}>{ATTACHMENT_KIND_META[k].icon} {ATTACHMENT_KIND_META[k].label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={attachDraft.name}
                  onChange={(e) => setAttachDraft({ ...attachDraft, name: e.target.value })}
                  placeholder="資料名（例: 業務委託契約書_v1.pdf）"
                  className="flex-1 min-w-[10rem] text-sm bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                />
              </div>
              <input
                type="text"
                value={attachDraft.url}
                onChange={(e) => setAttachDraft({ ...attachDraft, url: e.target.value })}
                placeholder="URL（Google Drive / Dropbox / 社内共有リンク など）"
                className="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
              />
              <div className="flex gap-2 text-gray-900">
                <input
                  type="text"
                  value={attachDraft.note}
                  onChange={(e) => setAttachDraft({ ...attachDraft, note: e.target.value })}
                  placeholder="メモ（任意）"
                  className="flex-1 text-sm bg-white border border-gray-200 rounded px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
                />
                <button
                  type="button"
                  onClick={addAttachment}
                  disabled={!attachDraft.name.trim() || !attachDraft.url.trim()}
                  className="text-sm font-semibold bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] shrink-0"
                >追加</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ACTION_TYPE_META: Record<ProductionActionType, { label: string; icon: string; color: string }> = {
  voice:    { label: '音声打ち合わせ', icon: '🎙', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  meet:     { label: 'ミート',          icon: '🎥', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  phone:    { label: '電話',            icon: '📞', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  email:    { label: 'メール',          icon: '✉️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  incident: { label: '障害',            icon: '🚨', color: 'bg-red-50 text-red-700 border-red-300' },
};

const ACTION_ASSIGNEE_OPTIONS: string[] = [];

function ActionLogSection({
  actions,
  draft,
  setDraft,
  onAdd,
  onRemove,
  onUpdateAction,
  onVoiceSummary,
}: {
  actions: ProductionAction[];
  draft: { type: ProductionActionType; content: string; date: string; time: string; assignee: string };
  setDraft: (d: { type: ProductionActionType; content: string; date: string; time: string; assignee: string }) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdateAction?: (id: string, patch: Partial<ProductionAction>) => void;
  onVoiceSummary?: (text: string) => void;
}) {
  const sorted = [...actions].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const recognitionRef = useRef<unknown>(null);

  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      setDraft({ ...draft, content: '(このブラウザは音声認識未対応。Chrome/Safariでお試しください)' });
      return;
    }
    const rec = new SR() as { lang: string; continuous: boolean; interimResults: boolean; onresult: (e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void; onend: () => void; start: () => void; stop: () => void };
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    let finalText = '';
    rec.onresult = (e) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript(finalText + interim);
    };
    rec.onend = () => { setRecording(false); };
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
    setTranscript('');
    setDraft({ ...draft, type: 'voice' });
  };

  const stopRecordingAndSummarize = async () => {
    const rec = recognitionRef.current as { stop: () => void } | null;
    if (rec) rec.stop();
    setRecording(false);
    if (!transcript.trim()) return;
    setSummarizing(true);
    try {
      const res = await fetch('/api/production/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'summarize-voice', transcript }),
      });
      const j = await res.json() as { text?: string };
      if (j.text) {
        setDraft({ ...draft, content: j.text, type: 'voice' });
        if (onVoiceSummary) onVoiceSummary(j.text);
      }
    } finally {
      setSummarizing(false);
    }
  };

  const runImportReply = async () => {
    if (!replyText.trim()) return;
    setImportBusy(true);
    try {
      const res = await fetch('/api/production/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import-reply', replyText, channel: 'email' }),
      });
      const j = await res.json() as { parsed?: { type?: string; date?: string; content?: string; assignee?: string } };
      const p = j.parsed;
      if (p) {
        const type = (['voice','meet','phone','email'] as const).includes(p.type as never) ? (p.type as ProductionActionType) : 'email';
        setDraft({
          ...draft,
          type,
          date: p.date || draft.date,
          content: p.content || draft.content,
          assignee: p.assignee || draft.assignee,
        });
        setReplyText('');
        setImportOpen(false);
      }
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-gray-900">
      <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-gray-900">📒 顧客アクション履歴 <span className="text-gray-700 font-normal">({actions.length}件)</span></p>
        <button
          type="button"
          onClick={() => setImportOpen(!importOpen)}
          className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 active:scale-[0.98]"
        >📨 返信を貼り付けて取り込み</button>
      </div>

      {importOpen && (
        <div className="p-3 border-b border-gray-200 bg-amber-50/40 space-y-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Gmail/Slackで受け取った返信をそのまま貼り付けてください。AIが種別・日付・要約・送信者を抽出して下のフォームに入れます。"
            className="w-full min-h-[100px] text-sm p-2 border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900 bg-white resize-y"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={runImportReply}
              disabled={importBusy || !replyText.trim()}
              className="text-xs font-semibold bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98]"
            >{importBusy ? 'AI解析中...' : '🤖 AIで取り込み'}</button>
            <button
              type="button"
              onClick={() => { setReplyText(''); setImportOpen(false); }}
              className="text-xs font-semibold bg-white border border-gray-200 text-gray-800 px-3 py-1.5 rounded hover:bg-gray-50 active:scale-[0.98]"
            >キャンセル</button>
          </div>
        </div>
      )}

      <div className="p-3 border-b border-gray-100 bg-gray-50/60 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {(Object.keys(ACTION_TYPE_META) as ProductionActionType[]).map((t) => {
            const meta = ACTION_TYPE_META[t];
            const active = draft.type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDraft({ ...draft, type: t })}
                className={`text-xs font-semibold rounded-full px-2.5 py-1 border active:scale-[0.98] transition-colors ${active ? meta.color : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
              >
                {meta.icon} {meta.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(); } }}
            placeholder="どんな話をした？（例: 仕様レビュー済み、テスト環境の共有依頼あり）"
            className="flex-1 px-2.5 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
          {draft.type === 'voice' && (
            recording ? (
              <button
                type="button"
                onClick={stopRecordingAndSummarize}
                disabled={summarizing}
                className="text-xs font-semibold bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700 active:scale-[0.98] shrink-0 animate-pulse disabled:opacity-50"
              >{summarizing ? '要約中...' : '⏹ 停止して要約'}</button>
            ) : (
              <button
                type="button"
                onClick={startRecording}
                className="text-xs font-semibold bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 active:scale-[0.98] shrink-0"
              >🎙 録音開始</button>
            )
          )}
        </div>
        {draft.type === 'voice' && recording && transcript && (
          <div className="text-xs text-gray-700 bg-white border border-purple-200 rounded p-2 max-h-24 overflow-y-auto">
            <span className="text-purple-700 font-semibold">録音中:</span> {transcript}
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
          <input
            type="time"
            value={draft.time}
            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            className="w-24 px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          />
          <select
            value={draft.assignee}
            onChange={(e) => setDraft({ ...draft, assignee: e.target.value })}
            className="flex-1 min-w-[8rem] px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
          >
            {ACTION_ASSIGNEE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <button
            type="button"
            onClick={onAdd}
            disabled={!draft.content.trim() || !draft.date}
            className="text-sm font-semibold bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98]"
          >記録</button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="p-4 text-xs text-gray-500 text-center">まだ履歴はありません</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {sorted.map((a) => {
            const meta = ACTION_TYPE_META[a.type];
            return (
              <li key={a.id} className="flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50">
                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 border shrink-0 ${meta.color}`}>{meta.icon} {meta.label}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">{a.content}</p>
                  <p className="text-xs text-gray-700 mt-0.5 tabular-nums">{a.date}{a.time ? ` ${a.time}` : ''} · {a.assignee}</p>
                  {a.type === 'incident' && (
                    <select
                      value={a.incidentStatus ?? 'open'}
                      onChange={(e) => onUpdateAction?.(a.id, { incidentStatus: e.target.value as 'open' | 'investigating' | 'resolved' })}
                      className={`mt-1 text-xs font-semibold rounded-full px-2 py-0.5 border focus:ring-2 focus:ring-blue-500 ${
                        (a.incidentStatus ?? 'open') === 'resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        (a.incidentStatus ?? 'open') === 'investigating' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      <option value="open">🔴 未対応</option>
                      <option value="investigating">🟡 対応中</option>
                      <option value="resolved">🟢 解決済み</option>
                    </select>
                  )}
                </div>
                <button
                  onClick={() => onRemove(a.id)}
                  className="shrink-0 w-6 h-6 rounded text-gray-600 hover:text-red-600 hover:bg-red-50 flex items-center justify-center active:scale-[0.98]"
                  title="削除"
                >✕</button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GanttView({ cards }: { cards: ProductionCard[] }) {
  const TIMELINE_START = new Date('2026-02-01');
  const TIMELINE_END = new Date('2026-08-31');
  const totalDays = Math.ceil((TIMELINE_END.getTime() - TIMELINE_START.getTime()) / 86400000);

  function toPercent(d: Date): number {
    return Math.max(0, Math.min(100, ((d.getTime() - TIMELINE_START.getTime()) / 86400000 / totalDays) * 100));
  }

  const todayPct = toPercent(TODAY);
  const MONTH_LABELS = ['2月', '3月', '4月', '5月', '6月', '7月', '8月'];
  const monthOffsets = MONTH_LABELS.map((label, i) => ({
    label,
    pct: toPercent(new Date(2026, 1 + i, 1)),
  }));

  const withDelivery = cards.filter((c) => getDeliveryDate(c));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex text-xs font-semibold text-gray-600 mb-2 relative h-4">
        {monthOffsets.map((m) => (
          <span key={m.label} className="absolute" style={{ left: `${m.pct}%`, transform: 'translateX(-50%)' }}>
            {m.label}
          </span>
        ))}
      </div>
      <div className="space-y-2.5 relative">
        <div className="absolute top-0 bottom-0 w-px bg-red-500 z-10 pointer-events-none" style={{ left: `${todayPct}%` }} />
        {withDelivery.length === 0 && (
          <div className="text-xs text-gray-500 py-8 text-center">納期が設定されたカードがありません</div>
        )}
        {withDelivery.map((c) => {
          const start = new Date(c.createdAt);
          const delivery = getDeliveryDate(c);
          const end = new Date(delivery);
          const startPct = toPercent(start);
          const widthPct = Math.max(1, toPercent(end) - startPct);
          const dl = daysUntil(delivery);
          const dlColor = dl !== null && dl <= 14 ? 'text-red-600' : dl !== null && dl <= 30 ? 'text-blue-600' : 'text-gray-500';
          return (
            <div key={c.id} className="flex items-center gap-3">
              <div className="w-40 shrink-0 text-xs font-semibold text-gray-900 truncate">{c.dealName}</div>
              <div className="flex-1 relative h-6 bg-gray-100 rounded overflow-hidden">
                <div className="absolute top-0 h-full bg-blue-600 rounded" style={{ left: `${startPct}%`, width: `${widthPct}%`, opacity: 0.15 + c.progress / 200 }} />
                <div className="absolute top-0 h-full bg-blue-600 rounded" style={{ left: `${startPct}%`, width: `${(widthPct * c.progress) / 100}%` }} />
              </div>
              <div className="w-16 shrink-0 text-right">
                {dl !== null && (
                  <span className={`text-xs font-semibold ${dlColor}`}>
                    {dl < 0 ? `${Math.abs(dl)}日超過` : `残${dl}日`}
                  </span>
                )}
              </div>
              <div className="w-10 shrink-0 text-right">
                <span className="text-xs font-semibold text-gray-900">{c.progress}%</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs font-semibold text-gray-600">凡例:</span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="inline-block w-3 h-2 bg-blue-600 rounded opacity-30" />未消化
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="inline-block w-3 h-2 bg-blue-600 rounded" />進捗
        </span>
        <span className="flex items-center gap-1 text-xs text-red-500">
          <span className="inline-block w-0.5 h-2.5 bg-red-500" />今日
        </span>
      </div>
    </div>
  );
}
