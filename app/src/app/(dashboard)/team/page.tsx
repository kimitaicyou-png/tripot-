'use client';

import { useState, useMemo } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';
import Link from 'next/link';
import { LeaveCalendar, MOCK_LEAVE_ENTRIES } from '@/components/team/LeaveCalendar';
import { loadProductionCards } from '@/lib/productionCards';
import { MEMBERS as MEMBERS_RAW } from '@/lib/currentMember';

type Project = {
  name: string;
  role: string;
  hours: number;
};

type Performance = {
  avgSpeedRate: number;
  qualityScore: number;
  onTimeRate: number;
};

type Member = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  skills: string[];
  unitPrice: number;
  capacity: number;
  currentLoad: number;
  projects: Project[];
  performance: Performance;
  totalProjects: number;
  joinDate: string;
  memo: string;
};

function useLiveTeam() {
  const [cards] = useState(() => typeof window !== 'undefined' ? loadProductionCards() : []);
  const members = MEMBERS_RAW;
  return members.map((m) => {
    const myTasks = cards.flatMap((c) => c.tasks).filter((t) => t.assigneeId === m.id);
    const activeTasks = myTasks.filter((t) => t.status !== 'done');
    const doneTasks = myTasks.filter((t) => t.status === 'done');
    const projects = cards.filter((c) => c.status !== 'cancelled' && c.tasks.some((t) => t.assigneeId === m.id)).map((c) => ({ name: c.dealName, role: c.pmId === m.id ? 'PM' : '担当', hours: c.tasks.filter((t) => t.assigneeId === m.id).length * 20 }));
    const withDue = doneTasks.filter((t) => t.dueDate && t.completedAt);
    const onTime = withDue.filter((t) => t.completedAt! <= t.dueDate!);
    const onTimeRate = withDue.length > 0 ? Math.round((onTime.length / withDue.length) * 100) : 0;
    const currentLoad = activeTasks.length * 20;
    return {
      id: m.id,
      name: m.name,
      role: m.level === 'lead' ? '代表取締役/PM' : m.level === 'senior' ? 'シニア' : m.level === 'mid' ? 'ミッド' : 'ジュニア',
      email: m.email ?? '',
      phone: '',
      skills: m.skills ?? [],
      unitPrice: 0,
      capacity: 160,
      currentLoad,
      projects,
      performance: { avgSpeedRate: onTimeRate, qualityScore: 0, onTimeRate },
      totalProjects: doneTasks.length,
      joinDate: '',
      memo: '',
    } as Member;
  });
}

const TEAM_MEMBERS: Member[] = [];

const MONTHLY_MOCK: Record<string, number[]> = {};

const RECENT_PROJECTS_MOCK: Record<string, string[]> = {};

function loadRate(m: Member): number {
  return m.capacity > 0 ? Math.round((m.currentLoad / m.capacity) * 100) : 0;
}

function LoadBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'bg-red-500' : rate >= 50 ? 'bg-blue-600' : 'bg-gray-300';
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function Stars({ score }: { score: number }) {
  const full = Math.floor(score);
  const half = score - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-blue-600 text-xs select-none">
      {'★'.repeat(full)}
      {half ? '½' : ''}
      {'☆'.repeat(empty)}
    </span>
  );
}

