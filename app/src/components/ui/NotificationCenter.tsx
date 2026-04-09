'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  type Notification,
  getNotifications,
  markAsRead,
  markAllRead,
  seedDemoNotifications,
  timeAgo,
} from '@/lib/notifications';

export type { Notification };

export const MOCK_NOTIFICATIONS: never[] = [];

type Props = {
  currentMemberId: string;
};

const TYPE_ICON: Record<Notification['type'], React.ReactNode> = {
  mention: (
    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
    </svg>
  ),
  review_request: (
    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  task_assigned: (
    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  deal_update: (
    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>
  ),
  general: (
    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

const TYPE_BG: Record<Notification['type'], string> = {
  mention: 'bg-purple-50',
  review_request: 'bg-blue-50',
  task_assigned: 'bg-emerald-50',
  deal_update: 'bg-amber-50',
  general: 'bg-gray-100',
};

export function NotificationCenter({ currentMemberId }: Props) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const refresh = useCallback(() => {
    setNotifications(getNotifications(currentMemberId));
  }, [currentMemberId]);

  useEffect(() => {
    seedDemoNotifications(currentMemberId);
    refresh();
  }, [currentMemberId, refresh]);

  useEffect(() => {
    if (!open) return;
    refresh();
  }, [open, refresh]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRead = (n: Notification) => {
    markAsRead(n.id);
    refresh();
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleReadAll = () => {
    markAllRead(currentMemberId);
    refresh();
  };

  const sorted = [
    ...notifications.filter((n) => !n.read),
    ...notifications.filter((n) => n.read),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors active:scale-[0.98]"
        aria-label="通知"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-semibold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-gray-200 rounded-lg shadow-sm z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <span className="text-sm font-semibold text-gray-900">通知</span>
            {unreadCount > 0 && (
              <button
                onClick={handleReadAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold active:scale-[0.98]"
              >
                すべて既読にする
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-500">通知はありません</div>
            ) : (
              sorted.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`w-full text-left flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors active:scale-[0.98] ${
                    !n.read ? 'border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${TYPE_BG[n.type]}`}>
                    {TYPE_ICON[n.type]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500 mb-0.5">{n.fromName}</div>
                    <div className={`text-sm leading-snug truncate ${!n.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                      {n.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</div>
                    <div className="text-xs text-gray-500 mt-1">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
