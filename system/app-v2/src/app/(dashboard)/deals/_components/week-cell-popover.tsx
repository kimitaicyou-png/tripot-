'use client';

/**
 * 週セル click popover（Phase 3、隊長明示 2026-05-27 01:39「触れる + 詳細」直撃）
 *
 * 週グリッドのセルをクリック → その週の actions / meetings / tasks を一覧で見せて、
 * 各 item は案件詳細ページの該当タブへ link。read-only、追加・編集は将来。
 */

import { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Phone,
  Handshake,
  FileText,
  Mail,
  Footprints,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getWeekCellDetail, type WeekCellDetail } from '@/lib/actions/week-grid-cell';

const ACTION_ICON: Record<string, LucideIcon> = {
  call: Phone,
  meeting: Handshake,
  proposal: FileText,
  email: Mail,
  visit: Footprints,
  other: Sparkles,
};

const ACTION_LABEL: Record<string, string> = {
  call: '電話',
  meeting: '商談',
  proposal: '提案',
  email: 'メール',
  visit: '訪問',
  other: 'その他',
};

const MEETING_LABEL: Record<string, string> = {
  call: '電話',
  meeting: '商談',
  gmeet: 'オンラインMTG',
  visit: '訪問',
  email: 'メール',
  other: 'その他',
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WeekCellPopover({
  dealId,
  weekStart,
  children,
  highlight,
}: {
  dealId: string;
  weekStart: string;
  children: React.ReactNode;
  /** trigger ボタンの背景強調（今週 or 期日 pin あり）*/
  highlight?: 'amber' | 'rose' | null;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<WeekCellDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (data || isPending) return; // 既に取得済 or 取得中
    startTransition(async () => {
      const result = await getWeekCellDetail(dealId, weekStart);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setData(result.data);
      setError(null);
    });
  }

  const bgCls =
    highlight === 'amber'
      ? 'bg-amber-50/40 hover:bg-amber-100/60'
      : highlight === 'rose'
        ? 'bg-rose-50/40 hover:bg-rose-100/60'
        : 'hover:bg-slate-100';

  const total = data
    ? data.actions.length + data.meetings.length + data.tasks.length
    : 0;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        title={`クリックで週 ${weekStart} の詳細`}
        className={`w-full h-full px-1 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900/20 ${bgCls}`}
      >
        {children}
      </button>

      {open && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 mt-1 z-40 w-80 bg-white border border-gray-200 rounded-lg shadow-md">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-900">
              週 <span className="font-mono">{weekStart}</span> の活動
              {data && (
                <span className="ml-1.5 text-gray-500 font-normal">（{total} 件）</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="閉じる"
              className="text-gray-400 hover:text-gray-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto px-3 py-2.5 space-y-3 text-xs">
            {isPending && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                読み込み中…
              </div>
            )}
            {error && (
              <p className="text-rose-700">取得失敗：{error}</p>
            )}
            {data && total === 0 && (
              <p className="text-gray-500">この週にイベントなし</p>
            )}

            {data && data.actions.length > 0 && (
              <section>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">
                  行動 {data.actions.length} 件
                </p>
                <ul className="space-y-1">
                  {data.actions.map((a) => {
                    const Icon = ACTION_ICON[a.type] ?? Sparkles;
                    return (
                      <li key={a.id} className="flex items-start gap-1.5">
                        <Icon className="w-3 h-3 text-gray-500 mt-0.5 shrink-0" />
                        <span className="text-gray-700 shrink-0">
                          {ACTION_LABEL[a.type] ?? a.type}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500 shrink-0">
                          {formatTime(a.occurred_at)}
                        </span>
                        {a.note && (
                          <span className="text-gray-700 truncate flex-1">— {a.note}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {data && data.meetings.length > 0 && (
              <section>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">
                  議事録 {data.meetings.length} 件
                </p>
                <ul className="space-y-1">
                  {data.meetings.map((m) => (
                    <li key={m.id} className="flex items-start gap-1.5">
                      <Handshake className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                      <Link
                        href={`/deals/${dealId}?tab=meetings#meeting-${m.id}` as never}
                        className="text-gray-900 hover:underline decoration-gray-400 flex-1 truncate"
                      >
                        {MEETING_LABEL[m.type] ?? m.type}
                        {m.title ? `：${m.title}` : ''}
                      </Link>
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">
                        {formatTime(m.occurred_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {data && data.tasks.length > 0 && (
              <section>
                <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">
                  タスク {data.tasks.length} 件
                </p>
                <ul className="space-y-1">
                  {data.tasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-1.5">
                      {t.status === 'done' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 mt-0.5 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-rose-600 mt-0.5 shrink-0" />
                      )}
                      <span className="flex-1 text-gray-900 truncate">{t.title}</span>
                      {t.due_date && (
                        <span className="text-[10px] font-mono text-gray-500 shrink-0 inline-flex items-center gap-0.5">
                          <Calendar className="w-2.5 h-2.5" />
                          {t.due_date.slice(5)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-end gap-2">
            <Link
              href={`/deals/${dealId}` as never}
              className="text-[11px] text-gray-700 hover:text-gray-900 hover:underline decoration-gray-400"
            >
              案件詳細を開く →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
