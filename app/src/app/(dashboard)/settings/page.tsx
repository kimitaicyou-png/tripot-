'use client';

import { useState, useEffect } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import Link from 'next/link';
import { MonthlyTarget, MOCK_TARGET, MOCK_ACTUAL, type MonthlyTarget as MonthlyTargetType } from '@/components/personal/MonthlyTarget';
import { FixedCostsDemo } from '@/components/finance/FixedCosts';

const AVAILABLE_MONTHS = [
  '2026-04',
  '2026-03',
  '2026-02',
  '2026-01',
  '2025-12',
  '2025-11',
];

const MOCK_HISTORY: MonthlyTargetType[] = [
  { month: '2026-03', revenueTarget: 11000000, grossProfitTarget: 5000000, grossMarginTarget: 45 },
  { month: '2026-02', revenueTarget: 10000000, grossProfitTarget: 4500000, grossMarginTarget: 45 },
  { month: '2026-01', revenueTarget: 10000000, grossProfitTarget: 4500000, grossMarginTarget: 45 },
  { month: '2025-12', revenueTarget: 13000000, grossProfitTarget: 6000000, grossMarginTarget: 46 },
  { month: '2025-11', revenueTarget: 11000000, grossProfitTarget: 5000000, grossMarginTarget: 45 },
];

const MOCK_SGA_RATES = [
  { label: '当期 販管費率', value: '32.5%' },
  { label: '上半期 販管費率', value: '34.2%' },
  { label: '前期 販管費率', value: '31.8%' },
];

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  return `${year}年${parseInt(m, 10)}月`;
}

function formatMan(amount: number): string {
  return `¥${Math.floor(amount / 10000).toLocaleString()}万`;
}

