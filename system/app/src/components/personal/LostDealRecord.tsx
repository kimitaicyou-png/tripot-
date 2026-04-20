'use client';

import { useState } from 'react';

type LostReason = {
  reason: 'price' | 'competitor' | 'timing' | 'requirements' | 'budget_freeze' | 'other';
  competitor?: string;
  detail: string;
  recordedAt: string;
};

const REASON_LABEL: Record<LostReason['reason'], string> = {
  price: '価格・予算',
  competitor: '競合他社に敗北',
  timing: 'タイミング不一致',
  requirements: '要件が合わなかった',
  budget_freeze: '予算凍結',
  other: 'その他',
};

type Props = {
  dealId: string;
  dealName: string;
  existingReason?: LostReason;
  onConfirm: (reason: LostReason) => void;
  onCancel: () => void;
};

export default function LostDealRecord({ dealId: _dealId, dealName, existingReason, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState<LostReason['reason']>(existingReason?.reason ?? 'price');
  const [competitor, setCompetitor] = useState(existingReason?.competitor ?? '');
  const [detail, setDetail] = useState(existingReason?.detail ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail.trim()) return;
    onConfirm({
      reason,
      competitor: reason === 'competitor' ? competitor : undefined,
      detail,
      recordedAt: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />
            <h2 className="text-base font-semibold text-gray-900">失注を記録</h2>
          </div>
          <p className="text-xs text-gray-500 pl-4">{dealName}</p>
        </div>
        <form className="p-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              失注理由 <span className="text-red-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(REASON_LABEL) as LostReason['reason'][]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                    reason === r
                      ? 'bg-red-600 text-white border-red-600'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {REASON_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          {reason === 'competitor' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">競合他社名</label>
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
                placeholder="競合他社名を入力"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              詳細メモ <span className="text-red-600">*</span>
            </label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
              placeholder="失注の経緯・次回の改善点など"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!detail.trim()}
              className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
            >
              失注を確定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export type { LostReason };
export { REASON_LABEL };
