'use client';

import { useState, useEffect } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { loadAllDeals, calcDealKpi } from '@/lib/dealsStore';

function formatYen(n: number): string {
  return `¥${Math.round(n / 10000).toLocaleString()}万`;
}

function getFiscalPeriods(startMonth: number) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const fiscalYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
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

type MemberRecord = {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'manager' | 'member';
  invitedBy: string | null;
  invitedAt: string;
};

const ROLE_BADGE: Record<string, string> = {
  owner: 'bg-blue-50 text-blue-700 border-blue-200',
  manager: 'bg-gray-100 text-gray-700 border-gray-200',
  member: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name ?? '---';
  const userEmail = session?.user?.email ?? '---';
  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;

  const [activeTab, setActiveTab] = useState<'account' | 'company' | 'members'>('account');
  const [fiscalStartMonth, setFiscalStartMonth] = usePersistedState('fiscal_start_month', 4);
  const [fiscalSaveMsg, setFiscalSaveMsg] = useState<string | null>(null);

  const fiscalPeriods = getFiscalPeriods(fiscalStartMonth);

  const [deals] = useState(() => typeof window !== 'undefined' ? loadAllDeals() : []);
  const kpi = calcDealKpi(deals);

  const budgetPlan = (() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem('budget_plan');
      return raw ? JSON.parse(raw) as {
        segments: Array<{ name: string; values: number[] }>;
        cogs: Array<{ values: number[] }>;
        labor: Array<{ values: number[] }>;
        admin: Array<{ values: number[] }>;
      } : null;
    } catch { return null; }
  })();

  const yearRevenue = budgetPlan ? budgetPlan.segments.reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0) * 10000 : 0;
  const yearCogs = budgetPlan ? budgetPlan.cogs.reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0) * 10000 : 0;
  const yearSga = budgetPlan ? (budgetPlan.labor.reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0) + budgetPlan.admin.reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0)) * 10000 : 0;
  const sgaRate = yearRevenue > 0 ? Math.round((yearSga / yearRevenue) * 100 * 10) / 10 : 0;

  const tabs = [
    { id: 'account' as const, label: 'アカウント' },
    { id: 'company' as const, label: '会社設定' },
    { id: 'members' as const, label: 'メンバー管理' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/home" className="text-gray-500 hover:text-gray-600 transition-colors" aria-label="ホームに戻る">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <p className="text-sm font-semibold text-gray-900">設定</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors active:scale-[0.98] ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'account' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">ログイン情報</p>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-lg font-semibold shrink-0">
                {userName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{userName}</p>
                <p className="text-xs text-gray-500">{userEmail}</p>
                <span className={`inline-flex items-center mt-1 text-xs font-semibold px-2 py-0.5 rounded border ${ROLE_BADGE[userRole ?? 'member']}`}>
                  {userRole === 'owner' ? 'オーナー' : userRole === 'manager' ? 'マネージャー' : 'メンバー'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">今月の実績サマリー</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">受注額</p>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatYen(kpi.totalRevenue)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">粗利率</p>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">{kpi.grossMarginRate}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">案件数</p>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">{kpi.dealCount}件</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">パイプライン</p>
                <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatYen(kpi.pipelineWeighted)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">データリセット</p>
                <p className="text-xs text-gray-500 mt-0.5">全ての業務データを初期化します（設定は残ります）</p>
              </div>
              <button
                onClick={() => {
                  if (!confirm('全データをリセットしますか？この操作は取り消せません。')) return;
                  const keys = ['tripot_deals_all', 'tripot_production_cards', 'coaris_attack_to_deals', 'coaris_customers', 'coaris_recent_contacts', 'coaris_deals_override', 'coaris-attack-list', 'coaris_email_logs', 'budget_plan'];
                  keys.forEach((k) => localStorage.removeItem(k));
                  Object.keys(localStorage).filter((k) => k.startsWith('tripot_')).forEach((k) => localStorage.removeItem(k));
                  window.location.reload();
                }}
                className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 active:scale-[0.98]"
              >リセット</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-4">期首設定</p>
            <div className="flex items-center gap-3 mb-4">
              <label htmlFor="fiscalStartSelect" className="text-sm font-semibold text-gray-700 shrink-0">期首月</label>
              <select id="fiscalStartSelect" value={fiscalStartMonth}
                onChange={(e) => {
                  setFiscalStartMonth(Number(e.target.value));
                  setFiscalSaveMsg('保存しました');
                  setTimeout(() => setFiscalSaveMsg(null), 2000);
                }}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white min-w-[100px]">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              {fiscalSaveMsg && <span className="text-xs text-blue-600 font-medium">{fiscalSaveMsg}</span>}
            </div>
            <div className="space-y-1.5">
              {[
                { label: '当期', value: fiscalPeriods.fullPeriod },
                { label: '上半期', value: fiscalPeriods.firstHalf },
                { label: '下半期', value: fiscalPeriods.secondHalf },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{row.label}</span>
                  <span className="text-xs text-gray-700 tabular-nums">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">事業計画サマリー</p>
            {budgetPlan ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">年間売上計画</p>
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatYen(yearRevenue)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">年間粗利計画</p>
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatYen(yearRevenue - yearCogs)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">年間販管費</p>
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{formatYen(yearSga)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">販管費率</p>
                    <p className="text-lg font-semibold text-gray-900 tabular-nums">{sgaRate}%</p>
                  </div>
                </div>
                <Link href="/budget" className="flex items-center justify-center gap-1 w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">
                  事業計画を編集 →
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-gray-500 mb-3">事業計画がまだ作成されていません</p>
                <Link href="/budget" className="inline-flex items-center gap-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">
                  事業計画を作成 →
                </Link>
              </div>
            )}
          </div>

          <Link href="/resources"
            className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:bg-gray-50 transition-colors active:scale-[0.98]">
            <div>
              <p className="text-sm font-semibold text-gray-900">外注先管理</p>
              <p className="text-xs text-gray-500 mt-0.5">協力会社・フリーランスの管理</p>
            </div>
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}

      {activeTab === 'members' && <MemberManagement />}
    </div>
  );
}

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
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">チームメンバー</p>
              <p className="text-xs text-gray-500 mt-0.5">Gmailで招待 → そのアカウントでログイン可能に</p>
            </div>
            <button onClick={() => setShowInvite(!showInvite)}
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg active:scale-[0.98] transition-all">
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
                <input type="text" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="山田 太郎"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">権限</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'manager' | 'member')}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
                  <option value="member">メンバー（個人のみ）</option>
                  <option value="manager">マネージャー（週次・月次可）</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gmailアドレス</label>
              <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="example@gmail.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleInvite} disabled={inviting || !inviteEmail || !inviteName}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] transition-all">
                {inviting ? '招待中...' : '招待する'}
              </button>
              <button onClick={() => setShowInvite(false)}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">
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
                <select value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded border ${ROLE_BADGE[m.role]} bg-white focus:outline-none`}>
                  <option value="owner">オーナー</option>
                  <option value="manager">マネージャー</option>
                  <option value="member">メンバー</option>
                </select>
                {m.role !== 'owner' && (
                  <button onClick={() => handleRemove(m.id, m.name)}
                    className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors">外す</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4">
        <p className="text-xs text-gray-500">招待されたメンバーは、指定されたGmailアカウントでGoogleログインするとシステムにアクセスできます。権限に応じて閲覧可能な画面が変わります。</p>
      </div>
    </div>
  );
}
