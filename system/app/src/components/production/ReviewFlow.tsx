'use client';

import { useState } from 'react';

type ReviewItem = {
  id: string;
  name: string;
  type: 'design' | 'code' | 'document';
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  reviewer: string;
  submittedAt: string;
  comment?: string;
};

type Props = {
  reviews: ReviewItem[];
  onChange: (reviews: ReviewItem[]) => void;
};

const TYPE_LABEL: Record<ReviewItem['type'], string> = {
  design:   'デザイン',
  code:     'コード',
  document: '書類',
};

const STATUS_BADGE: Record<ReviewItem['status'], string> = {
  pending:   'bg-gray-100 text-gray-600',
  in_review: 'bg-blue-50 text-blue-700 border border-blue-200',
  approved:  'bg-gray-100 text-gray-700 border border-gray-300',
  rejected:  'bg-red-50 text-red-700 border border-red-200',
};

const STATUS_LABEL: Record<ReviewItem['status'], string> = {
  pending:   '未提出',
  in_review: 'レビュー中',
  approved:  '承認',
  rejected:  '却下',
};

export default function ReviewFlow({ reviews, onChange }: Props) {
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    onChange(reviews.map((r) =>
      r.id === id
        ? { ...r, status: 'approved', comment: commentDraft[id] || r.comment }
        : r
    ));
    setExpandedId(null);
  };

  const handleReject = (id: string) => {
    onChange(reviews.map((r) =>
      r.id === id
        ? { ...r, status: 'rejected', comment: commentDraft[id] || r.comment }
        : r
    ));
    setExpandedId(null);
  };

  const handleStartReview = (id: string) => {
    onChange(reviews.map((r) =>
      r.id === id ? { ...r, status: 'in_review' } : r
    ));
  };

  const approvedCount = reviews.filter((r) => r.status === 'approved').length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">レビュー・承認</span>
        <span className="text-xs text-gray-500">{approvedCount} / {reviews.length} 承認済み</span>
      </div>

      {reviews.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">レビュー項目はありません</p>
      )}

      <div className="divide-y divide-gray-100">
        {reviews.map((review) => (
          <div key={review.id} className="px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{review.name}</p>
                  <span className="text-xs text-gray-500">{TYPE_LABEL[review.type]}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${STATUS_BADGE[review.status]}`}>
                    {STATUS_LABEL[review.status]}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  レビュアー: {review.reviewer} · {review.submittedAt}
                </p>
                {review.comment && (
                  <p className="text-xs text-gray-600 mt-1.5 border-l-2 border-gray-200 pl-2">{review.comment}</p>
                )}
              </div>

              <div className="flex gap-1.5 shrink-0">
                {review.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => handleStartReview(review.id)}
                    className="text-xs px-2 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                  >
                    レビュー開始
                  </button>
                )}
                {review.status === 'in_review' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                      className="text-xs px-2 py-1.5 border border-gray-200 text-gray-600 rounded hover:bg-gray-50"
                    >
                      コメント
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(review.id)}
                      className="text-xs px-2 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-700 font-semibold"
                    >
                      承認
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(review.id)}
                      className="text-xs px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                    >
                      却下
                    </button>
                  </>
                )}
                {(review.status === 'approved' || review.status === 'rejected') && (
                  <button
                    type="button"
                    onClick={() => onChange(reviews.map((r) => r.id === review.id ? { ...r, status: 'pending' } : r))}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    リセット
                  </button>
                )}
              </div>
            </div>

            {expandedId === review.id && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={commentDraft[review.id] ?? ''}
                  onChange={(e) => setCommentDraft((prev) => ({ ...prev, [review.id]: e.target.value }))}
                  rows={3}
                  placeholder="コメントを入力..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(review.id)}
                    className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded hover:bg-gray-700 font-semibold"
                  >
                    コメント付きで承認
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReject(review.id)}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                  >
                    コメント付きで却下
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export type { ReviewItem };

export const MOCK_REVIEWS: ReviewItem[] = [];
