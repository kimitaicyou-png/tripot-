'use client';

import { useState } from 'react';
import type { Deal, Stage } from '@/lib/deals/types';
import { RESOURCES } from '@/lib/deals/constants';
import { MOCK_COMMS } from '@/lib/deals/mockData';
import { gatherDealContext } from '@/lib/deals/dealContext';

type ProductionTask = {
  id: string;
  title: string;
  detail?: string;
  dueDate: string;
  assigneeId: string;
  status: 'todo' | 'doing' | 'done';
};

type AssignedMember = { resourceId: string; roleLabel: string };

function LoadBadge({ load }: { load: number }) {
  if (load >= 80) return <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">⚠ キャパ限界</span>;
  if (load < 50) return <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">空きあり</span>;
  return <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{load}%</span>;
}

function RequirementPromptDetails({ dealContext }: { dealContext: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {open ? '詳細設定を閉じる' : '詳細設定を開く'}
      </button>
      {open && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">参照コンテキスト（AIへの指示）</label>
          <pre className="w-full px-3 py-2 border border-gray-200 rounded text-xs text-gray-600 bg-gray-50 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{dealContext}</pre>
        </div>
      )}
    </div>
  );
}

export function OrderedFlowSection({ deal, onSendToProduction }: { deal: Deal; onSendToProduction: () => void }) {
  const [requirementState, setRequirementState] = useState<'idle' | 'generating' | 'generated' | 'approved'>('idle');
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [requirementText, setRequirementText] = useState('');
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [deadline, setDeadline] = useState('');
  const [scheduleState, setScheduleState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [scheduleItems, setScheduleItems] = useState<{ phase: string; period: string }[]>([]);
  const [tasksState, setTasksState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);

  const dealContext = gatherDealContext(deal);
  const comms = MOCK_COMMS[deal.id] ?? [];
  const contextNeeds = comms.flatMap((c) => c.needs ?? []);

  const mockRequirement = `# 要件定義書: ${deal.dealName}\n\n## 1. プロジェクト概要\n- クライアント: ${deal.clientName}\n- 案件名: ${deal.dealName}\n- 予算: ¥${deal.amount > 0 ? deal.amount.toLocaleString() : (deal.monthlyAmount ? deal.monthlyAmount.toLocaleString() + '/月' : '別途協議')}\n- 業種: ${deal.industry}\n\n## 2. 背景・課題（顧客ヒアリングより）\n${dealContext}\n## 3. 機能要件（ニーズから導出）\n${contextNeeds.length > 0 ? contextNeeds.map((n, i) => `### 3.${i + 1} ${n}\n- 具体的な実装内容について顧客と詳細確認が必要`).join('\n\n') : `### 3.1 ユーザー管理\n- ログイン/ログアウト機能\n- ロール管理（管理者/一般ユーザー）\n- プロフィール編集\n\n### 3.2 コア機能\n- ダッシュボード（KPI表示）\n- データ入力フォーム\n- レポート生成\n- 通知機能`}\n\n## 4. 非機能要件\n- レスポンス: 3秒以内\n- 稼働率: 99%以上\n- セキュリティ: SSL/TLS、データ暗号化\n- ブラウザ: Chrome/Edge最新版\n\n## 5. 技術スタック\n- フロントエンド: Next.js + TypeScript\n- バックエンド: Supabase\n- インフラ: Vercel\n\n## 6. 画面一覧（概算）\n- ログイン画面\n- ダッシュボード\n- データ入力画面\n- レポート画面\n- 設定画面\n`;

  const handleGenerateRequirement = () => {
    setRequirementState('generating');
    setTimeout(() => { setRequirementText(mockRequirement); setRequirementState('generated'); }, 1500);
  };

  const handleApproveRequirement = () => {
    setRequirementState('approved');
    if (deal.stage === 'ordered') onSendToProduction();
  };

  const handleGenerateTasks = () => {
    setTasksState('generating');
    setTimeout(() => {
      const today = new Date('2026-04-08');
      const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      const baseTasks: Omit<ProductionTask, 'id' | 'assigneeId' | 'status'>[] = [
        { title: 'キックオフMTG準備', detail: '議題・参加者・資料整理', dueDate: addDays(3) },
        { title: 'クライアント要件再ヒアリング', detail: '不明点リストの作成', dueDate: addDays(5) },
        { title: '画面設計（ワイヤー）', detail: '主要5画面のワイヤーフレーム', dueDate: addDays(10) },
        { title: 'DB設計', detail: 'ER図、テーブル定義書', dueDate: addDays(12) },
        { title: '実装フェーズ1（認証）', detail: 'ログイン・権限管理', dueDate: addDays(20) },
        { title: '実装フェーズ2（コア機能）', detail: 'メイン業務ロジック', dueDate: addDays(40) },
        { title: 'テスト・修正', detail: '結合・受入れテスト', dueDate: addDays(55) },
        { title: '納品・運用引き継ぎ', detail: 'マニュアル作成・トレーニング', dueDate: addDays(60) },
      ];
      setTasks(baseTasks.map((t, i) => ({
        ...t,
        id: `task-${Date.now()}-${i}`,
        assigneeId: assignedMembers[i % Math.max(1, assignedMembers.length)]?.resourceId ?? '',
        status: 'todo' as const,
      })));
      setTasksState('generated');
    }, 1500);
  };

  const updateTask = (id: string, patch: Partial<ProductionTask>) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const removeTask = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));
  const addTask = () => { const d = new Date('2026-04-15'); setTasks((prev) => [...prev, { id: `task-${Date.now()}`, title: '新しいタスク', dueDate: d.toISOString().slice(0, 10), assigneeId: assignedMembers[0]?.resourceId ?? '', status: 'todo' }]); };
  const addMember = () => setAssignedMembers((prev) => [...prev, { resourceId: '', roleLabel: '' }]);
  const updateMember = (idx: number, resourceId: string) => setAssignedMembers((prev) => prev.map((m, i) => i === idx ? { ...m, resourceId } : m));
  const removeMember = (idx: number) => setAssignedMembers((prev) => prev.filter((_, i) => i !== idx));

  const handleGenerateSchedule = () => {
    if (!deadline) return;
    setScheduleState('generating');
    setTimeout(() => {
      const end = new Date(deadline);
      const now = new Date('2026-04-07');
      const totalDays = Math.max(14, Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const req = Math.round(totalDays * 0.15);
      const design = Math.round(totalDays * 0.15);
      const dev = Math.round(totalDays * 0.50);
      const test = totalDays - req - design - dev;
      const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }).replace('/', '/');
      const ad = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
      const s1 = now; const e1 = ad(s1, req);
      const s2 = ad(e1, 1); const e2 = ad(s2, design);
      const s3 = ad(e2, 1); const e3 = ad(s3, dev);
      const s4 = ad(e3, 1); const e4 = ad(s4, test);
      setScheduleItems([
        { phase: '要件定義', period: `${fmt(s1)}〜${fmt(e1)}（${req}日間）` },
        { phase: '設計', period: `${fmt(s2)}〜${fmt(e2)}（${design}日間）` },
        { phase: '開発', period: `${fmt(s3)}〜${fmt(e3)}（${dev}日間）` },
        { phase: 'テスト', period: `${fmt(s4)}〜${fmt(e4)}（${test}日間）` },
        { phase: '納品', period: deadline },
      ]);
      setScheduleState('generated');
    }, 1400);
  };

  const assignedMembersValid = assignedMembers.length > 0 && assignedMembers.every((m) => m.resourceId !== '');
  const allReady = requirementState === 'approved' && assignedMembersValid && deadline !== '' && scheduleState === 'generated';

  const summaryLines = [
    { label: '要件定義', value: requirementState === 'approved' ? '承認済み' : '未承認', ok: requirementState === 'approved' },
    { label: 'アサイン', value: assignedMembersValid ? assignedMembers.map((m) => RESOURCES.find((r) => r.id === m.resourceId)?.name ?? '').filter(Boolean).join('、') : '未設定', ok: assignedMembersValid },
    { label: '予算', value: deal.amount > 0 ? `¥${(deal.amount / 10000).toFixed(0)}万` : deal.monthlyAmount ? `¥${(deal.monthlyAmount / 10000).toFixed(0)}万/月` : '未設定', ok: deal.amount > 0 || (deal.monthlyAmount !== undefined && deal.monthlyAmount > 0) },
    { label: '納期', value: deadline || '未設定', ok: deadline !== '' },
    { label: 'スケジュール', value: scheduleState === 'generated' ? '生成済み' : '未生成', ok: scheduleState === 'generated' },
  ];

  return (
    <div className="space-y-4 mb-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">要件定義書</p>
        </div>
        <div className="p-4">
          {requirementState === 'idle' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">追加の指示がなければ、このまま生成できます。カスタマイズしたい場合は下の詳細設定を開いてください。</div>
              <RequirementPromptDetails dealContext={dealContext} />
              <button onClick={handleGenerateRequirement} className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">AIで要件定義を生成</button>
            </div>
          )}
          {requirementState === 'generating' && (
            <div className="flex items-center justify-center py-6 gap-3">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-500">要件定義書を生成中...</span>
            </div>
          )}
          {(requirementState === 'generated' || requirementState === 'approved') && (
            <div className="space-y-3">
              <textarea value={requirementText} onChange={(e) => setRequirementText(e.target.value)} rows={14} readOnly={requirementState === 'approved'}
                className={`w-full px-3 py-2.5 border border-gray-200 rounded text-xs text-gray-900 font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 resize-none ${requirementState === 'approved' ? 'bg-gray-50 text-gray-600' : ''}`} />
              {requirementState === 'generated' && (
                <div className="flex gap-2">
                  <button onClick={handleApproveRequirement} className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">承認する</button>
                  <button onClick={handleGenerateRequirement} className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors active:scale-[0.98]">AIで再生成</button>
                </div>
              )}
              {requirementState === 'approved' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  <span className="text-sm font-semibold text-gray-700">要件定義 承認済み</span>
                  <button onClick={() => setRequirementState('generated')} className="ml-auto text-xs text-gray-500 hover:text-gray-700 font-medium">編集</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {requirementState === 'approved' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">タスク</p>
            {tasks.length > 0 && <span className="text-xs font-semibold text-gray-500">{tasks.length}件</span>}
          </div>
          <div className="p-4 space-y-3">
            {tasksState === 'idle' && (
              <button onClick={handleGenerateTasks} className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">AIで要件定義からタスクを生成</button>
            )}
            {tasksState === 'generating' && (
              <div className="flex items-center justify-center py-6 gap-3">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">タスクを生成中...</span>
              </div>
            )}
            {tasksState === 'generated' && (
              <>
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const res = RESOURCES.find((r) => r.id === task.assigneeId);
                    return (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                        <div className="flex items-start gap-2 mb-2">
                          <input type="text" value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1" />
                          <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-600 text-sm shrink-0 px-1">×</button>
                        </div>
                        {task.detail !== undefined && (
                          <input type="text" value={task.detail} onChange={(e) => updateTask(task.id, { detail: e.target.value })} placeholder="詳細"
                            className="w-full text-xs text-gray-600 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1 mb-2" />
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">期限</span>
                            <input type="date" value={task.dueDate} onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                              className="text-xs text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                          </div>
                          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                            <span className="text-xs text-gray-500">担当</span>
                            <select value={task.assigneeId} onChange={(e) => updateTask(task.id, { assigneeId: e.target.value })}
                              className="flex-1 text-xs text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white">
                              <option value="">未アサイン</option>
                              <optgroup label="社内">
                                {RESOURCES.filter((r) => r.type === 'inhouse').map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                              </optgroup>
                              <optgroup label="外注">
                                {RESOURCES.filter((r) => r.type === 'outsource').map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                              </optgroup>
                            </select>
                            {res && <LoadBadge load={res.load} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button onClick={addTask} className="flex-1 py-2 border border-dashed border-gray-300 rounded text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors active:scale-[0.98]">+ タスクを追加</button>
                  <button onClick={handleGenerateTasks} className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors active:scale-[0.98]">AIで再生成</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">アサイン</p></div>
        <div className="p-4 space-y-3">
          {assignedMembers.length === 0 && <p className="text-xs text-gray-500">メンバーを追加してください。各メンバーの稼働率が確認できます。</p>}
          <div className="space-y-2">
            {assignedMembers.map((m, i) => {
              const res = RESOURCES.find((r) => r.id === m.resourceId);
              return (
                <div key={i} className="flex items-center gap-2">
                  <select value={m.resourceId} onChange={(e) => updateMember(i, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
                    <option value="">選択してください</option>
                    <optgroup label="社内">{RESOURCES.filter((r) => r.type === 'inhouse').map((r) => (<option key={r.id} value={r.id}>{r.name}（{r.role}）</option>))}</optgroup>
                    <optgroup label="外注">{RESOURCES.filter((r) => r.type === 'outsource').map((r) => (<option key={r.id} value={r.id}>{r.name}（{r.role}）</option>))}</optgroup>
                  </select>
                  {res && <LoadBadge load={res.load} />}
                  <button onClick={() => removeMember(i)} className="text-gray-500 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                </div>
              );
            })}
          </div>
          <button onClick={addMember} className="w-full py-2 border border-dashed border-gray-300 rounded text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors active:scale-[0.98]">+ メンバーを追加</button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">納期・スケジュール</p></div>
        <div className="p-4 space-y-4">
          <div>
            <label htmlFor="deadline" className="block text-xs font-medium text-gray-700 mb-1.5">納期 <span className="text-red-500">*</span></label>
            <input id="deadline" type="date" value={deadline} onChange={(e) => { setDeadline(e.target.value); setScheduleState('idle'); setScheduleItems([]); }}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          </div>
          {deadline && scheduleState !== 'generated' && (
            <button onClick={handleGenerateSchedule} disabled={scheduleState === 'generating'}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors active:scale-[0.98]">
              {scheduleState === 'generating' ? (<span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />スケジュールを逆算中...</span>) : 'AIでスケジュールを逆算'}
            </button>
          )}
          {scheduleState === 'generated' && scheduleItems.length > 0 && (
            <div className="space-y-2">
              {scheduleItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-semibold text-gray-700 w-20 shrink-0">{item.phase}</span>
                  <span className="text-xs text-gray-600 text-right">{item.period}</span>
                </div>
              ))}
              <button onClick={() => { setScheduleState('idle'); setScheduleItems([]); }} className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors active:scale-[0.98]">AIで再生成</button>
            </div>
          )}
        </div>
      </div>

      {requirementState === 'approved' && (
        <div className={`rounded-lg border p-4 ${allReady ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">制作に渡す</p>
          <div className="space-y-1.5 mb-4">
            {summaryLines.map((line) => (
              <div key={line.label} className="flex items-center gap-2">
                {line.ok ? (
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center shrink-0"><span className="w-2 h-2 bg-gray-300 rounded-full" /></span>
                )}
                <span className="text-xs font-semibold text-gray-700 w-24 shrink-0">{line.label}</span>
                <span className={`text-xs ${line.ok ? 'text-gray-700' : 'text-gray-500'}`}>{line.value}</span>
              </div>
            ))}
          </div>
          <button disabled={!allReady} onClick={() => { if (allReady) setShowSendConfirm(true); }}
            className={`w-full py-3 rounded text-sm font-semibold transition-colors ${allReady ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}>
            {allReady ? '制作パイプラインに渡す →' : '全項目を入力してください'}
          </button>
          {showSendConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSendConfirm(false)}>
              <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-semibold text-gray-900 mb-2">制作チームに引き継ぎます</p>
                <p className="text-sm text-gray-600 mb-4">要件定義・アサイン・スケジュールを確認しましたか？</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowSendConfirm(false)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">戻る</button>
                  <button onClick={() => { setShowSendConfirm(false); onSendToProduction(); }} className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">引き継ぐ</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
