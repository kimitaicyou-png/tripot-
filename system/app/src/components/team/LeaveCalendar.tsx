'use client';

import { useState } from 'react';

export type LeaveEntry = {
  id: string;
  memberId: string;
  memberName: string;
  type: 'paid' | 'sick' | 'half' | 'remote';
  date: string;
  note?: string;
};

type Props = {
  entries: LeaveEntry[];
  onChange: (entries: LeaveEntry[]) => void;
};

const MEMBERS: { id: string; name: string; initial: string; color: string }[] = [];

const LEAVE_TYPE_CONFIG: Record<LeaveEntry['type'], { label: string; bg: string; text: string; border: string }> = {
  paid: { label: '有給', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  sick: { label: '病欠', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  half: { label: '半休', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  remote: { label: 'リモ', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
};

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - dow + i);
    return d.toISOString().slice(0, 10);
  });
}

type AddModalProps = {
  onAdd: (entry: Omit<LeaveEntry, 'id'>) => void;
  onClose: () => void;
};

function AddModal({ onAdd, onClose }: AddModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [memberId, setMemberId] = useState(MEMBERS[0]?.id ?? '');
  const [type, setType] = useState<LeaveEntry['type']>('paid');
  const [date, setDate] = useState(today);
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const member = MEMBERS.find((m) => m.id === memberId)!;
    onAdd({ memberId, memberName: member.name, type, date, note: note || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-4">休暇を登録</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">メンバー <span className="text-red-500">*</span></label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">種別 <span className="text-red-500">*</span></label>
            <div className="flex gap-2 flex-wrap">
              {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveEntry['type'], typeof LEAVE_TYPE_CONFIG[LeaveEntry['type']]][]).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                    type === key ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">日付 <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">メモ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="例: 家族の用事"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-gray-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              キャンセル
            </button>
            <button type="submit" className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function LeaveCalendar({ entries, onChange }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [showModal, setShowModal] = useState(false);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const thisWeekDates = getThisWeekDates();
  const thisWeekAbsent = entries.filter(
    (e) => thisWeekDates.includes(e.date) && (e.type === 'paid' || e.type === 'sick' || e.type === 'half')
  );

  const uniqueThisWeekAbsent = Array.from(
    new Map(thisWeekAbsent.map((e) => [e.memberId, e])).values()
  );

  const getEntriesForDay = (day: number) => {
    const dateStr = toDateString(year, month, day);
    return entries.filter((e) => e.date === dateStr);
  };

  const handleAdd = (entry: Omit<LeaveEntry, 'id'>) => {
    onChange([...entries, { ...entry, id: `l${Date.now()}` }]);
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const calendarDays: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="space-y-5">
      {uniqueThisWeekAbsent.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-xs font-semibold text-amber-700 mb-1.5">今週の不在者</div>
          <div className="flex flex-wrap gap-2">
            {uniqueThisWeekAbsent.map((e) => {
              const cfg = LEAVE_TYPE_CONFIG[e.type];
              return (
                <span key={e.memberId} className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                  {e.memberName} ({cfg.label})
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button onClick={prevMonth} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-900">{year}年{month + 1}月</span>
          <button onClick={nextMonth} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-7 text-center">
          {DOW_LABELS.map((d, i) => (
            <div key={d} className={`py-2 text-[11px] font-semibold border-b border-gray-100 ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const isToday = day !== null && toDateString(year, month, day) === today.toISOString().slice(0, 10);
            const dayEntries = day !== null ? getEntriesForDay(day) : [];
            const dow = i % 7;

            return (
              <div
                key={i}
                className={`min-h-[64px] p-1 border-b border-r border-gray-100 last:border-r-0 ${
                  day === null ? 'bg-gray-50' : ''
                } ${dow === 0 ? 'text-red-400' : dow === 6 ? 'text-blue-400' : 'text-gray-700'}`}
              >
                {day !== null && (
                  <>
                    <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-blue-600 text-white' : ''
                    }`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEntries.slice(0, 2).map((e) => {
                        const cfg = LEAVE_TYPE_CONFIG[e.type];
                        const memberInfo = MEMBERS.find((m) => m.id === e.memberId);
                        return (
                          <div
                            key={e.id}
                            title={`${e.memberName} (${cfg.label})`}
                            className={`text-[9px] font-semibold px-1 py-0.5 rounded truncate border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                          >
                            {memberInfo?.initial ?? e.memberName[0]}·{cfg.label}
                          </div>
                        );
                      })}
                      {dayEntries.length > 2 && (
                        <div className="text-[9px] text-gray-500">+{dayEntries.length - 2}</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex gap-3 flex-wrap text-xs">
          {(Object.entries(LEAVE_TYPE_CONFIG) as [LeaveEntry['type'], typeof LEAVE_TYPE_CONFIG[LeaveEntry['type']]][]).map(([key, cfg]) => (
            <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-semibold ${cfg.bg} ${cfg.text} ${cfg.border}`}>
              {cfg.label}
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          休暇を登録
        </button>
      </div>

      {showModal && <AddModal onAdd={handleAdd} onClose={() => setShowModal(false)} />}
    </div>
  );
}

const BASE_DATE = new Date();

export const MOCK_LEAVE_ENTRIES: LeaveEntry[] = [];
