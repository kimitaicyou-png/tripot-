'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Deal, ProcessTask, HistoryEvent } from '@/lib/deals/types';
import { RESOURCES } from '@/lib/deals/constants';
import { addProductionCard, buildProductionCard, updateProductionCard, fetchProductionCards } from '@/lib/productionCards';
import { MEMBERS } from '@/lib/currentMember';
import { sendNotification } from '@/lib/notifications';
import { getPartners, addPartner, type ExternalPartner } from '@/lib/externalPartners';

export function ProcessTab({ deal, onUpdate, onAppendHistory }: {
  deal: Deal;
  onUpdate: (next: Deal) => void;
  onAppendHistory: (event: Omit<HistoryEvent, 'id' | 'at'>) => void;
}) {
  const proc = deal.process ?? { requirementsGenerated: false, wbsGenerated: false, committedToProduction: false };
  const router = useRouter();

  const [reqGenerating, setReqGenerating] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [wbsGenerating, setWbsGenerating] = useState(false);
  const [partners, setPartners] = useState<ExternalPartner[]>(() => getPartners());
  const [showAddPartner, setShowAddPartner] = useState<string | null>(null);
  const [newPartnerForm, setNewPartnerForm] = useState({ companyName: '', contactName: '', role: '', email: '' });
  const [toast, setToast] = useState('');
  const defaultPmId = proc.pmId ?? MEMBERS.find((m) => m.name === deal.assignee)?.id ?? MEMBERS[0].id;
  const [pmId, setPmId] = useState<string>(defaultPmId);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>(proc.teamMemberIds ?? []);

  useEffect(() => {
    if (!proc.committedToProduction || !proc.handoffCardId) return;
    const pmMember = MEMBERS.find((m) => m.id === pmId);
    (async () => { await updateProductionCard(proc.handoffCardId!, { pmId, pmName: pmMember?.name ?? deal.assignee, teamMemberIds }); })();
  }, [pmId, teamMemberIds, proc.committedToProduction, proc.handoffCardId, deal.assignee]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const getInternalMemberName = (id: string) => MEMBERS.find((m) => m.id === id)?.name ?? id;
  const getExternalPartnerLabel = (id: string) => { const p = partners.find((x) => x.id === id); return p ? `${p.companyName} / ${p.contactName}` : id; };

  const mockReqDoc = `# 要件定義書: ${deal.dealName}\n\n## 1. プロジェクト概要\n- クライアント: ${deal.clientName}\n- 案件名: ${deal.dealName}\n- 予算: ¥${deal.amount > 0 ? deal.amount.toLocaleString() : deal.monthlyAmount ? deal.monthlyAmount.toLocaleString() + '/月' : '別途協議'}\n- 業種: ${deal.industry}\n\n## 2. 背景・課題\n- 業務効率化・デジタル化の推進が急務\n- 現行システムの老朽化・保守コスト増大\n\n## 3. 機能要件\n### 3.1 ユーザー管理\n- ログイン/ログアウト / ロール管理 / プロフィール編集\n\n### 3.2 コア機能\n- ダッシュボード（KPI表示）/ データ入力 / レポート生成 / 通知\n\n## 4. 非機能要件\n- レスポンス3秒以内 / 稼働率99%以上 / SSL/TLS暗号化\n\n## 5. 技術スタック\n- フロントエンド: Next.js + TypeScript\n- バックエンド: Supabase / インフラ: Vercel`;

  const wbsTemplates: Record<string, string[]> = {
    'IT': ['トップページデザイン', '下層ページデザイン', 'HTMLコーディング', 'バックエンド実装', 'テスト', 'ディレクション', 'SEO設定', 'リリース対応'],
    '製造業': ['要件ヒアリング', '基本設計', 'DB設計', 'API実装', 'フロントエンド実装', '結合テスト', '受入テスト', '運用引継ぎ'],
    '医療': ['要件ヒアリング', 'セキュリティ設計', '基本設計', '実装（認証・RBAC）', '実装（業務機能）', 'バリデーションテスト', '受入テスト', 'ドキュメント作成'],
  };

  const handleGenerateReq = () => {
    setReqGenerating(true);
    setTimeout(() => {
      onUpdate({ ...deal, process: { ...proc, requirementsGenerated: true, requirementsDoc: mockReqDoc } });
      setReqGenerating(false);
      setReqOpen(true);
    }, 1500);
  };

  const handleGenerateWbs = () => {
    setWbsGenerating(true);
    setTimeout(() => {
      const titles = wbsTemplates[deal.industry] ?? wbsTemplates['IT'];
      const today = new Date('2026-04-08');
      const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      const newTasks: ProcessTask[] = titles.map((title, i) => ({
        id: `ptask_${Date.now()}_${i}`, title, dueDate: addDays((i + 1) * 7), assigneeType: 'unassigned' as const, hours: 8,
      }));
      onUpdate({ ...deal, process: { ...proc, requirementsGenerated: true, requirementsDoc: proc.requirementsDoc ?? mockReqDoc, wbsGenerated: true, tasks: newTasks, committedToProduction: proc.committedToProduction, committedAt: proc.committedAt } });
      setWbsGenerating(false);
    }, 1500);
  };

  const updateTask = (id: string, patch: Partial<ProcessTask>) => {
    const tasks = (proc.tasks ?? []).map((t) => t.id === id ? { ...t, ...patch } : t);
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };
  const removeTask = (id: string) => onUpdate({ ...deal, process: { ...proc, tasks: (proc.tasks ?? []).filter((t) => t.id !== id) } });
  const addTask = () => {
    const nt: ProcessTask = { id: `ptask_${Date.now()}`, title: '新しいタスク', dueDate: '2026-04-15', assigneeType: 'unassigned', hours: 8 };
    onUpdate({ ...deal, process: { ...proc, tasks: [...(proc.tasks ?? []), nt] } });
  };

  const applyPreset = () => {
    const tasks = (proc.tasks ?? []).map((t) => {
      const title = t.title.toLowerCase();
      if (title.includes('デザイン') || title.includes('ワイヤー') || title.includes('カンプ')) return { ...t, assigneeType: 'internal' as const, internalMemberId: MEMBERS[0]?.id ?? '' };
      if (title.includes('コーディング') || title.includes('コード') || title.includes('実装') || title.includes('バックエンド')) { const p = partners[0]; return { ...t, assigneeType: 'external' as const, externalPartnerId: p?.id }; }
      if (title.includes('ディレクション') || title.includes('pm') || title.includes('PM')) return { ...t, assigneeType: 'internal' as const, internalMemberId: MEMBERS[1]?.id ?? '' };
      return t;
    });
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };

  const handleAddPartner = (taskId: string) => {
    const { companyName, contactName } = newPartnerForm;
    if (!companyName.trim() || !contactName.trim()) return;
    const newP = addPartner({ companyName: companyName.trim(), contactName: contactName.trim(), role: newPartnerForm.role.trim() || undefined, email: newPartnerForm.email.trim() || undefined });
    setPartners(getPartners());
    updateTask(taskId, { assigneeType: 'external', externalPartnerId: newP.id });
    setShowAddPartner(null);
    setNewPartnerForm({ companyName: '', contactName: '', role: '', email: '' });
  };

  const allAssigned = (proc.tasks ?? []).length > 0 && (proc.tasks ?? []).every((t) => t.assigneeType !== 'unassigned');
  const lockedByHandoff = proc.committedToProduction;

  const handleCommit = async () => {
    const now = new Date().toISOString();
    const internalTasks = (proc.tasks ?? []).filter((t) => t.assigneeType === 'internal' && t.internalMemberId);
    const pmMember = MEMBERS.find((m) => m.id === pmId);
    const quoteTotal = deal.revenueType === 'running' ? (deal.monthlyAmount ?? 0) * 12 : deal.amount;
    const card = buildProductionCard({
      dealId: deal.id, dealName: deal.dealName, clientName: deal.clientName, amount: quoteTotal,
      pmId, pmName: pmMember?.name ?? deal.assignee, teamMemberIds,
      externalPartnerIds: (proc.tasks ?? []).filter((t) => t.assigneeType === 'external' && t.externalPartnerId).map((t) => t.externalPartnerId!).filter((v, i, a) => a.indexOf(v) === i),
      requirement: proc.requirementsDoc ?? '', proposalSummary: `${deal.dealName} / ${deal.clientName}`,
      quoteTotal, budget: quoteTotal, handedOffBy: deal.assignee,
    });
    const reqDoc = proc.requirementsDoc ?? '';
    const reqLines = reqDoc.split('\n').filter((l) => l.trim().startsWith('- ') || /^\d+\./.test(l.trim())).slice(0, 6);
    const fallbackTitles = ['要件確認MTG', '画面設計', 'API設計', '実装', 'テスト', 'リリース'];
    const autoTaskTitles = reqLines.length > 0 ? reqLines.map((l) => l.replace(/^[-\d.)\s]+/, '').trim()) : fallbackTitles;
    card.tasks = autoTaskTitles.map((title, i) => ({ id: `t_${card.id}_${i}`, title, status: 'todo' as const, assigneeId: i === 0 ? pmId : teamMemberIds[i % Math.max(teamMemberIds.length, 1)] ?? pmId }));
    card.phase = 'requirements';
    await addProductionCard(card);

    sendNotification({ toMemberId: pmId, fromMemberId: 'system', fromName: 'システム', type: 'task_assigned', title: `制作引き渡し: ${deal.dealName}`, body: `${deal.clientName} の案件が制作に引き渡されました。PM: ${pmMember?.name ?? ''}`, link: '/production' });
    internalTasks.forEach((t) => {
      if (t.internalMemberId === pmId) return;
      sendNotification({ toMemberId: t.internalMemberId!, fromMemberId: 'system', fromName: 'システム', type: 'task_assigned', title: `制作タスクをアサインしました`, body: `${deal.dealName}（${deal.clientName}）の「${t.title}」が割り当てられました。`, link: '/production' });
    });

    onUpdate({ ...deal, process: { ...proc, committedToProduction: true, committedAt: now, pmId, teamMemberIds, handoffCardId: card.id } });
    onAppendHistory({ type: 'note', title: '制作に引き渡し', actor: deal.assignee, description: `PM: ${pmMember?.name ?? '-'} / 内部${internalTasks.length}件 / チーム${teamMemberIds.length}名。ProductionCard生成済。` });
    showToast('制作に引き渡しました。ダッシュボードに移動します');
    setTimeout(() => router.push('/production'), 800);
  };

  const stepDone1 = proc.requirementsGenerated;
  const stepDone2 = proc.wbsGenerated && (proc.tasks ?? []).length > 0;

  return (
    <div className="space-y-4 pt-2 pb-8">
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-sm z-50">{toast}</div>}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🔧</span>
        <p className="text-sm font-semibold text-gray-900">工程・アサイン</p>
        {proc.committedToProduction && <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">制作ライン投入済み</span>}
      </div>

      <div className="flex gap-2 items-start">
        {[
          { n: 1, label: '要件定義', done: stepDone1 },
          { n: 2, label: '工程吐き出し', done: stepDone2 },
          { n: 3, label: 'アサイン', done: allAssigned && stepDone2 },
          { n: 4, label: 'PM・チーム', done: !!pmId && teamMemberIds.length > 0 },
          { n: 5, label: '制作引き渡し', done: proc.committedToProduction },
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${s.done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.done ? '✓' : s.n}</div>
            <p className="text-xs text-gray-500 text-center leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      {lockedByHandoff && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700">📦 制作に引き渡し済み — 要件定義・WBS・タスクアサインは参照のみ（PM・チーム変更は可能、制作カードに即反映）</div>}

      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${lockedByHandoff ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">① 要件定義</p>
          {stepDone1 && <span className="text-xs font-semibold text-blue-600">生成済み</span>}
        </div>
        <div className="p-4">
          {!stepDone1 ? (
            <button onClick={handleGenerateReq} disabled={reqGenerating}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all duration-200">
              {reqGenerating ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />要件定義を生成中...</span> : '① 要件定義を生成'}
            </button>
          ) : (
            <div className="space-y-2">
              <button onClick={() => setReqOpen((v) => !v)} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors active:scale-[0.98]">
                <svg className={`w-4 h-4 transition-transform ${reqOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                {reqOpen ? '要件定義書を閉じる' : '要件定義書を見る'}
              </button>
              {reqOpen && <pre className="w-full px-3 py-2.5 border border-gray-200 rounded text-xs text-gray-800 bg-gray-50 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{proc.requirementsDoc}</pre>}
              <button onClick={handleGenerateReq} disabled={reqGenerating} className="text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">{reqGenerating ? '再生成中...' : '再生成'}</button>
            </div>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${!stepDone1 || lockedByHandoff ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">② 工程吐き出し（WBS）</p>
          {stepDone2 && <span className="text-xs font-semibold text-blue-600">{(proc.tasks ?? []).length}件</span>}
        </div>
        <div className="p-4">
          {!stepDone2 ? (
            <button onClick={handleGenerateWbs} disabled={wbsGenerating || !stepDone1}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all duration-200">
              {wbsGenerating ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />工程を生成中...</span> : '② 工程を吐き出す'}
            </button>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{(proc.tasks ?? []).length}件のタスクが生成されました</p>
                <div className="flex gap-2">
                  <button onClick={applyPreset} className="text-xs font-medium text-blue-600 hover:text-blue-800 active:scale-[0.98] transition-all">一括アサイン</button>
                  <button onClick={handleGenerateWbs} disabled={wbsGenerating} className="text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">再生成</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {stepDone2 && (proc.tasks ?? []).length > 0 && (
        <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${lockedByHandoff ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">③ アサイン</p>
            <div className="flex items-center gap-2">
              {allAssigned && <span className="text-xs font-semibold text-blue-600">全員アサイン済み</span>}
              <button onClick={applyPreset} className="text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 rounded px-2 py-0.5 active:scale-[0.98] transition-all">プリセット</button>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {(proc.tasks ?? []).map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <input type="text" value={task.title} onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1" />
                  <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-600 text-sm shrink-0">×</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">内外</span>
                    <select value={task.assigneeType} onChange={(e) => updateTask(task.id, { assigneeType: e.target.value as ProcessTask['assigneeType'], internalMemberId: undefined, externalPartnerId: undefined })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                      <option value="unassigned">未アサイン</option>
                      <option value="internal">内部</option>
                      <option value="external">外部</option>
                    </select>
                  </div>
                  {task.assigneeType === 'internal' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">担当</span>
                      <select value={task.internalMemberId ?? ''} onChange={(e) => updateTask(task.id, { internalMemberId: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                        <option value="">選択</option>
                        {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                  {task.assigneeType === 'external' && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-gray-500">パートナー</span>
                      <select value={task.externalPartnerId ?? ''} onChange={(e) => updateTask(task.id, { externalPartnerId: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                        <option value="">選択</option>
                        {partners.map((p) => <option key={p.id} value={p.id}>{p.companyName} / {p.contactName}{p.role ? ` (${p.role})` : ''}</option>)}
                      </select>
                      <button onClick={() => setShowAddPartner(task.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-[0.98] transition-all">＋ 新規パートナー登録</button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">期限</span>
                    <input type="date" value={task.dueDate ?? ''} onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">工数</span>
                    <input type="number" value={task.hours ?? ''} onChange={(e) => updateTask(task.id, { hours: Number(e.target.value) })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-14 focus:ring-1 focus:ring-blue-500 focus:outline-none" min={0} />
                    <span className="text-xs text-gray-500">h</span>
                  </div>
                </div>
                {showAddPartner === task.id && (
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2 mt-1">
                    <p className="text-xs font-semibold text-blue-700">外部パートナーを追加</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="会社名 *" value={newPartnerForm.companyName} onChange={(e) => setNewPartnerForm((f) => ({ ...f, companyName: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="text" placeholder="担当者名 *" value={newPartnerForm.contactName} onChange={(e) => setNewPartnerForm((f) => ({ ...f, contactName: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="text" placeholder="役割（任意）" value={newPartnerForm.role} onChange={(e) => setNewPartnerForm((f) => ({ ...f, role: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="email" placeholder="メール（任意）" value={newPartnerForm.email} onChange={(e) => setNewPartnerForm((f) => ({ ...f, email: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAddPartner(null)} className="text-xs text-gray-500 font-medium active:scale-[0.98] transition-all">キャンセル</button>
                      <button onClick={() => handleAddPartner(task.id)} className="text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded active:scale-[0.98] transition-all">追加</button>
                    </div>
                  </div>
                )}
                {task.assigneeType !== 'unassigned' && (
                  <p className="text-xs text-gray-500">
                    {task.assigneeType === 'internal' && task.internalMemberId ? `内部: ${getInternalMemberName(task.internalMemberId)}` : ''}
                    {task.assigneeType === 'external' && task.externalPartnerId ? `外部: ${getExternalPartnerLabel(task.externalPartnerId)}` : ''}
                  </p>
                )}
              </div>
            ))}
            <button onClick={addTask} className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors active:scale-[0.98]">+ タスクを追加</button>
          </div>
        </div>
      )}

      {stepDone2 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">④ PM・チーム組成</p>
            {pmId && teamMemberIds.length > 0 && <span className="text-xs font-semibold text-blue-600">設定済み</span>}
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">担当PM（1名）</label>
              <select value={pmId} onChange={(e) => setPmId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <p className="text-xs text-gray-500 mt-1">引き渡し後も担当PMは変更できます（制作カードに反映）</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">チーム候補（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {MEMBERS.filter((m) => m.id !== pmId).map((m) => {
                  const selected = teamMemberIds.includes(m.id);
                  return (
                    <button key={m.id} type="button"
                      onClick={() => setTeamMemberIds((prev) => prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id])}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.98] ${selected ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                      {selected ? '✓ ' : ''}{m.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">選んだメンバーは制作カードのチームに含まれ、/productionで見えるようになります</p>
            </div>
          </div>
        </div>
      )}

      {stepDone2 && (
        <div className={`rounded-2xl border p-4 ${allAssigned && pmId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">⑤ 制作に引き渡す</p>
            {proc.committedToProduction && proc.committedAt && <p className="text-xs text-gray-500">{new Date(proc.committedAt).toLocaleDateString('ja-JP')} 引き渡し済</p>}
          </div>
          {!allAssigned && <p className="text-xs text-gray-500 mb-3">全タスクのアサインが完了すると引き渡しできます（未アサイン: {(proc.tasks ?? []).filter((t) => t.assigneeType === 'unassigned').length}件）</p>}
          {allAssigned && !pmId && <p className="text-xs text-gray-500 mb-3">担当PMを選択してください</p>}
          {proc.committedToProduction ? (
            <div className="space-y-2">
              <button onClick={() => router.push('/production')} className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 active:scale-[0.98]">📥 制作ダッシュボードでカードを見る →</button>
              <button onClick={handleCommit} className="w-full py-2 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]">引き渡し情報を更新</button>
            </div>
          ) : (
            <button disabled={!allAssigned || !pmId} onClick={handleCommit}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${allAssigned && pmId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-500 cursor-not-allowed'}`}>
              🚀 制作に引き渡す
            </button>
          )}
        </div>
      )}
    </div>
  );
}