function getFiscalPeriods(startMonth: number): {
  fullPeriod: string;
  firstHalf: string;
  secondHalf: string;
} {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const fiscalYear =
    currentMonth >= startMonth ? currentYear : currentYear - 1;

  const fyStart = { year: fiscalYear, month: startMonth };

  const addMonths = (year: number, month: number, n: number) => {
    const total = (month - 1) + n;
    return { year: year + Math.floor(total / 12), month: (total % 12) + 1 };
  };

  const fyEnd = addMonths(fyStart.year, fyStart.month, 11);
  const h1End = addMonths(fyStart.year, fyStart.month, 5);
  const h2Start = addMonths(fyStart.year, fyStart.month, 6);

  const fmt = (y: number, m: number) => `${y}年${m}月`;

  return {
    fullPeriod: `${fmt(fyStart.year, fyStart.month)}〜${fmt(fyEnd.year, fyEnd.month)}`,
    firstHalf: `${fmt(fyStart.year, fyStart.month)}〜${fmt(h1End.year, h1End.month)}`,
    secondHalf: `${fmt(h2Start.year, h2Start.month)}〜${fmt(fyEnd.year, fyEnd.month)}`,
  };
}

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const GearIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function SettingsPage() {
  const [selectedMonth, setSelectedMonth] = useState('2026-04');
  const [savedTarget, setSavedTarget] = usePersistedState('settings_target', MOCK_TARGET);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [fiscalStartMonth, setFiscalStartMonth] = useState(4);

  useEffect(() => {
    const stored = localStorage.getItem('coaris_fiscal_start_month');
    if (stored) setFiscalStartMonth(Number(stored));
  }, []);
  const [fiscalSaveMessage, setFiscalSaveMessage] = useState<string | null>(null);

  const handleTargetChange = (newTarget: MonthlyTargetType) => {
    setSavedTarget(newTarget);
    setSaveMessage('保存しました');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleFiscalMonthChange = (value: number) => {
    setFiscalStartMonth(value);
    localStorage.setItem('coaris_fiscal_start_month', String(value));
    setFiscalSaveMessage('設定を保存しました');
    setTimeout(() => setFiscalSaveMessage(null), 2000);
  };

  const currentTarget = selectedMonth === '2026-04'
    ? savedTarget
    : MOCK_HISTORY.find((h) => h.month === selectedMonth) ?? savedTarget;

  const fiscalPeriods = getFiscalPeriods(fiscalStartMonth);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/home"
            className="text-gray-500 hover:text-gray-600 transition-colors"
            aria-label="ホームに戻る"
          >
            <BackIcon />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500"><GearIcon /></span>
            <p className="text-sm font-semibold text-gray-900">個人設定</p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="monthSelect" className="block text-xs font-medium text-gray-700 mb-1">
            対象月
          </label>
          <select
            id="monthSelect"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white min-w-[140px]"
          >
            {AVAILABLE_MONTHS.map((m) => (
              <option key={m} value={m}>{formatMonthLabel(m)}</option>
            ))}
          </select>
        </div>

        {saveMessage && (
          <div
            className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-600 font-medium"
            aria-live="polite"
          >
            {saveMessage}
          </div>
        )}

        <div className="mb-8">
          <MonthlyTarget
            target={currentTarget}
            actual={MOCK_ACTUAL}
            onTargetChange={selectedMonth === '2026-04' ? handleTargetChange : undefined}
            editable={selectedMonth === '2026-04'}
          />
          {selectedMonth !== '2026-04' && (
            <p className="text-xs text-gray-500 mt-2">過去月の目標は編集できません。</p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">目標履歴</p>
          <div className="border border-gray-200 rounded-lg bg-white divide-y divide-gray-100 overflow-hidden">
            <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-gray-50">
              <span className="text-xs font-semibold text-gray-500">月</span>
              <span className="text-xs font-semibold text-gray-500 text-right">売上目標</span>
              <span className="text-xs font-semibold text-gray-500 text-right">粗利目標</span>
              <span className="text-xs font-semibold text-gray-500 text-right">粗利率</span>
            </div>
            {MOCK_HISTORY.map((h) => (
              <button
                key={h.month}
                type="button"
                onClick={() => setSelectedMonth(h.month)}
                className={`w-full grid grid-cols-4 gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left ${
                  selectedMonth === h.month ? 'bg-blue-50' : ''
                }`}
              >
                <span className="text-sm text-gray-900">{formatMonthLabel(h.month)}</span>
                <span className="text-sm text-gray-700 tabular-nums text-right">{formatMan(h.revenueTarget)}</span>
                <span className="text-sm text-gray-700 tabular-nums text-right">{formatMan(h.grossProfitTarget)}</span>
                <span className="text-sm text-gray-700 tabular-nums text-right">{h.grossMarginTarget}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <FixedCostsDemo />
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-16">
        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">期首設定</p>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <label htmlFor="fiscalStartSelect" className="text-sm font-semibold text-gray-700 shrink-0">
                期首月
              </label>
              <select
                id="fiscalStartSelect"
                value={fiscalStartMonth}
                onChange={(e) => handleFiscalMonthChange(Number(e.target.value))}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white min-w-[120px]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              {fiscalSaveMessage && (
                <span className="text-xs text-blue-600 font-medium" aria-live="polite">
                  {fiscalSaveMessage}
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">当期</span>
                <span className="text-xs text-gray-700 tabular-nums">{fiscalPeriods.fullPeriod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">上半期</span>
                <span className="text-xs text-gray-700 tabular-nums">{fiscalPeriods.firstHalf}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">下半期</span>
                <span className="text-xs text-gray-700 tabular-nums">{fiscalPeriods.secondHalf}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">販管費率</p>
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
            <div className="divide-y divide-gray-100">
              {MOCK_SGA_RATES.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                  <span className="text-sm text-gray-700">{row.label}</span>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">※ MFクラウド連携時に自動算出されます</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">メンバー管理（招待制）</p>
          <MemberManagement />
        </div>

        <div className="mt-4">
          <Link
            href="/resources"
            className="flex items-center justify-between bg-white rounded-2xl shadow-sm px-5 py-4 hover:shadow-sm transition-shadow active:scale-[0.98]"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">外注先管理</p>
              <p className="text-xs text-gray-500 mt-0.5">協力会社・フリーランスの管理</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">データリセット</h2>
              <p className="text-xs text-gray-700 mt-0.5">全ての業務データを初期化します（設定は残ります）</p>
            </div>
            <button
              onClick={() => {
                const keys = [
                  'tripot_production_cards',
                  'coaris_attack_to_deals',
                  'coaris_customers',
                  'coaris_recent_contacts',
                  'coaris_deals_override',
                  'coaris-attack-list',
                  'coaris_email_logs',
                  'coaris_notifications',
                  'coaris_notifications_seeded_v1',
                  'coaris_committed_production_tasks',
                  'coaris_production_task_assignees',
                  'coaris_production_task_status',
                  'budget_plan',
                ];
                keys.forEach((k) => localStorage.removeItem(k));
                localStorage.setItem('tripot_production_cards', '[]');
                localStorage.setItem('tripot_data_reset', '1');
                window.location.reload();
              }}
              className="text-sm font-semibold bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 active:scale-[0.98]"
            >全データリセット</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type MemberRecord = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'member';
  invitedBy: string | null;
  invitedAt: string;
};

const ROLE_LABEL: Record<string, string> = { owner: 'オーナー', manager: 'マネージャー', member: 'メンバー' };
const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-blue-50 text-blue-700 border-blue-200',
  manager: 'bg-gray-100 text-gray-700 border-gray-200',
  member: 'bg-gray-50 text-gray-500 border-gray-200',
};

function MemberManagement() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>('member');
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    setInviting(true);
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`${inviteName}さんを招待しました`);
        setInviteEmail('');
        setInviteName('');
        setShowInvite(false);
        fetchMembers();
      } else {
        setMsg(data.error ?? '招待に失敗しました');
      }
    } catch {
      setMsg('招待に失敗しました');
    }
    setInviting(false);
    setTimeout(() => setMsg(null), 3000);
  };

  const handleRoleChange = async (id: string, role: string) => {
    try {
      await fetch('/api/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role }),
      });
      fetchMembers();
    } catch {}
  };

  const handleRemove = async (id: string, name: string) => {
    if (!confirm(`${name}さんをチームから外しますか？`)) return;
    try {
      await fetch(`/api/members?id=${id}`, { method: 'DELETE' });
      fetchMembers();
    } catch {}
  };

  if (loading) return <div className="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-500">読み込み中...</div>;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">チームメンバー</p>
            <p className="text-xs text-gray-500 mt-0.5">Gmailアドレスで招待。招待されたアカウントのみログイン可能</p>
          </div>
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all"
          >
            + 招待
          </button>
        </div>
      </div>

      {msg && (
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 text-xs font-semibold text-blue-700">{msg}</div>
      )}

      {showInvite && (
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">名前</label>
              <input
                type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">権限</label>
              <select
                value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'manager' | 'member')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white"
              >
                <option value="member">メンバー</option>
                <option value="manager">マネージャー</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Gmailアドレス</label>
            <input
              type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteName}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              {inviting ? '招待中...' : '招待する'}
            </button>
            <button
              onClick={() => setShowInvite(false)}
              className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-100">
        {members.map((m) => (
          <div key={m.id} className="px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                <p className="text-xs text-gray-500 truncate">{m.email || '（メール未設定）'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.id, e.target.value)}
                className={`text-xs font-semibold px-2 py-1 rounded border ${ROLE_BADGE[m.role]} bg-white focus:outline-none`}
              >
                <option value="owner">オーナー</option>
                <option value="manager">マネージャー</option>
                <option value="member">メンバー</option>
              </select>
              {m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.id, m.name)}
                  className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors"
                >
                  外す
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
