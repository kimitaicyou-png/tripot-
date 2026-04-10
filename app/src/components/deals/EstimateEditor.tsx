'use client';

import { useState } from 'react';
import type { Deal, Slide, Stage, EstimateItem, BudgetItem } from '@/lib/deals/types';
import { getIndustryRates } from '@/lib/deals/constants';
import { gatherDealContext } from '@/lib/deals/dealContext';
import RunningEstimateSection, { MOCK_RUNNING_ITEMS, type RunningItem } from '@/components/personal/RunningEstimateSection';

type EstimateEditorProps = {
  deal: Deal;
  slides?: Slide[];
  onClose: () => void;
  onAutoAdvance?: (id: string, stage: Stage) => void;
};

function EstimatePromptDetails({ prompt, onPromptChange }: { prompt: string; onPromptChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors active:scale-[0.98]"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {open ? '詳細設定を閉じる' : '詳細設定を開く'}
      </button>
      {open && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">AIへの指示</label>
          <textarea value={prompt} onChange={(e) => onPromptChange(e.target.value)} rows={6}
            className="w-full px-3 py-2.5 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 resize-none" />
        </div>
      )}
    </div>
  );
}

export function EstimateEditor({ deal, slides, onClose, onAutoAdvance }: EstimateEditorProps) {
  const rates = getIndustryRates(deal.industry);
  const scheduleSlide = slides?.find((s) => s.type === 'schedule');

  const buildDefaultItems = (): EstimateItem[] => {
    if (scheduleSlide) {
      const phases = scheduleSlide.bullets.filter((b) => b.includes('Phase'));
      return phases.map((b, i) => {
        const name = b.replace(/Phase \d+: /, '').replace(/（.*$/, '').trim();
        const rate = rates[i] ?? rates[0];
        return { name, amount: 0, manMonth: 1, unitPrice: rate.unitPrice };
      });
    }
    return rates.map((r) => ({ name: r.label, amount: 0, manMonth: 1, unitPrice: r.unitPrice }));
  };

  const [tab, setTab] = useState<'estimate' | 'budget'>('estimate');
  const [step, setStep] = useState<'prompt' | 'edit'>(slides ? 'edit' : 'prompt');
  const [items, setItems] = useState<EstimateItem[]>(buildDefaultItems());
  const [notes, setNotes] = useState('・納期: ご発注後約3ヶ月\n・支払条件: 着手30% / 中間30% / 検収40%\n・見積有効期限: 発行日より1ヶ月');
  const [generating, setGenerating] = useState(false);
  const [budgetGenerated, setBudgetGenerated] = useState(false);
  const [budgetGenerating, setBudgetGenerating] = useState(false);
  const [budgetStale, setBudgetStale] = useState(false);
  const dealContext = gatherDealContext(deal);
  const [prompt, setPrompt] = useState(
    slides
      ? `提案書の内容に基づいて見積書を作成してください。\n\n${dealContext}\nスケジュール:\n${scheduleSlide?.bullets.join('\n') ?? '（未定）'}\n\n総額目安: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}`
      : `${deal.clientName}向け「${deal.dealName}」の見積書を作成してください。\n\n${dealContext}\n総額: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}`
  );

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const amt = deal.amount || 3000000;
      const generatedRates = getIndustryRates(deal.industry);
      if (slides && scheduleSlide) {
        const phases = scheduleSlide.bullets.filter((b) => b.includes('Phase'));
        const ratios = [0.15, 0.15, 0.45, 0.15, 0.1];
        setItems(phases.map((b, i) => {
          const name = b.replace(/Phase \d+: /, '').replace(/（.*$/, '').trim();
          const rate = generatedRates[i] ?? generatedRates[0];
          const phaseAmt = Math.round(amt * (ratios[i] ?? 0.2));
          const manMonth = parseFloat((phaseAmt / rate.unitPrice).toFixed(1));
          return { name, amount: phaseAmt, manMonth, unitPrice: rate.unitPrice };
        }));
      } else {
        const ratios = [0.15, 0.15, 0.45, 0.15, 0.05, 0.05];
        setItems(generatedRates.map((r, i) => {
          const phaseAmt = Math.round(amt * (ratios[i] ?? 0.1));
          const manMonth = parseFloat((phaseAmt / r.unitPrice).toFixed(1));
          return { name: r.label, amount: phaseAmt, manMonth, unitPrice: r.unitPrice };
        }));
      }
      setGenerating(false);
      setStep('edit');
      if (['proposal', 'meeting', 'lead'].includes(deal.stage) && onAutoAdvance) {
        onAutoAdvance(deal.id, 'estimate_sent');
      }
    }, 1200);
  };

  const handleBudgetGenerate = () => {
    setBudgetGenerating(true);
    setTimeout(() => {
      generateBudgetItems();
      setBudgetGenerating(false);
      setBudgetGenerated(true);
      setBudgetStale(false);
    }, 1400);
  };

  const updateItem = (idx: number, field: keyof EstimateItem, value: string) => {
    if (budgetGenerated) { setBudgetGenerated(false); setBudgetStale(true); }
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'name') return { ...item, name: value };
      const num = parseFloat(value) || 0;
      if (field === 'manMonth') return { ...item, manMonth: num, amount: Math.round(num * item.unitPrice) };
      if (field === 'unitPrice') return { ...item, unitPrice: num, amount: Math.round(item.manMonth * num) };
      if (field === 'amount') return { ...item, amount: Math.round(num) };
      return item;
    }));
  };

  const total = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(total * 0.1);

  const [runningItems, setRunningItems] = useState<RunningItem[]>(MOCK_RUNNING_ITEMS[deal.id] ?? []);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  const generateBudgetItems = () => {
    const generated = items.filter((item) => item.amount > 0).map((item) => {
      const costRate = item.name.includes('PM') ? 0.85 : item.name.includes('テスト') ? 0.70 : 0.75;
      const budgetCost = Math.round(item.amount * costRate);
      return {
        name: item.name,
        revenue: item.amount,
        costLabel: `${item.manMonth}人月 × ¥${Math.round(item.unitPrice * costRate / 10000)}万`,
        budgetCost,
        grossProfit: item.amount - budgetCost,
      };
    });
    setBudgetItems(generated);
  };

  const updateBudgetCost = (idx: number, value: number) => {
    setBudgetItems((prev) => prev.map((b, i) => i === idx ? { ...b, budgetCost: value, grossProfit: b.revenue - value } : b));
  };

  const totalBudgetCost = budgetItems.reduce((s, b) => s + b.budgetCost, 0);
  const totalGrossProfit = total - totalBudgetCost;
  const grossMargin = total > 0 ? Math.round((totalGrossProfit / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded border border-gray-200 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">見積書{slides ? '（提案書ベース）' : ''}</span>
          <div className="flex gap-2 items-center">
            {step === 'edit' && (
              <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium active:scale-[0.98]">
                PDF出力
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none active:scale-[0.98]">&times;</button>
          </div>
        </div>

        {step === 'prompt' && (
          <div className="p-5 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              追加の指示がなければ、このまま生成できます。カスタマイズしたい場合は下の詳細設定を開いてください。
            </div>
            <EstimatePromptDetails prompt={prompt} onPromptChange={setPrompt} />
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98]">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...
                </span>
              ) : 'AIで見積書を生成'}
            </button>
          </div>
        )}

        {step === 'edit' && (
          <div>
            <div className="flex border-b border-gray-200">
              <button onClick={() => setTab('estimate')}
                className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors active:scale-[0.98] ${tab === 'estimate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                見積書
              </button>
              <button onClick={() => setTab('budget')}
                className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors active:scale-[0.98] ${tab === 'budget' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                原価・利益計算（社内用）
              </button>
            </div>

            {tab === 'estimate' && (
              <div className="p-5">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 tracking-widest">御 見 積 書</h2>
                  <p className="text-xs text-gray-500 mt-1">No. EST-{deal.id} / 2026年4月5日</p>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <p className="font-semibold text-gray-900">{deal.clientName} 御中</p>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-xs">トライポット株式会社</p>
                    <p className="text-xs text-gray-500">担当: {deal.assignee}</p>
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3 mb-4 text-center bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">お見積り金額（税込）</p>
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{(total + tax).toLocaleString()}</p>
                </div>
                <div className="mb-2">
                  <div className="grid grid-cols-12 gap-1 text-xs font-medium text-gray-500 pb-1 border-b border-gray-200">
                    <span className="col-span-4">項目</span>
                    <span className="col-span-3 text-right">単価</span>
                    <span className="col-span-2 text-right">人月<span className="text-gray-500 text-xs font-normal ml-0.5 hidden sm:inline">（1人1ヶ月）</span></span>
                    <span className="col-span-3 text-right">金額</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="space-y-1.5 mb-3 min-w-0">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-1 items-center">
                        <input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)}
                          className="col-span-4 px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none bg-white" placeholder="項目名" />
                        <input type="number" value={item.unitPrice || ''} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          className="col-span-3 px-1 py-1.5 border border-gray-200 bg-white rounded text-xs text-right text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                        <input type="number" step="0.1" value={item.manMonth || ''} onChange={(e) => updateItem(i, 'manMonth', e.target.value)}
                          className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                        <div className="col-span-3 flex items-center gap-0.5">
                          <input type="number" value={item.amount || ''} onChange={(e) => updateItem(i, 'amount', e.target.value)}
                            className="flex-1 px-1 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                          <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-600 text-base leading-none active:scale-[0.98]">×</button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { const r = rates[0]; setItems((prev) => [...prev, { name: '', amount: 0, manMonth: 1, unitPrice: r.unitPrice }]); }}
                      className="w-full py-2 border border-dashed border-gray-200 rounded text-xs text-gray-500 font-medium hover:border-gray-400 hover:text-gray-700 active:scale-[0.98]">
                      + 項目を追加
                    </button>
                  </div>
                </div>
                <RunningEstimateSection items={runningItems} onChange={setRunningItems} />
                <div className="border-t border-gray-200 pt-2 space-y-1 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">小計（ショット）</span><span className="font-semibold text-gray-900 tabular-nums">¥{total.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ランニング年額</span><span className="text-gray-700 tabular-nums">¥{(runningItems.reduce((s, r) => s + (r.period === 'monthly' ? r.monthlyAmount * 12 : r.monthlyAmount), 0)).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">消費税(10%)</span><span className="text-gray-700 tabular-nums">¥{tax.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-semibold text-gray-900">合計(税込)</span><span className="font-semibold text-gray-900 tabular-nums">¥{(total + tax).toLocaleString()}</span></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">備考</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none resize-none" />
                </div>
                <button onClick={() => setStep('prompt')} className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-900 font-medium active:scale-[0.98]">AIで再生成</button>
              </div>
            )}

            {tab === 'budget' && (
              <div className="p-5">
                {budgetStale && (
                  <div className="border border-yellow-300 rounded p-3 mb-4 bg-yellow-50">
                    <p className="text-xs font-medium text-yellow-800">見積金額を変更したため予算を再生成してください</p>
                  </div>
                )}
                <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-0.5">社内管理用（クライアントには非開示）</p>
                  <p className="text-xs text-gray-500">見積書の各項目から自動でコスト予算と粗利を計算します。受注時に制作パイプラインへ引き継ぎます。</p>
                </div>

                {!budgetGenerated ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <p className="text-sm text-gray-500 text-center">
                      見積書の各項目に対してコスト予算をAIが自動生成します
                    </p>
                    {total === 0 && (
                      <p className="text-xs text-gray-600 border border-gray-200 rounded px-3 py-2 text-center bg-gray-50">
                        先に「見積書」タブで金額を設定してください
                      </p>
                    )}
                    <button
                      onClick={handleBudgetGenerate}
                      disabled={budgetGenerating || total === 0}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors active:scale-[0.98]">
                      {budgetGenerating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          AIで予算を生成中...
                        </span>
                      ) : 'AIで予算を自動生成'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded border border-gray-200 mb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-gray-500 font-medium">項目</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-16">売上</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-20">予算コスト</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-16">粗利</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetItems.map((b, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2">
                                <p className="text-gray-900 font-medium">{b.name}</p>
                                <p className="text-gray-500">{b.costLabel}</p>
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700 tabular-nums">¥{(b.revenue / 10000).toFixed(0)}万</td>
                              <td className="px-1 py-1">
                                <input type="number" value={b.budgetCost || ''} onChange={(e) => updateBudgetCost(i, Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-semibold tabular-nums focus:ring-1 focus:ring-blue-500" />
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold tabular-nums ${b.grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                ¥{(b.grossProfit / 10000).toFixed(0)}万
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-900">合計サマリー</p>
                        <span className="text-xs font-medium text-gray-700">粗利率 {grossMargin}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">売上合計</p>
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">¥{(total / 10000).toFixed(0)}万</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">予算コスト</p>
                          <p className="text-sm font-semibold text-gray-700 tabular-nums">¥{(totalBudgetCost / 10000).toFixed(0)}万</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">予測粗利</p>
                          <p className={`text-sm font-semibold tabular-nums ${totalGrossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>¥{(totalGrossProfit / 10000).toFixed(0)}万</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setBudgetGenerated(false)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 active:scale-[0.98]">
                        AIで再生成
                      </button>
                      <button onClick={onClose} className="flex-1 py-2.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 active:scale-[0.98]">
                        予算を確定して閉じる
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
