'use client';

import { useState, useEffect } from 'react';
import { loadAllDeals as loadAllDealsForAttack, addDeal as addDealForAttack, updateDeal as updateDealForAttack } from '@/lib/dealsStore';
import type { EightCard, AttackTarget, TrackingEvent } from '@/lib/attack/types';
import { scoreCards, isWithin48h, isWithin24h, relativeTime } from '@/lib/attack/scoring';
import { loadTargets, saveTargets } from '@/lib/attack/store';
import { CURRENT_USER, PRIORITY_CONFIG, STATUS_CONFIG, TRACKING_TYPE_CONFIG, MOCK_EIGHT_CARDS, MOCK_TRACKING } from '@/lib/attack/constants';

function getTrackingByTarget(targetId: string): TrackingEvent[] {
  return MOCK_TRACKING.filter((e: TrackingEvent) => e.targetId === targetId).sort(
    (a: TrackingEvent, b: TrackingEvent) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function TrackingTimeline({ targetId }: { targetId: string }) {
  const events = getTrackingByTarget(targetId);
  if (events.length === 0) return null;
  return (
    <div className="mt-2 pl-2 border-l border-gray-200 space-y-1.5">
      {events.map((event) => {
        const cfg = TRACKING_TYPE_CONFIG[event.type];
        const recent = isWithin24h(event.timestamp);
        return (
          <div key={event.id} className="flex items-start gap-1.5">
            <span className={`mt-0.5 shrink-0 ${recent ? 'text-blue-600' : 'text-gray-500'}`}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {event.type === 'email_open' && <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />}
                {event.type === 'link_click' && <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />}
                {event.type === 'page_view' && <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>}
              </svg>
            </span>
            <div className="min-w-0">
              <span className={`text-xs font-semibold ${recent ? 'text-blue-600' : 'text-gray-500'}`}>{cfg.label}</span>
              <span className="text-xs text-gray-500"> — {event.detail}</span>
              <span className={`text-xs ml-1 ${recent ? 'text-blue-600' : 'text-gray-500'}`}>({relativeTime(event.timestamp)})</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ImportModal({ onClose, onImport }: { onClose: () => void; onImport: (cards: EightCard[]) => void }) {
  const [step, setStep] = useState<'select' | 'importing' | 'done'>('select');
  const [selected, setSelected] = useState<Set<string>>(new Set(MOCK_EIGHT_CARDS.map((c: EightCard) => c.id)));
  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const handleImport = () => {
    setStep('importing');
    setTimeout(() => { setStep('done'); setTimeout(() => { onImport(MOCK_EIGHT_CARDS.filter((c: EightCard) => selected.has(c.id))); onClose(); }, 800); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full my-8 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-xl font-semibold text-yellow-900">8</div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Eightから取り込み</h2>
              <p className="text-xs text-gray-600 font-medium">名刺データをアタックリストに変換</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl font-semibold">&times;</button>
        </div>
        {step === 'select' && (
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">{selected.size}/{MOCK_EIGHT_CARDS.length}件 選択中</p>
              <button onClick={() => setSelected(selected.size === MOCK_EIGHT_CARDS.length ? new Set() : new Set(MOCK_EIGHT_CARDS.map((c: EightCard) => c.id)))}
                className="text-xs text-blue-700 font-semibold hover:text-blue-900">{selected.size === MOCK_EIGHT_CARDS.length ? '全解除' : '全選択'}</button>
            </div>
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {MOCK_EIGHT_CARDS.map((card: EightCard) => (
                <label key={card.id} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${selected.has(card.id) ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}>
                  <input type="checkbox" checked={selected.has(card.id)} onChange={() => toggle(card.id)} className="mt-0.5 w-4 h-4 rounded accent-blue-600" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><p className="text-sm font-semibold text-gray-900">{card.name}</p><span className="text-xs text-gray-600 font-medium">{card.position}</span></div>
                    <p className="text-xs text-gray-700 font-semibold">{card.company}</p>
                    <p className="text-xs text-gray-600">{card.exchangedDate} 交換 | {card.industry}</p>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleImport} disabled={selected.size === 0}
              className="w-full mt-4 py-3 bg-yellow-500 text-yellow-900 rounded-xl text-sm font-semibold hover:bg-yellow-400 disabled:bg-gray-300 disabled:text-gray-600 transition-colors active:scale-[0.98]">{selected.size}件を取り込んでAIスコアリング</button>
          </div>
        )}
        {step === 'importing' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-base font-semibold text-gray-900">Eightからインポート中...</p>
            <p className="text-sm text-gray-700 mt-1">AIが名刺データをスコアリングしています</p>
          </div>
        )}
        {step === 'done' && (
          <div className="p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-base font-semibold text-gray-900">取り込み完了！</p>
            <p className="text-sm text-gray-700 mt-1">AIがアタックリストを生成しました</p>
          </div>
        )}
      </div>
    </div>
  );
}

function EmailModal({ target, onClose }: { target: AttackTarget; onClose: () => void }) {
  const [draft, setDraft] = useState(
    `${target.name}様\n\nお世話になっております。${CURRENT_USER.companyShort}の${CURRENT_USER.name}です。\n\n先日は名刺交換をさせていただきありがとうございました。\n${target.memo ? `お話にあった「${target.memo.replace(/。$/, '')}」について、` : ''}弊社で${target.industry}業界向けのソリューションをご提供しております。\n\n直近の導入事例として、同業界のお客様で業務効率30%改善を実現した実績がございます。\n\nもしよろしければ、30分程度のオンラインミーティングで事例のご紹介をさせていただけないでしょうか。\n\nご都合の良い日程をいくつかお教えいただければ幸いです。\n\n何卒よろしくお願いいたします。\n\n${CURRENT_USER.companyName}\n${CURRENT_USER.name}`
  );
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [sent, setSent] = useState(false);
  const handleSend = () => { setSent(true); setTimeout(() => setSent(false), 3000); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full my-8 shadow-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">AIメール作成</span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-900 text-xl font-semibold">&times;</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <p className="text-gray-600 font-semibold">宛先: <span className="text-gray-900">{target.email}</span></p>
            <p className="text-gray-600 font-semibold">件名: <span className="text-gray-900">{`【${CURRENT_USER.companyShort}】${target.industry}向けソリューションのご紹介`}</span></p>
          </div>
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={14}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 font-medium leading-relaxed focus:ring-2 focus:ring-blue-500 resize-none" />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={trackingEnabled} onChange={(e) => setTrackingEnabled(e.target.checked)} className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm text-gray-900 font-semibold">開封トラッキングを有効にする</span>
            <span className="text-xs text-gray-500">（メール開封・リンククリックを記録）</span>
          </label>
          {sent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 font-semibold">
              {trackingEnabled ? 'トラッキングリンクが埋め込まれました。送信完了。' : '送信完了。'}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={handleSend} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 active:scale-[0.98]">Gmail送信</button>
            <button className="flex-1 py-2.5 bg-gray-200 text-gray-800 rounded-xl text-sm font-semibold hover:bg-gray-300 active:scale-[0.98]">コピー</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AttackContent() {
  const [targets, setTargets] = useState<AttackTarget[]>([]);
  const [showImport, setShowImport] = useState(false);
  const [emailTarget, setEmailTarget] = useState<AttackTarget | null>(null);
  const [filterPriority, setFilterPriority] = useState<'all' | 'S' | 'A' | 'B' | 'C' | 'hot'>('all');
  const [loaded, setLoaded] = useState(false);
  const [conversionMsg, setConversionMsg] = useState<string | null>(null);

  useEffect(() => { setTargets(loadTargets()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) saveTargets(targets); }, [targets, loaded]);

  const handleImport = (cards: EightCard[]) => {
    const newTargets = scoreCards(cards, MOCK_TRACKING);
    setTargets((prev) => {
      const existing = new Set(prev.map((t) => `${t.name}__${t.company}`));
      return [...prev, ...newTargets.filter((t) => !existing.has(`${t.name}__${t.company}`))];
    });
  };

  const hotTargetIds = new Set(MOCK_TRACKING.filter((e: TrackingEvent) => isWithin48h(e.timestamp)).map((e: TrackingEvent) => e.targetId));
  const hotCount = targets.filter((t) => hotTargetIds.has(t.id)).length;
  const filtered = (() => {
    if (filterPriority === 'hot') return targets.filter((t) => hotTargetIds.has(t.id));
    if (filterPriority === 'all') return targets;
    return targets.filter((t) => t.priority === filterPriority);
  })();

  const promoteToDealIfNeeded = (target: AttackTarget, status: AttackTarget['status']) => {
    if (status !== 'meeting' && status !== 'dealt') return;
    if (typeof window === 'undefined') return;
    try {
      const deals = loadAllDealsForAttack();
      const dealId = `att-${target.id}`;
      if (deals.some((d: { id: string }) => d.id === dealId)) {
        if (status === 'dealt') updateDealForAttack(dealId, { stage: 'proposal' });
        return;
      }
      addDealForAttack({
        id: dealId, clientName: target.company, dealName: `${target.company} 新規案件`,
        revenueType: 'shot' as const, industry: target.industry || 'その他',
        stage: status === 'dealt' ? 'proposal' as const : 'meeting' as const,
        amount: 0, probability: status === 'dealt' ? 50 : 30,
        assignee: '柏樹 久美子', lastDate: new Date().toISOString().slice(0, 10),
        memo: target.memo || `アタックリストから${status === 'dealt' ? '案件化' : '商談化'}`,
      });
      setConversionMsg(`${target.company} を案件管理に追加しました`);
      setTimeout(() => setConversionMsg(null), 3000);
    } catch {}
  };

  const updateStatus = (id: string, status: AttackTarget['status']) => {
    setTargets((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    const t = targets.find((x) => x.id === id);
    if (t) promoteToDealIfNeeded(t, status);
  };

  const counts = { S: targets.filter((t) => t.priority === 'S').length, A: targets.filter((t) => t.priority === 'A').length, B: targets.filter((t) => t.priority === 'B').length, C: targets.filter((t) => t.priority === 'C').length };

  return (
    <div className="max-w-lg mx-auto px-4 py-5">
      {conversionMsg && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm">✓ {conversionMsg}</div>}
      <div className="mb-5">
        <h1 className="text-lg font-semibold text-gray-900">アタックリスト</h1>
        <p className="text-xs text-gray-500">Eightの名刺データからAIが優先順位付け</p>
      </div>

      {targets.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-yellow-100 rounded-2xl mx-auto mb-4 flex items-center justify-center"><span className="text-4xl font-semibold text-yellow-600">8</span></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Eightから名刺を取り込もう</h2>
          <p className="text-sm text-gray-700 mb-6">名刺データをAIが分析し、攻めるべき見込み客を優先順位付けします。</p>
          <button onClick={() => setShowImport(true)} className="px-6 py-3 bg-yellow-500 text-yellow-900 rounded-xl text-base font-semibold hover:bg-yellow-400 transition-colors active:scale-[0.98]">Eightから取り込み</button>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2 mb-4">
            <div className="grid grid-cols-4 gap-2 flex-1">
              {(['S', 'A', 'B', 'C'] as const).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <div key={p} className="text-center bg-white border border-gray-200 rounded-lg p-2">
                    <div className={`w-8 h-8 ${cfg.bg} rounded-lg mx-auto mb-1 flex items-center justify-center`}><span className={`text-sm font-semibold ${cfg.text}`}>{p}</span></div>
                    <p className="text-lg font-semibold text-gray-900">{counts[p]}</p>
                  </div>
                );
              })}
            </div>
            {hotCount > 0 && (
              <button onClick={() => setFilterPriority(filterPriority === 'hot' ? 'all' : 'hot')}
                className={`shrink-0 flex flex-col items-center justify-center rounded-lg border px-3 py-2 min-w-[64px] transition-colors ${filterPriority === 'hot' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-200 text-gray-900 hover:bg-blue-50 hover:border-blue-300'}`}>
                <span className="text-base font-semibold leading-none">{hotCount}</span>
                <span className={`text-xs font-semibold mt-0.5 ${filterPriority === 'hot' ? 'text-blue-100' : 'text-blue-600'}`}>ホット</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 flex-wrap">
              {(['all', 'S', 'A', 'B', 'C'] as const).map((k) => (
                <button key={k} onClick={() => setFilterPriority(k)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filterPriority === k ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{k === 'all' ? '全て' : k}</button>
              ))}
            </div>
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-semibold border border-yellow-300 hover:bg-yellow-200 active:scale-[0.98]"><span className="font-semibold">8</span> 追加取込</button>
          </div>

          <div className="space-y-2">
            {filtered.map((target) => {
              const pc = PRIORITY_CONFIG[target.priority];
              const sc = STATUS_CONFIG[target.status];
              const isHot = hotTargetIds.has(target.id);
              return (
                <div key={target.id} className={`bg-white border rounded-lg p-4 ${isHot ? 'border-blue-200' : 'border-gray-200'}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 ${pc.bg} rounded-lg flex items-center justify-center shrink-0`}><span className={`text-sm font-semibold ${pc.text}`}>{target.priority}</span></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900">{target.name}</p>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
                        {isHot && <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">アクティブ</span>}
                      </div>
                      <p className="text-sm text-gray-800 font-semibold">{target.company}</p>
                      <p className="text-xs text-gray-700">{target.position} | {target.industry}</p>
                      <div className="mt-2 bg-purple-50 rounded-lg p-2 border border-purple-200">
                        <p className="text-xs text-purple-800 font-semibold">AI推奨: {target.suggestedAction}</p>
                        <p className="text-xs text-purple-600 mt-0.5">根拠: {target.reason}</p>
                      </div>
                      <TrackingTimeline targetId={target.id} />
                      <div className="flex gap-1.5 mt-2">
                        <button onClick={() => setEmailTarget(target)} className="px-2.5 py-1 bg-green-50 text-green-800 rounded-lg text-xs font-semibold border border-green-200 hover:bg-green-100 active:scale-[0.98]">メール作成</button>
                        <button onClick={() => updateStatus(target.id, 'contacted')} className="px-2.5 py-1 bg-blue-50 text-blue-800 rounded-lg text-xs font-semibold border border-blue-200 hover:bg-blue-100 active:scale-[0.98]">連絡済み</button>
                        <button onClick={() => updateStatus(target.id, 'meeting')} className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-semibold border border-amber-200 hover:bg-amber-100 active:scale-[0.98]">商談化</button>
                        <button onClick={() => updateStatus(target.id, 'dealt')} className="px-2.5 py-1 bg-purple-50 text-purple-800 rounded-lg text-xs font-semibold border border-purple-200 hover:bg-purple-100 active:scale-[0.98]">案件化</button>
                      </div>
                    </div>
                    <div className="text-right shrink-0"><p className="text-lg font-semibold text-gray-900">{target.score}</p><p className="text-xs text-gray-600 font-semibold">スコア</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      {emailTarget && <EmailModal target={emailTarget} onClose={() => setEmailTarget(null)} />}
    </div>
  );
}
