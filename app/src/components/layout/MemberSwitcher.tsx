'use client';

import { MEMBERS } from '@/lib/constants/members';

type Props = {
  currentId: string;
  onSwitch: (id: string) => void;
  onClose: () => void;
};

export function MemberSwitcher({ currentId, onSwitch, onClose }: Props) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms_ease-out]" onClick={onClose} />
      <div className="fixed top-16 left-4 w-64 bg-white rounded-lg shadow-sm border border-gray-200 z-50 animate-[scale-in_150ms_ease-out]">
        <div className="px-3 py-2 border-b border-gray-200">
          <p className="text-xs font-medium text-gray-500">メンバー切替</p>
        </div>
        <div className="py-1">
          {MEMBERS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onSwitch(m.id); onClose(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 active:scale-[0.98] transition-all ${
                currentId === m.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className={`w-7 h-7 rounded-full ${m.color} flex items-center justify-center text-xs font-semibold text-white shrink-0`}>
                {m.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{m.name}</p>
                <p className="text-[10px] text-gray-500">{m.level}</p>
              </div>
              {currentId === m.id && (
                <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
