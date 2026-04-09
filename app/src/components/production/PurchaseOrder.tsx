'use client';

import { useState } from 'react';

type PurchaseOrder = {
  id: string;
  outsourceName: string;
  projectName: string;
  description: string;
  amount: number;
  startDate: string;
  endDate: string;
  paymentTerms: string;
  status: 'draft' | 'sent' | 'accepted' | 'completed' | 'cancelled';
  createdAt: string;
};

type Props = {
  orders: PurchaseOrder[];
  onChange: (orders: PurchaseOrder[]) => void;
};

const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  draft:     '下書き',
  sent:      '送付済み',
  accepted:  '受諾済み',
  completed: '完了',
  cancelled: 'キャンセル',
};

const STATUS_BADGE: Record<PurchaseOrder['status'], string> = {
  draft:     'bg-gray-100 text-gray-600',
  sent:      'bg-blue-50 text-blue-600 border border-blue-200',
  accepted:  'bg-blue-100 text-blue-800 border border-blue-300',
  completed: 'bg-gray-900 text-white',
  cancelled: 'bg-red-50 text-red-600 border border-red-200',
};

const NEXT_STATUS: Partial<Record<PurchaseOrder['status'], PurchaseOrder['status']>> = {
  draft:    'sent',
  sent:     'accepted',
  accepted: 'completed',
};

const NEXT_STATUS_LABEL: Partial<Record<PurchaseOrder['status'], string>> = {
  draft:    '送付する',
  sent:     '受諾済みにする',
  accepted: '完了にする',
};

function generateId(): string {
  return `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY_DRAFT = {
  outsourceName: '',
  projectName: '',
  description: '',
  amount: 0,
  startDate: '',
  endDate: '',
  paymentTerms: '月末締め翌月末払い',
};

export default function PurchaseOrderManager({ orders, onChange }: Props) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const totalAmount = orders.reduce((s, o) => s + o.amount, 0);
  const activeAmount = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + o.amount, 0);

  const handleAdd = () => {
    if (!draft.outsourceName || !draft.projectName || draft.amount <= 0) return;
    onChange([
      ...orders,
      {
        id: generateId(),
        ...draft,
        status: 'draft',
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]);
    setDraft(EMPTY_DRAFT);
    setAdding(false);
  };

  const handleStatusAdvance = (id: string) => {
    onChange(
      orders.map((o) =>
        o.id === id && NEXT_STATUS[o.status]
          ? { ...o, status: NEXT_STATUS[o.status]! }
          : o
      )
    );
  };

  const handleCancel = (id: string) => {
    onChange(orders.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)));
  };

  const handleDelete = (id: string) => {
    onChange(orders.filter((o) => o.id !== id));
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">外注発注書</span>
          <span className="text-xs text-gray-500">{orders.length}件</span>
        </div>
        <div className="flex gap-6 mt-2">
          <div>
            <p className="text-xs text-gray-500">有効発注額合計</p>
            <p className="text-sm font-semibold text-gray-900 tabular-nums">
              ¥{activeAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">全発注額合計</p>
            <p className="text-sm font-semibold text-gray-500 tabular-nums">
              ¥{totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {orders.length === 0 && !adding && (
        <p className="text-sm text-gray-500 text-center py-6">発注書はありません</p>
      )}

      {orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">外注先</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">案件</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">業務内容</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">金額</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">期間</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">ステータス</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-gray-900">{o.outsourceName}</p>
                    <p className="text-xs text-gray-500">{o.paymentTerms}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{o.projectName}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[180px] truncate">{o.description}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="font-semibold text-gray-900 tabular-nums">¥{o.amount.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                    {o.startDate.slice(5).replace('-', '/')} – {o.endDate.slice(5).replace('-', '/')}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[o.status]}`}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {NEXT_STATUS[o.status] && (
                        <button
                          type="button"
                          onClick={() => handleStatusAdvance(o.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap"
                        >
                          {NEXT_STATUS_LABEL[o.status]}
                        </button>
                      )}
                      {o.status !== 'completed' && o.status !== 'cancelled' && (
                        <button
                          type="button"
                          onClick={() => handleCancel(o.id)}
                          className="text-xs text-gray-500 hover:text-red-600"
                        >
                          取消
                        </button>
                      )}
                      {(o.status === 'draft' || o.status === 'cancelled') && (
                        <button
                          type="button"
                          onClick={() => handleDelete(o.id)}
                          className="text-gray-500 hover:text-red-600 text-lg leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">外注先名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.outsourceName}
                onChange={(e) => setDraft({ ...draft, outsourceName: e.target.value })}
                placeholder="例: クリエイトデザイン株式会社"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">案件名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={draft.projectName}
                onChange={(e) => setDraft({ ...draft, projectName: e.target.value })}
                placeholder="例: ECサイトリニューアル"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">業務内容</label>
            <input
              type="text"
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="例: UIデザイン制作・修正対応"
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div className="flex gap-2">
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-0.5">金額（円） <span className="text-red-500">*</span></label>
              <input
                type="number"
                min="0"
                value={draft.amount || ''}
                onChange={(e) => setDraft({ ...draft, amount: parseInt(e.target.value) || 0 })}
                placeholder="0"
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-0.5">開始日</label>
              <input
                type="date"
                value={draft.startDate}
                onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="w-36">
              <label className="block text-xs text-gray-500 mb-0.5">終了日</label>
              <input
                type="date"
                value={draft.endDate}
                onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-0.5">支払条件</label>
              <input
                type="text"
                value={draft.paymentTerms}
                onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })}
                className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAdd}
              disabled={!draft.outsourceName || !draft.projectName || draft.amount <= 0}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              発注書を作成
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setDraft(EMPTY_DRAFT); }}
              className="px-4 py-1.5 text-sm border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {!adding && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
          >
            + 新規発注書を作成
          </button>
        </div>
      )}
    </div>
  );
}

export type { PurchaseOrder };

export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po1',
    outsourceName: 'クリエイトデザイン株式会社',
    projectName: 'ECサイトリニューアル',
    description: 'UIデザイン制作・バナー・アイコン一式',
    amount: 480000,
    startDate: '2026-04-01',
    endDate: '2026-04-30',
    paymentTerms: '月末締め翌月末払い',
    status: 'accepted',
    createdAt: '2026-03-28',
  },
  {
    id: 'po2',
    outsourceName: '株式会社ベトナムコード',
    projectName: '基幹システム開発',
    description: 'フロントエンド実装（React/Next.js）',
    amount: 1200000,
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    paymentTerms: '月末締め翌月末払い',
    status: 'sent',
    createdAt: '2026-03-25',
  },
  {
    id: 'po3',
    outsourceName: 'テスト技研合同会社',
    projectName: 'ECサイトリニューアル',
    description: '品質検証・テスト実施',
    amount: 150000,
    startDate: '2026-05-01',
    endDate: '2026-05-20',
    paymentTerms: '検収後30日払い',
    status: 'draft',
    createdAt: '2026-04-05',
  },
];
