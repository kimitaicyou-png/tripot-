'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { TodayProgressCTA } from '@/components/personal/TodayProgressCTA';
import RecentContactsStrip from '@/components/personal/RecentContactsStrip';
import { MEMBER_KPIS, getDaysSinceJoined } from '@/lib/data/aggregation';
import { loadProductionCards } from '@/lib/productionCards';
import { loadAllDeals } from '@/lib/dealsStore';

const MEMBERS: Record<string, { firstName: string; role: string; accent: string; joinedAt: string }> = {
  kashiwagi: { firstName: '久美子', role: 'Sales Lead',        accent: '#E91E63', joinedAt: '2023-04-01' },
  inukai:    { firstName: '智之',   role: 'Account Manager',   accent: '#10B981', joinedAt: '2022-10-01' },
  izumi:     { firstName: '阿委璃', role: 'Creative Director', accent: '#F59E0B', joinedAt: '2026-03-17' },
  ono:       { firstName: '崇',     role: 'Field Sales',       accent: '#6366F1', joinedAt: '2024-01-10' },
  ichioka:   { firstName: '陸',     role: 'Designer',          accent: '#14B8A6', joinedAt: '2026-04-01' },
};

const QUOTES = [
  '打席に立たなければヒットは出ない。',
  '放置は最大の敵。今日連絡するだけで状況は変わる。',
  '小さな一歩が、大きな案件を動かす。',
];

function getTodayQuote(): string {
  const day = new Date().getDay();
  return QUOTES[day % QUOTES.length];
}

function getDateString(): string {
  const d = new Date();
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
}

type ActionPriority = 'urgent' | 'today' | 'upcoming';

interface Action {
  id: string;
  content: string;
  client: string;
  dueDate: string;
  dueLabel: string;
  priority: ActionPriority;
  done: boolean;
  dealId?: string;
  effort: number;
  isProductionTask?: boolean;
  productionTaskId?: string;
}

const PROD_TASK_ASSIGNEES_KEY = 'coaris_production_task_assignees';
const PROD_TASK_STATUS_KEY = 'coaris_production_task_status';

const ALL_PROD_TASKS_DATA = [
  { id: 't1', title: 'ユーザー認証機能', projectName: '学習管理システム', dueDate: '2026-03-20', status: 'done' },
  { id: 't2', title: 'コース管理CRUD', projectName: '学習管理システム', dueDate: '2026-03-28', status: 'done' },
  { id: 't3', title: '学習進捗ダッシュボード', projectName: '学習管理システム', dueDate: '2026-04-11', status: 'doing' },
  { id: 't4', title: 'テスト機能（自動採点）', projectName: '学習管理システム', dueDate: '2026-04-25', status: 'todo' },
  { id: 't5', title: 'レポート出力', projectName: '学習管理システム', dueDate: '2026-05-09', status: 'todo' },
  { id: 't12', title: 'キックオフ資料作成', projectName: 'SaaSプラットフォーム', dueDate: '2026-04-07', status: 'doing' },
  { id: 't13', title: '要件ヒアリング（3回）', projectName: 'SaaSプラットフォーム', dueDate: '2026-04-21', status: 'todo' },
  { id: 't20', title: '検索機能バグ修正', projectName: '配送管理保守', dueDate: '2026-04-08', status: 'todo' },
];