function MonthBar({ rate, month }: { rate: number; month: string }) {
  const color = rate >= 80 ? 'bg-red-400' : rate >= 50 ? 'bg-blue-500' : 'bg-gray-300';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-500 tabular-nums">{rate}%</span>
      <div className="w-6 bg-gray-100 rounded-sm overflow-hidden" style={{ height: 40 }}>
        <div
          className={`w-full rounded-sm ${color}`}
          style={{ height: `${Math.min(rate, 100)}%`, marginTop: `${100 - Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-500">{month}</span>
    </div>
  );
}

function AddMemberModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-lg border border-gray-200 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">メンバーを追加</h3>
          <p className="text-xs text-gray-500 mt-0.5">新しい内製メンバーの情報を入力してください</p>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label htmlFor="add-name" className="block text-xs font-medium text-gray-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              id="add-name"
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="例: 山田 太郎"
            />
          </div>
          <div>
            <label htmlFor="add-role" className="block text-xs font-medium text-gray-700 mb-1">
              役割 <span className="text-red-500">*</span>
            </label>
            <input
              id="add-role"
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="例: エンジニア"
            />
          </div>
          <div>
            <label htmlFor="add-email" className="block text-xs font-medium text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="add-email"
              type="email"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="例: yamada@tripot.co.jp"
            />
          </div>
          <div>
            <label htmlFor="add-skills" className="block text-xs font-medium text-gray-700 mb-1">
              スキル（カンマ区切り）
            </label>
            <input
              id="add-skills"
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="例: React, TypeScript, Node.js"
            />
          </div>
          <div>
            <label htmlFor="add-price" className="block text-xs font-medium text-gray-700 mb-1">
              月額単価（円）
            </label>
            <input
              id="add-price"
              type="number"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="例: 700000"
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
          >
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

function MemberCard({
  member,
  expanded,
  onToggle,
  skillQuery,
}: {
  member: Member;
  expanded: boolean;
  onToggle: () => void;
  skillQuery: string;
}) {
  const rate = loadRate(member);
  const monthly = MONTHLY_MOCK[member.id] ?? [0, 0, 0];
  const recentProjects = RECENT_PROJECTS_MOCK[member.id] ?? [];
  const months = ['2月', '3月', '4月'];

  const highlightSkill = (skill: string) => {
    if (!skillQuery) return false;
    return skill.toLowerCase().includes(skillQuery.toLowerCase());
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-base font-semibold text-gray-900">{member.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{member.role}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-gray-900 tabular-nums">
              ¥{(member.unitPrice / 10000).toFixed(0)}万
              <span className="text-xs font-normal text-gray-500">/月</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{member.totalProjects}案件</p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">稼働率</span>
            <span className={`text-xs font-semibold tabular-nums ${rate >= 80 ? 'text-red-600' : rate < 50 ? 'text-blue-600' : 'text-gray-700'}`}>
              {rate}%
              {rate < 50 && <span className="ml-1 font-normal text-blue-600">空きあり</span>}
              {rate >= 80 && <span className="ml-1 font-normal text-red-500">キャパ超過</span>}
            </span>
          </div>
          <LoadBar rate={rate} />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {member.skills.map((s) => (
            <span
              key={s}
              className={`text-xs rounded px-1.5 py-0.5 ${
                highlightSkill(s)
                  ? 'bg-blue-100 text-blue-700 font-medium ring-1 ring-blue-400'
                  : 'text-gray-600 bg-gray-100'
              }`}
            >
              {s}
            </span>
          ))}
        </div>

        <div className="mb-3">
          <p className="text-xs font-medium text-gray-500 mb-1.5">アサイン中</p>
          <ul className="space-y-1">
            {member.projects.map((p) => (
              <li key={p.name} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">・{p.name}</span>
                <span className="text-gray-600 tabular-nums">{p.role}・{p.hours}h</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-gray-50 px-3 py-2.5">
          <p className="text-xs font-medium text-gray-500 mb-1.5">パフォーマンス</p>
          <div className="flex items-center gap-3 flex-wrap text-xs">
            <div className="flex items-center gap-1">
              <span className="text-gray-500">速度</span>
              <Stars score={member.performance.avgSpeedRate / 20} />
              <span className="text-gray-700 tabular-nums font-medium">{member.performance.avgSpeedRate}%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">品質</span>
              <Stars score={member.performance.qualityScore} />
              <span className="text-gray-700 tabular-nums font-medium">{member.performance.qualityScore.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-500">納期</span>
              <span className={`tabular-nums font-medium ${member.performance.onTimeRate < 80 ? 'text-red-600' : 'text-gray-700'}`}>
                {member.performance.onTimeRate}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-4" onClick={(e) => e.stopPropagation()}>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">月次稼働推移（過去3ヶ月）</p>
            <div className="flex gap-3">
              {monthly.map((r, i) => (
                <MonthBar key={months[i]} rate={r} month={months[i]} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">案件履歴（直近5件）</p>
            <ul className="space-y-1">
              {recentProjects.map((name, i) => (
                <li key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs shrink-0">
                    {i + 1}
                  </span>
                  {name}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">スキル編集</p>
            <div className="flex flex-wrap gap-1">
              {member.skills.map((s) => (
                <span key={s} className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">
                  {s}
                  <button className="text-gray-500 hover:text-red-500 leading-none" aria-label={`${s}を削除`}>×</button>
                </span>
              ))}
              <button className="text-xs text-blue-600 bg-blue-50 rounded px-1.5 py-0.5 hover:bg-blue-100">
                + 追加
              </button>
            </div>
          </div>

          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500">メール</dt>
              <dd className="text-gray-700">{member.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">電話</dt>
              <dd className="text-gray-700">{member.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">入社日</dt>
              <dd className="text-gray-700">{member.joinDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">キャパシティ</dt>
              <dd className="text-gray-700">{member.currentLoad}h / {member.capacity}h</dd>
            </div>
            {member.memo && (
              <div className="pt-1 mt-1 border-t border-gray-100">
                <p className="text-gray-500 mb-0.5">メモ</p>
                <p className="text-gray-700">{member.memo}</p>
              </div>
            )}
          </dl>

          <div className="flex gap-2 pt-1">
            <Link
              href={`/home/${member.id}`}
              className="flex-1 py-2 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 text-center active:scale-[0.98] transition">
              個人ダッシュボードを見る
            </Link>
            <Link
              href={`/production`}
              className="flex-1 py-2 border border-gray-200 rounded text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-blue-300 text-center active:scale-[0.98] transition">
              制作タスクを確認
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const liveMembers = useLiveTeam();
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [skillQuery, setSkillQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLeave, setShowLeave] = useState(false);
  const [leaveEntries, setLeaveEntries] = usePersistedState('team_leave_entries', MOCK_LEAVE_ENTRIES);

  const avgLoad = useMemo(() => {
    if (liveMembers.length === 0) return 0;
    const total = liveMembers.reduce((s, m) => s + loadRate(m), 0);
    return Math.round(total / liveMembers.length);
  }, [liveMembers]);

  const overCapacity = liveMembers.filter((m) => loadRate(m) >= 80).length;
  const hasCapacity = liveMembers.filter((m) => loadRate(m) < 50).length;

  const filtered = useMemo(() => {
    let members = [...liveMembers];

    if (skillQuery.trim()) {
      members = members.filter((m) =>
        m.skills.some((s) => s.toLowerCase().includes(skillQuery.toLowerCase()))
      );
    }

    members.sort((a, b) => {
      const diff = loadRate(a) - loadRate(b);
      return sortOrder === 'desc' ? -diff : diff;
    });

    return members;
  }, [skillQuery, sortOrder]);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-900 font-medium">← 設定に戻る</Link>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-sm font-semibold text-gray-900">チーム管理</h1>
          <p className="text-xs text-gray-500 mt-0.5">内製メンバーの稼働・スキル・アサイン状況</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          メンバーを追加
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">メンバー</p>
          <p className="text-sm font-semibold text-gray-900">{TEAM_MEMBERS.length}名</p>
          <p className="text-xs text-gray-500">内製チーム</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">平均稼働率</p>
          <p className={`text-sm font-semibold ${avgLoad >= 80 ? 'text-red-600' : 'text-gray-900'}`}>{avgLoad}%</p>
          <p className="text-xs text-gray-500">全員平均</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">キャパ超過</p>
          <p className={`text-sm font-semibold ${overCapacity > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overCapacity}名</p>
          <p className="text-xs text-gray-500">稼働率80%超</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">空きあり</p>
          <p className="text-sm font-semibold text-blue-600">{hasCapacity}名</p>
          <p className="text-xs text-gray-500">稼働率50%未満</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        <div className="relative flex-1 sm:max-w-xs">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
          <input
            type="text"
            value={skillQuery}
            onChange={(e) => setSkillQuery(e.target.value)}
            placeholder="スキルで検索（例: Next.js）"
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 self-start sm:self-auto">
          <button
            onClick={() => setSortOrder('desc')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortOrder === 'desc' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            忙しい順
          </button>
          <button
            onClick={() => setSortOrder('asc')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${sortOrder === 'asc' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            空いてる順
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <svg
            className="w-8 h-8 text-gray-500 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-500">
            「{skillQuery}」に該当するメンバーがいません
          </p>
          <button
            onClick={() => setSkillQuery('')}
            className="mt-3 text-xs text-blue-600 hover:underline"
          >
            検索をクリア
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3">
          {filtered.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              expanded={expandedId === m.id}
              onToggle={() => setExpandedId(expandedId === m.id ? null : m.id)}
              skillQuery={skillQuery}
            />
          ))}
        </div>
      )}


      <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowLeave(!showLeave)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        >
          <span className="text-sm font-semibold text-gray-900">休暇カレンダー</span>
          <span className="text-xs text-gray-500">{showLeave ? "▲" : "▼"}</span>
        </button>
        {showLeave && (
          <div className="border-t border-gray-200">
            <LeaveCalendar entries={leaveEntries} onChange={setLeaveEntries} />
          </div>
        )}
      </div>

      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
