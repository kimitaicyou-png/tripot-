'use client';

import { useState, useTransition } from 'react';
import { UserX, UserCheck } from 'lucide-react';
import { deactivateMember, activateMember } from '@/lib/actions/members';

export function MemberStatusToggle({
  memberId,
  memberName,
  currentStatus,
  canManage,
}: {
  memberId: string;
  memberName: string;
  currentStatus: 'active' | 'pending' | 'inactive';
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  if (!canManage) return null;

  const isInactive = currentStatus === 'inactive';

  const handleDeactivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await deactivateMember(memberId, reason || undefined);
      if (!result.success) {
        setError(result.error ?? '無効化に失敗しました');
      } else {
        setConfirming(false);
        setReason('');
      }
    });
  };

  const handleActivate = () => {
    setError(null);
    startTransition(async () => {
      const result = await activateMember(memberId);
      if (!result.success) {
        setError(result.error ?? '再有効化に失敗しました');
      }
    });
  };

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500">
            アカウント状態
          </p>
          <p
            className={`text-base font-medium mt-1 ${
              isInactive ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {isInactive ? '無効化中' : currentStatus === 'pending' ? '招待保留' : '有効'}
          </p>
          {isInactive && (
            <p className="text-xs text-gray-700 mt-1">
              次回API実行時に即401返却（ADR-0012 P0-2）
            </p>
          )}
        </div>

        {!confirming && !isInactive && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 active:scale-[0.98] disabled:opacity-50"
          >
            <UserX className="w-3.5 h-3.5" />
            アカウント無効化
          </button>
        )}

        {isInactive && (
          <button
            type="button"
            onClick={handleActivate}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 active:scale-[0.98] disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            再有効化
          </button>
        )}
      </div>

      {confirming && (
        <div className="space-y-2 pt-2 border-t border-gray-200">
          <p className="text-sm text-gray-900">
            <span className="font-medium">{memberName}</span> を無効化します。よろしいですか？
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="理由（任意・例：退職、休職）"
            className="w-full text-sm text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-900"
            disabled={pending}
            maxLength={200}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={pending}
              className="px-3 py-1.5 bg-red-700 text-white text-sm font-medium rounded-lg hover:bg-red-600 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? '処理中...' : '無効化を実行'}
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setReason('');
                setError(null);
              }}
              disabled={pending}
              className="text-sm text-gray-700 hover:text-gray-900"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-700">{error}</p>}
    </section>
  );
}
