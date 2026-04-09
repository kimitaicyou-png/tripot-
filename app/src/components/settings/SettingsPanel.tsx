'use client';

import { useState } from 'react';
import { MEMBERS } from '@/lib/constants/members';
import type { MemberInfo } from '@/lib/stores/types';

type Props = {
  currentMemberId: string;
  onMemberSwitch: (id: string) => void;
};

export function SettingsPanel({ currentMemberId, onMemberSwitch }: Props) {
  const member = MEMBERS.find((m) => m.id === currentMemberId) ?? MEMBERS[0];
  const [fiscalStart, setFiscalStart] = useState(4);

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">設定</h2>
        <p className="text-xs text-gray-500 mt-0.5">システム設定・メンバー管理</p>
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">現在のユーザー</h3>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${member.color} flex items-center justify-center text-sm font-semibold text-white`}>
            {member.initial}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{member.name}</p>
            <p className="text-xs text-gray-500">{member.level} / {member.skills?.join(', ')}</p>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">ユーザー切替</label>
          <select
            value={currentMemberId}
            onChange={(e) => onMemberSwitch(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white w-full"
          >
            {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">会計設定</h3>
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">決算期開始月</label>
          <select
            value={fiscalStart}
            onChange={(e) => setFiscalStart(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-900 bg-white"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 shadow-sm bg-white p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">メンバー一覧</h3>
        <div className="space-y-2">
          {MEMBERS.map((m) => (
            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
              <div className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                {m.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{m.name}</p>
                <p className="text-xs text-gray-500">{m.skills?.slice(0, 3).join(' / ')}</p>
              </div>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{m.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