function loadProdTaskAssignees(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROD_TASK_ASSIGNEES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function loadProdTaskStatus(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(PROD_TASK_STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveProdTaskStatus(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROD_TASK_STATUS_KEY, JSON.stringify(map));
}

function buildDueLabel(dateStr: string): { dueLabel: string; priority: ActionPriority } {
  const d = new Date(dateStr);
  const today = new Date('2026-04-08');
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { dueLabel: `${Math.abs(diff)}日超過`, priority: 'urgent' };
  if (diff === 0) return { dueLabel: '今日', priority: 'today' };
  if (diff === 1) return { dueLabel: '明日', priority: 'upcoming' };
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return { dueLabel: `${d.getMonth() + 1}/${d.getDate()} (${days[d.getDay()]})`, priority: 'upcoming' };
}



function formatMan(n: number): string {
  return `¥${Math.round(n / 10000).toLocaleString()}万`;
}

function buildGoogleCalendarUrl(action: Action): string {
  const now = new Date();
  const start = new Date(now.getTime() + 60 * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${action.client} ｜ ${action.content}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: `案件: ${action.client}\nタスク: ${action.content}\n優先度: ${action.priority}\n（コアリスAI 案件管理より）`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function getNewbadgeInfo(joinedAt: string): { emoji: string; label: string; className: string } | null {
  const days = getDaysSinceJoined(joinedAt);
  if (days <= 30) {
    return { emoji: '🌱', label: `入社${days}日目`, className: 'bg-green-100 text-green-700' };
  }
  if (days <= 60) {
    return { emoji: '💪', label: `入社${days}日目`, className: 'bg-blue-100 text-blue-700' };
  }
  return null;
}

function isNewbie(joinedAt: string): boolean {
  return getDaysSinceJoined(joinedAt) <= 30;
}

function NewbadgePill({ joinedAt }: { joinedAt: string }) {
  const info = getNewbadgeInfo(joinedAt);
  if (!info) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${info.className}`}>
      {info.emoji} {info.label}
    </span>
  );
}

function WelcomeCard({ firstName, memberId, router }: { firstName: string; memberId: string; router: ReturnType<typeof useRouter> }) {
  const steps = [
    { label: 'プロフィール設定', path: '/settings/profile', done: false },
    { label: '最初の名刺を登録', path: `/home/${memberId}/deals`, done: false },
    { label: '今週の目標を入れる', path: '', done: false },
  ];

  return (
    <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl border border-teal-100 p-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🎉</span>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900">ようこそ、{firstName}さん！</h3>
          <p className="text-sm text-gray-600 mt-1">まずは最初のステップから始めましょう</p>
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => { if (step.path) router.push(step.path); }}
            className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-teal-200 hover:bg-teal-50/40 active:scale-[0.98] transition-all text-left"
          >
            <span className="w-6 h-6 rounded-full border-2 border-gray-300 shrink-0 flex items-center justify-center text-xs font-semibold text-gray-500">
              {i + 1}
            </span>
            <span className="text-sm font-semibold text-gray-800">{step.label}</span>
            {step.path && <span className="ml-auto text-gray-500 text-xs">→</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function WelcomeModal({ firstName, memberId, onClose }: { firstName: string; memberId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-sm max-w-sm w-full p-6 z-10">
        <div className="text-center">
          <span className="text-5xl">✨</span>
          <h2 className="text-lg font-semibold text-gray-900 mt-3">コアリスAIへようこそ！</h2>
          <p className="text-sm text-gray-600 mt-1">{firstName}さん、入社おめでとうございます</p>
        </div>
        <div className="mt-5 space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 rounded-xl">
            <span className="text-xl shrink-0">📋</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">案件を登録する</p>
              <p className="text-xs text-gray-600 mt-0.5">名刺の写真から自動で取り込めます</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-green-50 rounded-xl">
            <span className="text-xl shrink-0">📝</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">進捗を毎日入れる</p>
              <p className="text-xs text-gray-600 mt-0.5">「今日の進捗を入れる」ボタンが入口です</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 rounded-xl">
            <span className="text-xl shrink-0">🏆</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">ランキングで成長を実感</p>
              <p className="text-xs text-gray-600 mt-0.5">先輩の背中を見ながら、自分のペースで</p>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          はじめる 🚀
        </button>
      </div>
    </div>
  );
}

function ActionRow({ action, onCheck, memberId, onCalendarAdded }: {
  action: Action;
  onCheck: (id: string) => void;
  memberId: string;
  onCalendarAdded: (id: string) => void;
}) {
  const router = useRouter();
  const dueColor =
    action.priority === 'urgent' ? 'text-gray-900'
    : action.priority === 'today' ? 'text-gray-900'
    : 'text-gray-500';
  const priorityLabel =
    action.priority === 'urgent' ? '至急'
    : action.priority === 'today' ? '今日'
    : null;

  const handleClick = () => {
    if (action.isProductionTask) {
      router.push('/production');
      return;
    }
    if (action.dealId) router.push(`/home/${memberId}/deals?deal=${action.dealId}`);
  };

  const handleCalendar = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = buildGoogleCalendarUrl(action);
    window.open(url, '_blank', 'noopener,noreferrer');
    onCalendarAdded(action.id);
  };

  return (
    <div className={`group flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors ${action.done ? 'opacity-40' : ''}`}>
      <button
        onClick={(e) => { e.stopPropagation(); onCheck(action.id); }}
        className={`w-5 h-5 rounded-full border shrink-0 transition-all flex items-center justify-center ${
          action.done ? 'bg-gray-900 border-gray-900' : 'border-gray-300 hover:border-gray-900'
        }`}
      >
        {action.done && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <button onClick={handleClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-baseline gap-2 mb-0.5">
          {priorityLabel && (
            <span className={`text-xs font-semibold tracking-widest ${action.priority === 'urgent' ? 'text-gray-900' : 'text-gray-500'}`}>
              {priorityLabel}
            </span>
          )}
          <p className={`text-sm font-semibold ${action.done ? 'line-through text-gray-500' : 'text-gray-900'}`}>{action.content}</p>
        </div>
        <div className="flex items-center gap-3">
          {action.isProductionTask && (
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5 shrink-0">制作</span>
          )}
          <p className="text-xs text-gray-500 truncate">{action.client}</p>
          <p className={`text-xs ${dueColor}`}>{action.dueLabel}</p>
        </div>
      </button>

      {!action.done && (
        <button
          onClick={handleCalendar}
          title="Googleカレンダーに登録"
          className="opacity-0 group-hover:opacity-100 text-xs font-medium text-gray-500 hover:text-gray-900 transition-all shrink-0"
        >
          予定登録
        </button>
      )}
    </div>
  );
}

function StatBlock({ label, value, sub, alert }: { label: string; value: string; sub?: string; alert?: boolean }) {
  return (
    <div className="px-6 py-5 border-r last:border-r-0 border-gray-100">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.15em] mb-2">{label}</p>
      <p className={`text-3xl font-semibold tabular-nums ${alert ? 'text-gray-900' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

function RevenueAchievementCard({ accent, current, target }: { accent: string; current: number; target: number }) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const remain = Math.max(target - current, 0);
  const w = 220;
  const h = 8;
  const filledW = (pct / 100) * w;
  const gradId = `bar-${accent.replace('#', '')}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 w-full flex flex-col">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">売上達成率</p>
        <span className="text-xs text-gray-500">月末まで22日</span>
      </div>
      <div className="flex items-baseline gap-2 mt-3">
        <p className="text-4xl font-semibold text-gray-900 tabular-nums leading-none">{pct}</p>
        <p className="text-base text-gray-500">%</p>
      </div>
      <div className="mt-3">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 8 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={accent} stopOpacity="0.7" />
              <stop offset="100%" stopColor={accent} />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width={w} height={h} rx="4" fill="#f3f4f6" />
          <rect x="0" y="0" width={filledW} height={h} rx="4" fill={`url(#${gradId})`} className="transition-all duration-1000 ease-out" />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-auto pt-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">実績</p>
          <p className="text-base font-semibold text-gray-900 tabular-nums mt-0.5">¥{Math.round(current / 10000).toLocaleString()}<span className="text-xs text-gray-500 ml-0.5">万</span></p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">残り</p>
          <p className="text-base font-semibold tabular-nums mt-0.5" style={{ color: accent }}>¥{Math.round(remain / 10000).toLocaleString()}<span className="text-xs text-gray-500 ml-0.5">万</span></p>
        </div>
      </div>
    </div>
  );
}

function RevenueTrendCard({ data, accent }: { data: { week: string; value: number }[]; accent: string }) {
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const w = 600;
  const h = 160;
  const padL = 8;
  const padR = 8;
  const padT = 18;
  const padB = 24;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;
  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const xy = data.map((d, i) => {
    const x = padL + i * stepX;
    const y = padT + innerH - ((d.value - min) / range) * innerH;
    return { x, y, value: d.value, week: d.week };
  });
  const linePath = `M ${xy.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  const areaPath = `${linePath} L ${w - padR},${padT + innerH} L ${padL},${padT + innerH} Z`;
  const last = xy[xy.length - 1];
  const first = xy[0];
  const change = first.value > 0 ? Math.round(((last.value - first.value) / first.value) * 100) : 0;
  const gradId = `trend-${accent.replace('#', '')}`;
  const total = data.reduce((s, d) => s + d.value, 0);
  const avg = Math.round(total / data.length);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 w-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">週次売上推移</p>
          <p className="text-2xl font-semibold text-gray-900 tabular-nums mt-1">¥{last.value}<span className="text-sm text-gray-500 ml-1">万</span></p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${change >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
          <p className="text-[11px] text-gray-500 mt-1 tabular-nums">平均 ¥{avg}万</p>
        </div>
      </div>
      <div className="flex-1 mt-3 -mx-2 min-h-0 flex items-end">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: 110 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.28" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <line key={r} x1={padL} x2={w - padR} y1={padT + innerH * r} y2={padT + innerH * r} stroke="#f3f4f6" strokeWidth="1" />
          ))}
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1={last.x} y1={padT} x2={last.x} y2={padT + innerH} stroke={accent} strokeWidth="1" strokeDasharray="2 3" opacity="0.4" />
          {xy.map((p, i) => (
            <g key={i}>
              {i === xy.length - 1 && (
                <>
                  <circle cx={p.x} cy={p.y} r="10" fill={accent} fillOpacity="0.15" />
                  <circle cx={p.x} cy={p.y} r="5" fill={accent} stroke="#fff" strokeWidth="2.5" />
                </>
              )}
              {i !== xy.length - 1 && (
                <circle cx={p.x} cy={p.y} r="3" fill="#fff" stroke={accent} strokeWidth="2" />
              )}
            </g>
          ))}
          {xy.map((p, i) => (
            <text key={`x-${i}`} x={p.x} y={h - 6} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 10, fontWeight: 500 }}>
              {p.week}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function FunnelCard({ data, accent }: { data: { label: string; count: number }[]; accent: string }) {
  const max = data[0]?.count || 1;
  const overall = Math.round((data[data.length - 1].count / max) * 100);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 w-full flex flex-col">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-[0.12em]">商談ファネル</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{overall}<span className="text-sm text-gray-500 ml-0.5">%</span></p>
            <p className="text-xs text-gray-500">総合転換率</p>
          </div>
        </div>
      </div>
      <div className="flex-1 mt-3 space-y-2 flex flex-col justify-around">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100;
          const conv = i > 0 && data[i - 1].count > 0 ? Math.round((d.count / data[i - 1].count) * 100) : null;
          const opacity = 1 - (i / data.length) * 0.45;
          return (
            <div key={d.label}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{d.label}</span>
                <div className="flex items-baseline gap-2">
                  {conv !== null && (
                    <span className={`text-xs font-semibold tabular-nums ${conv >= 60 ? 'text-emerald-600' : conv >= 40 ? 'text-gray-500' : 'text-amber-600'}`}>
                      {conv}%
                    </span>
                  )}
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{d.count}</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: accent, opacity }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MemberDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.memberId as string;
  const member = MEMBERS[memberId] ?? { firstName: memberId, role: 'Member', accent: '#3B82F6', joinedAt: '2020-01-01' };

  const newbie = isNewbie(member.joinedAt);
  const memberKpi = MEMBER_KPIS.find((m) => m.id === memberId);
  const isZeroKpi = memberKpi
    ? memberKpi.revenue === 0 && memberKpi.gross === 0 && memberKpi.meetings === 0
    : false;
  const showWelcomeCard = newbie && isZeroKpi;

  const [liveDeals] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return loadAllDeals(); } catch { return []; }
  });
  const [liveCards] = useState(() => {
    if (typeof window === 'undefined') return [];
    try { return loadProductionCards(); } catch { return []; }
  });

  const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const memberNames: Record<string, string> = { kashiwagi: '柏樹 久美子', inukai: '犬飼 智之', izumi: '和泉 阿委璃', ono: '小野 崇', ichioka: '市岡 陸' };
  const myName = memberNames[memberId] ?? '';
  const myDeals = liveDeals.filter((d: { assignee: string }) => d.assignee === myName);
  const myOrdered = myDeals.filter((d: { stage: string }) => orderedStages.includes(d.stage));
  const myRevenue = myOrdered.reduce((s: number, d: { amount: number }) => s + d.amount, 0);

  const kpi = {
    revenue: myRevenue,
    revenueTarget: 0,
    grossProfit: Math.round(myRevenue * 0.457),
    grossProfitTarget: 0,
    meetings: myDeals.filter((d: { stage: string }) => d.stage === 'meeting').length,
    meetingsTarget: 0,
    orders: myOrdered.length,
    ordersTarget: 0,
    pipeline: myDeals.filter((d: { stage: string }) => !orderedStages.includes(d.stage) && d.stage !== 'lost').length,
    pipelineTarget: 0,
  };

  const pipeline = [
    { key: 'lead', label: 'アポ', count: myDeals.filter((d: { stage: string }) => d.stage === 'lead').length, amount: 0 },
    { key: 'meeting', label: '商談', count: myDeals.filter((d: { stage: string }) => d.stage === 'meeting').length, amount: 0 },
    { key: 'estimate', label: '見積', count: myDeals.filter((d: { stage: string }) => ['proposal', 'estimate_sent', 'negotiation'].includes(d.stage)).length, amount: myDeals.filter((d: { stage: string; amount: number }) => ['proposal', 'estimate_sent', 'negotiation'].includes(d.stage)).reduce((s: number, d: { amount: number }) => s + Math.round(d.amount / 10000), 0) },
    { key: 'ordered', label: '受注', count: myOrdered.length, amount: Math.round(myRevenue / 10000) },
  ];

  const [actions, setActions] = useState<Action[]>([]);
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const key = `coaris_welcome_seen_${memberId}`;
    if (newbie && !localStorage.getItem(key)) {
      setShowModal(true);
    }
  }, [memberId, newbie]);

  const handleCloseModal = () => {
    const key = `coaris_welcome_seen_${memberId}`;
    localStorage.setItem(key, '1');
    setShowModal(false);
  };

  const [myHandoffTasks, setMyHandoffTasks] = useState<{ cardId: string; dealName: string; taskId: string; title: string; status: string }[]>([]);

  useEffect(() => {
    if (newbie && isZeroKpi) return;
    const assigneeMap = loadProdTaskAssignees();
    const statusMap = loadProdTaskStatus();
    const myTasks = ALL_PROD_TASKS_DATA.filter(
      (t) => assigneeMap[t.id] === memberId
    );
    const prodActions: Action[] = myTasks
      .filter((t) => (statusMap[t.id] ?? t.status) !== 'done')
      .map((t) => {
        const { dueLabel, priority } = buildDueLabel(t.dueDate);
        return {
          id: `prod_${t.id}`,
          content: `[制作] ${t.title}`,
          client: t.projectName,
          dueDate: t.dueDate,
          dueLabel,
          priority,
          done: false,
          effort: 2,
          isProductionTask: true,
          productionTaskId: t.id,
        };
      });

    const cards = loadProductionCards();
    const handoffTasksForMe: typeof myHandoffTasks = [];
    const handoffActions: Action[] = [];
    cards.forEach((card) => {
      card.tasks.forEach((t) => {
        if (t.assigneeId !== memberId) return;
        handoffTasksForMe.push({ cardId: card.id, dealName: card.dealName, taskId: t.id, title: t.title, status: t.status });
        if (t.status === 'done') return;
        const dueDate = t.dueDate ?? '';
        const { dueLabel, priority } = dueDate ? buildDueLabel(dueDate) : { dueLabel: '期限未設定', priority: 'upcoming' as ActionPriority };
        handoffActions.push({
          id: `handoff_${t.id}`,
          content: `[制作] ${t.title}`,
          client: card.dealName,
          dueDate,
          dueLabel,
          priority,
          done: false,
          effort: 2,
          isProductionTask: true,
          productionTaskId: t.id,
        });
      });
    });
    setMyHandoffTasks(handoffTasksForMe);

    const combined = [...prodActions, ...handoffActions];
    if (combined.length === 0) return;
    setActions((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const newOnes = combined.filter((a) => !existingIds.has(a.id));
      return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
    });
  }, [memberId, newbie, isZeroKpi]);

  const handleCheck = (id: string) => {
    setActions((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      const next = { ...a, done: !a.done };
      if (a.isProductionTask && a.productionTaskId) {
        const map = loadProdTaskStatus();
        if (next.done) {
          map[a.productionTaskId] = 'done';
        } else {
          delete map[a.productionTaskId];
        }
        saveProdTaskStatus(map);
      }
      return next;
    }));
  };

  const handleCalendarAdded = (id: string) => {
    const a = actions.find((x) => x.id === id);
    setCalendarMsg(a ? `「${a.content}」をGoogleカレンダーに登録しました` : 'カレンダーを開きました');
    setTimeout(() => setCalendarMsg(null), 3000);
  };

  const priorityRank: Record<ActionPriority, number> = { urgent: 0, today: 1, upcoming: 2 };
  const sortedPending = actions
    .filter((a) => !a.done)
    .sort((a, b) => {
      const p = priorityRank[a.priority] - priorityRank[b.priority];
      if (p !== 0) return p;
      return a.effort - b.effort;
    });
  const pendingActions = sortedPending;
  const todayActions = pendingActions.filter((a) => a.priority === 'today' || a.priority === 'urgent');
  const upcomingActions = pendingActions.filter((a) => a.priority === 'upcoming');
  const doneActions = actions.filter((a) => a.done);

  const revenuePct = kpi.revenueTarget > 0 ? Math.round((kpi.revenue / kpi.revenueTarget) * 100) : 0;
  const grossPct = kpi.grossProfitTarget > 0 ? Math.round((kpi.grossProfit / kpi.grossProfitTarget) * 100) : 0;
  const totalPipelineAmount = pipeline.reduce((s, p) => s + p.amount, 0);

  const isNonSales = ['Designer', 'Creative Director'].includes(member.role);
  const handoffDoneCount = myHandoffTasks.filter((t) => t.status === 'done').length;
  const handoffTotalCount = myHandoffTasks.length;
  const handoffProgressRate = handoffTotalCount > 0 ? Math.round((handoffDoneCount / handoffTotalCount) * 100) : 0;

  const COMPANY_RANKING = Object.entries(memberNames).map(([id, name]) => {
    const d = liveDeals.filter((x: { assignee: string; stage: string }) => x.assignee === name && orderedStages.includes(x.stage));
    const m = MEMBERS[id as keyof typeof MEMBERS];
    return { id, name, company: 'トライポット', revenue: d.reduce((s: number, x: { amount: number }) => s + Math.round(x.amount / 10000), 0), grossProfit: d.reduce((s: number, x: { amount: number }) => s + Math.round(x.amount * 0.457 / 10000), 0), joinedAt: m?.joinedAt ?? '' };
  }).sort((a, b) => b.revenue - a.revenue);
  const companyRankIdx = COMPANY_RANKING.findIndex((m) => m.id === memberId);
  const companyRank = companyRankIdx >= 0 ? companyRankIdx + 1 : null;
  const GROUP_RANKING_LIVE = COMPANY_RANKING;
  const groupRankIdx = GROUP_RANKING_LIVE.findIndex((m) => m.id === memberId);
  const groupRank = groupRankIdx >= 0 ? groupRankIdx + 1 : null;

  return (
    <div className="bg-white min-h-screen pb-16">
      {showModal && (
        <WelcomeModal firstName={member.firstName} memberId={memberId} onClose={handleCloseModal} />
      )}

      {calendarMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm">
          ✓ {calendarMsg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        <div className="flex items-center gap-3 flex-wrap">
          <TodayProgressCTA />
          <NewbadgePill joinedAt={member.joinedAt} />
        </div>

        {showWelcomeCard && (
          <WelcomeCard firstName={member.firstName} memberId={memberId} router={router} />
        )}

        {isNonSales ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">今月の制作タスク</p>
                <h2 className="text-base font-semibold text-gray-900">あなたに割り当てられた制作ワーク</h2>
              </div>
              <button
                onClick={() => router.push('/production')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98]">
                制作ダッシュボード →
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">割当タスク</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">{handoffTotalCount}<span className="text-sm font-medium text-gray-500 ml-1">件</span></p>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">完了</p>
                <p className="text-2xl font-semibold text-emerald-700 tabular-nums">{handoffDoneCount}<span className="text-sm font-medium text-gray-500 ml-1">件</span></p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">進捗率</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">{handoffProgressRate}%</p>
                <div className="w-full bg-gray-200 rounded-full h-1 mt-1 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${handoffProgressRate}%` }} />
                </div>
              </div>
            </div>
            {myHandoffTasks.length === 0 && (
              <p className="text-xs text-gray-500 mt-3 text-center py-2">まだ制作タスクが割り当てられていません。PMからのアサイン待ちです。</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            <div className="lg:col-span-4 flex">
              <RevenueAchievementCard accent={member.accent} current={kpi.revenue} target={kpi.revenueTarget} />
            </div>
            <div className="lg:col-span-5 flex">
              <RevenueTrendCard data={[{ week: '今週', value: Math.round(myRevenue / 10000) }]} accent={member.accent} />
            </div>
            <div className="lg:col-span-3 flex">
              <FunnelCard data={[
                { label: 'アポ', count: myDeals.filter((d: { stage: string }) => d.stage === 'lead').length },
                { label: '商談', count: myDeals.filter((d: { stage: string }) => d.stage === 'meeting').length },
                { label: '提案', count: myDeals.filter((d: { stage: string }) => ['proposal', 'estimate_sent'].includes(d.stage)).length },
                { label: '見積', count: myDeals.filter((d: { stage: string }) => d.stage === 'negotiation').length },
                { label: '受注', count: myOrdered.length },
              ]} accent={member.accent} />
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">今週やること</h2>
              <p className="text-xs text-gray-500 mt-0.5">期限が近い順 → 簡単な順に並んでいます</p>
            </div>
            {pendingActions.length === 0 ? (
              showWelcomeCard ? (
                <span className="text-xs font-semibold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full">🌱 まだこれから！</span>
              ) : (
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">すべて完了 ✓</span>
              )
            ) : (
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">{pendingActions.length}件</span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {todayActions.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">今日 / 至急</p>
                </div>
                {todayActions.map((a) => (
                  <ActionRow key={a.id} action={a} onCheck={handleCheck} memberId={memberId} onCalendarAdded={handleCalendarAdded} />
                ))}
              </>
            )}
            {upcomingActions.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">この後</p>
                </div>
                {upcomingActions.map((a) => (
                  <ActionRow key={a.id} action={a} onCheck={handleCheck} memberId={memberId} onCalendarAdded={handleCalendarAdded} />
                ))}
              </>
            )}
            {doneActions.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1 bg-gray-50/50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">完了 ({doneActions.length})</p>
                </div>
                {doneActions.map((a) => (
                  <ActionRow key={a.id} action={a} onCheck={handleCheck} memberId={memberId} onCalendarAdded={handleCalendarAdded} />
                ))}
              </>
            )}
            {actions.length === 0 && (
              <div className="px-5 py-8 text-center">
                {showWelcomeCard ? (
                  <div>
                    <p className="text-2xl mb-2">👆</p>
                    <p className="text-sm font-semibold text-gray-700">上のカードからはじめましょう</p>
                    <p className="text-xs text-gray-500 mt-1">案件を登録すると、ここにやることが並びます</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">アクションがありません</p>
                )}
              </div>
            )}
          </div>
        </div>

        <RecentContactsStrip />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">社内ランキング</h2>
                {companyRank && (
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">あなた {companyRank}位 / {COMPANY_RANKING.length}人</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">トライポット内・今月売上</p>
            </div>
            <div className="divide-y divide-gray-100">
              {COMPANY_RANKING.map((m, i) => {
                const isMe = m.id === memberId;
                const rank = i + 1;
                const memberNewbie = isNewbie(m.joinedAt);
                return (
                  <div key={m.id} className={`px-5 py-3 flex items-center gap-3 ${isMe ? 'bg-blue-50/40' : ''}`}>
                    <div className="w-8 text-center shrink-0">
                      {rank === 1 ? (
                        <span className="text-2xl">👑</span>
                      ) : memberNewbie ? (
                        <span className="text-sm">🌱</span>
                      ) : (
                        <span className={`text-lg font-semibold tabular-nums ${rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-amber-700' : 'text-gray-500'}`}>{rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-semibold ${isMe ? 'text-blue-900' : 'text-gray-900'}`}>
                          {m.name}{isMe && <span className="ml-1.5 text-xs text-blue-600">YOU</span>}
                        </p>
                        {memberNewbie && (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">NEW</span>
                        )}
                      </div>
                      {memberNewbie && (
                        <p className="text-[11px] text-gray-500 mt-0.5">先輩の背中を見て学ぼう</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {memberNewbie ? (
                        <span className="text-xs text-gray-500">記録なし</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">¥{m.revenue}万</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">グループ全社ランキング</h2>
                {groupRank && (
                  <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">あなた {groupRank}位 / {GROUP_RANKING_LIVE.length}人</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">コアリスHDグループ12社・今月売上</p>
            </div>
            <div className="divide-y divide-gray-100">
              {GROUP_RANKING_LIVE.map((m, i) => {
                const isMe = m.id === memberId;
                const rank = i + 1;
                const memberNewbie = isNewbie(m.joinedAt);
                return (
                  <div key={`${m.id}-${i}`} className={`px-5 py-3 flex items-center gap-3 ${isMe ? 'bg-purple-50/40' : ''}`}>
                    <div className="w-8 text-center shrink-0">
                      {rank === 1 ? (
                        <span className="text-2xl">👑</span>
                      ) : memberNewbie ? (
                        <span className="text-sm">🌱</span>
                      ) : (
                        <span className={`text-lg font-semibold tabular-nums ${rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-amber-700' : 'text-gray-500'}`}>{rank}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className={`text-sm font-semibold truncate ${isMe ? 'text-purple-900' : 'text-gray-900'}`}>
                          {m.name}{isMe && <span className="ml-1.5 text-xs text-purple-600">YOU</span>}
                        </p>
                        {memberNewbie && (
                          <span className="text-xs font-semibold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full shrink-0">NEW</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{m.company}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {memberNewbie ? (
                        <span className="text-xs text-gray-500">記録なし</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">¥{m.revenue}万</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">パイプライン</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalPipelineAmount > 0 ? `合計 ${formatMan(totalPipelineAmount * 10000)}` : 'まだ案件がありません'}
              </p>
            </div>
            <button
              onClick={() => router.push(`/home/${memberId}/deals`)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              すべて見る →
            </button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6">
            {pipeline.map((p) => (
              <button
                key={p.key}
                onClick={() => router.push(`/home/${memberId}/deals`)}
                className={`px-3 py-4 text-left border-r last:border-r-0 border-gray-100 hover:bg-blue-50/50 active:scale-[0.98] transition-all ${
                  p.count === 0 ? 'opacity-40' : ''
                }`}
              >
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{p.label}</p>
                <p className="text-xl font-semibold text-gray-900 tabular-nums mt-0.5">{p.count}</p>
                {p.amount > 0 && <p className="text-xs text-gray-500 tabular-nums mt-0.5">¥{p.amount}万</p>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
