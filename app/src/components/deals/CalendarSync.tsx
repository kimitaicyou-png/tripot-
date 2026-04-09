'use client';

import { useState } from 'react';

type ActionType = 'meeting' | 'proposal' | 'appointment' | 'other';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  duration: number;
  attendees: string[];
  suggestedType: ActionType;
  recorded: boolean;
};

const MOCK_CALENDAR: CalendarEvent[] = [
  { id: 'cal1', title: '豊田精工 技術打ち合わせ', date: '2026-04-07 14:00', duration: 60, attendees: ['鈴木CTO'], suggestedType: 'meeting', recorded: false },
  { id: 'cal2', title: '碧会 院長プレゼン', date: '2026-04-08 10:00', duration: 90, attendees: ['院長', '事務長'], suggestedType: 'proposal', recorded: false },
  { id: 'cal3', title: '中京メディカル フォローアップ電話', date: '2026-04-09 11:00', duration: 30, attendees: [], suggestedType: 'meeting', recorded: false },
  { id: 'cal4', title: '教育委員会 中間報告', date: '2026-04-10 15:00', duration: 60, attendees: ['担当者'], suggestedType: 'meeting', recorded: true },
  { id: 'cal5', title: 'スマート農業 初回訪問', date: '2026-04-11 13:00', duration: 60, attendees: ['代表'], suggestedType: 'appointment', recorded: false },
];

const TYPE_LABEL: Record<ActionType, string> = {
  meeting: '商談',
  proposal: '提案',
  appointment: 'アポイント',
  other: 'その他',
};

const TYPE_BADGE: Record<ActionType, string> = {
  meeting: 'bg-blue-50 text-blue-600',
  proposal: 'bg-gray-900 text-white',
  appointment: 'bg-gray-100 text-gray-600',
  other: 'bg-gray-100 text-gray-500',
};

const ACTION_TYPES: ActionType[] = ['meeting', 'proposal', 'appointment', 'other'];

function formatDate(dateStr: string): string {
  const [datePart, timePart] = dateStr.split(' ');
  const [, month, day] = datePart.split('-');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const d = new Date(dateStr.replace(' ', 'T'));
  return `${parseInt(month)}/${parseInt(day)}（${weekdays[d.getDay()]}）${timePart}`;
}

export function CalendarSync() {
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>(MOCK_CALENDAR);
  const [bulkDone, setBulkDone] = useState(false);

  function handleSync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
    }, 1200);
  }

  function handleRecord(id: string) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, recorded: true } : e)));
  }

  function handleTypeChange(id: string, newType: ActionType) {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, suggestedType: newType } : e)));
  }

  function handleBulkRecord() {
    setEvents((prev) => prev.map((e) => ({ ...e, recorded: true })));
    setBulkDone(true);
  }

  const unrecorded = events.filter((e) => !e.recorded);
  const recorded = events.filter((e) => e.recorded);

  return (
    <section className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">Googleカレンダー同期</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {synced ? '最終同期: 2026-04-06 08:00' : '未同期'}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {syncing ? '同期中...' : 'Googleカレンダーと同期'}
          </button>
        </div>
      </div>

      {!synced && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-semibold text-gray-500">同期ボタンを押すと今週の予定が表示されます</p>
        </div>
      )}

      {synced && (
        <div className="p-5 space-y-4">
          {unrecorded.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                未記録 {unrecorded.length}件
              </p>
              <button
                onClick={handleBulkRecord}
                disabled={bulkDone}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                まとめて記録
              </button>
            </div>
          )}

          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className={`border rounded-lg px-4 py-3 transition-colors ${
                  event.recorded ? 'border-gray-100 bg-gray-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 shrink-0">
                      {event.recorded ? (
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold leading-tight ${event.recorded ? 'text-gray-500' : 'text-gray-900'}`}>
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDate(event.date)}・{event.duration}分
                        {event.attendees.length > 0 && `・${event.attendees.join('、')}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {event.recorded ? (
                      <span className="text-xs font-semibold text-gray-500">記録済み</span>
                    ) : (
                      <>
                        <select
                          value={event.suggestedType}
                          onChange={(e) => handleTypeChange(event.id, e.target.value as ActionType)}
                          className="text-xs font-semibold border border-gray-200 rounded px-2 py-1 text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          {ACTION_TYPES.map((t) => (
                            <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRecord(event.id)}
                          className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                        >
                          記録
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {!event.recorded && (
                  <div className="ml-8 mt-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${TYPE_BADGE[event.suggestedType]}`}>
                      AI推定: {TYPE_LABEL[event.suggestedType]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {recorded.length > 0 && unrecorded.length === 0 && (
            <div className="text-center py-3 border border-gray-200 rounded-lg">
              <p className="text-sm font-semibold text-gray-500">今週の予定はすべて記録済みです</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
