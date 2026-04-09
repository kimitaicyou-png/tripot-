'use client';

import { useState } from 'react';

type Resource = {
  id: string;
  name: string;
  type: 'inhouse' | 'outsource';
  company?: string;
  role: string;
  skills: string[];
  unitPrice: number;
  capacity: number;
  currentLoad: number;
  totalProjects: number;
  avgSpeedRate: number;
  qualityScore: number;
  onTimeRate: number;
  lastProjectDate: string;
  email?: string;
  phone?: string;
  memo?: string;
};

const RESOURCES: Resource[] = [
  { id: 'r1', name: '小野 崇', type: 'inhouse', role: '代表取締役/PM', skills: ['経営', 'PM', '営業'], unitPrice: 1000000, capacity: 160, currentLoad: 128, totalProjects: 45, avgSpeedRate: 95, qualityScore: 4.5, onTimeRate: 92, lastProjectDate: '2026-04-01' },
  { id: 'r2', name: '柏樹 久美子', type: 'inhouse', role: '営業/ディレクター', skills: ['営業', '提案', '顧客折衝'], unitPrice: 800000, capacity: 160, currentLoad: 96, totalProjects: 28, avgSpeedRate: 88, qualityScore: 4.8, onTimeRate: 96, lastProjectDate: '2026-04-03' },
  { id: 'r3', name: '渡辺 健', type: 'inhouse', role: 'エンジニア', skills: ['Next.js', 'TypeScript', 'API設計', 'Supabase'], unitPrice: 750000, capacity: 160, currentLoad: 144, totalProjects: 32, avgSpeedRate: 92, qualityScore: 4.9, onTimeRate: 94, lastProjectDate: '2026-04-04' },
  { id: 'r4', name: '山本 彩', type: 'inhouse', role: 'エンジニア/QA', skills: ['React', 'テスト設計', 'CI/CD'], unitPrice: 700000, capacity: 160, currentLoad: 64, totalProjects: 18, avgSpeedRate: 96, qualityScore: 4.7, onTimeRate: 98, lastProjectDate: '2026-04-02' },
  { id: 'r5', name: 'クリエイトデザイン', type: 'outsource', company: '株式会社クリエイトデザイン', role: 'UIデザイン', skills: ['Figma', 'LP', 'コーポレートサイト', 'バナー'], unitPrice: 600000, capacity: 160, currentLoad: 80, totalProjects: 5, avgSpeedRate: 115, qualityScore: 4.0, onTimeRate: 75, lastProjectDate: '2026-03-28', memo: '納期遅延傾向あり。品質は問題なし' },
  { id: 'r6', name: 'テックブリッジ', type: 'outsource', company: 'テックブリッジ株式会社', role: 'インフラ/DevOps', skills: ['AWS', 'Docker', 'Terraform', '監視'], unitPrice: 850000, capacity: 160, currentLoad: 40, totalProjects: 8, avgSpeedRate: 98, qualityScore: 4.6, onTimeRate: 95, lastProjectDate: '2026-03-20' },
  { id: 'r7', name: 'QAパートナーズ', type: 'outsource', company: '株式会社QAパートナーズ', role: 'テスト/QA', skills: ['E2Eテスト', '負荷テスト', 'セキュリティテスト'], unitPrice: 550000, capacity: 160, currentLoad: 0, totalProjects: 3, avgSpeedRate: 100, qualityScore: 4.8, onTimeRate: 100, lastProjectDate: '2026-02-15' },
];

const EIGHT_OUTSOURCE_CANDIDATES = [
  { name: '佐々木デザイン事務所', contact: '佐々木 太郎', role: 'グラフィックデザイン', skills: ['ロゴ', 'パンフレット'] },
  { name: 'クラウドワークス田中', contact: '田中 次郎', role: 'フリーランスエンジニア', skills: ['PHP', 'Laravel'] },
  { name: 'セキュリティラボ', contact: '高田 三郎', role: 'セキュリティ診断', skills: ['脆弱性診断', 'ペネトレーション'] },
];

function loadRate(r: Resource) {
  return r.capacity > 0 ? Math.round((r.currentLoad / r.capacity) * 100) : 0;
}

function LoadBar({ rate }: { rate: number }) {
  const color = rate >= 80 ? 'bg-red-500' : rate >= 50 ? 'bg-blue-600' : 'bg-gray-200';
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(rate, 100)}%` }} />
    </div>
  );
}

function ResourceCard({ resource, expanded, onToggle }: { resource: Resource; expanded: boolean; onToggle: () => void }) {
  const rate = loadRate(resource);
  return (
    <div className="rounded-lg border border-gray-200 bg-white cursor-pointer" onClick={onToggle}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{resource.name}</span>
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${resource.type === 'inhouse' ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}>
                {resource.type === 'inhouse' ? '内製' : '外注'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{resource.role}</p>
            {resource.company && <p className="text-xs text-gray-500">{resource.company}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-gray-900 tabular-nums">¥{(resource.unitPrice / 10000).toFixed(0)}万<span className="text-xs font-normal text-gray-500">/月</span></p>
            <p className="text-xs text-gray-500">{resource.totalProjects}案件</p>
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">稼働率</span>
            <span className={`text-xs font-semibold tabular-nums ${rate >= 80 ? 'text-red-600' : rate < 50 ? 'text-blue-600' : 'text-gray-700'}`}>
              {rate}%
              {rate < 50 && <span className="ml-1 font-normal">空きあり</span>}
            </span>
          </div>
          <LoadBar rate={rate} />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {resource.skills.map((s) => (
            <span key={s} className="text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{s}</span>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 text-center">
          <div className="rounded bg-gray-50 px-1 py-1.5">
            <p className="text-xs text-gray-500 mb-0.5">速度</p>
            <p className={`text-xs font-semibold tabular-nums ${resource.avgSpeedRate > 100 ? 'text-gray-500' : 'text-gray-900'}`}>{resource.avgSpeedRate}%</p>
          </div>
          <div className="rounded bg-gray-50 px-1 py-1.5">
            <p className="text-xs text-gray-500 mb-0.5">品質</p>
            <p className="text-xs font-semibold text-gray-900">{resource.qualityScore.toFixed(1)}</p>
          </div>
          <div className="rounded bg-gray-50 px-1 py-1.5">
            <p className="text-xs text-gray-500 mb-0.5">納期</p>
            <p className={`text-xs font-semibold tabular-nums ${resource.onTimeRate < 80 ? 'text-red-600' : 'text-gray-900'}`}>{resource.onTimeRate}%</p>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">詳細</p>
          <dl className="space-y-1 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500">直近案件</dt>
              <dd className="text-gray-700">{resource.lastProjectDate}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">キャパシティ</dt>
              <dd className="text-gray-700">{resource.capacity}h / 月</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">現在の稼働</dt>
              <dd className={`font-medium ${resource.currentLoad / resource.capacity >= 0.8 ? 'text-red-600' : 'text-gray-700'}`}>
                {resource.currentLoad}h
              </dd>
            </div>
            {resource.email && (
              <div className="flex justify-between">
                <dt className="text-gray-500">メール</dt>
                <dd className="text-gray-700">{resource.email}</dd>
              </div>
            )}
            {resource.phone && (
              <div className="flex justify-between">
                <dt className="text-gray-500">電話</dt>
                <dd className="text-gray-700">{resource.phone}</dd>
              </div>
            )}
            {resource.memo && (
              <div className="pt-1 mt-1 border-t border-gray-100">
                <p className="text-gray-500 mb-0.5">メモ</p>
                <p className="text-gray-700">{resource.memo}</p>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}

export function ResourcesContent() {
  const [filter, setFilter] = useState<'all' | 'inhouse' | 'outsource'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showEightModal, setShowEightModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);

  const filtered = RESOURCES.filter((r) => filter === 'all' || r.type === filter);
  const inhouse = RESOURCES.filter((r) => r.type === 'inhouse');
  const outsource = RESOURCES.filter((r) => r.type === 'outsource');
  const highLoad = RESOURCES.filter((r) => loadRate(r) >= 80);
  const hasCapacity = RESOURCES.filter((r) => loadRate(r) < 50);
  const inhouseAvgLoad = inhouse.length > 0
    ? Math.round(inhouse.reduce((s, r) => s + loadRate(r), 0) / inhouse.length)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">リソースマスタ</h2>
          <p className="text-xs text-gray-500 mt-0.5">内製メンバーと外注先の一元管理</p>
        </div>
        <button
          onClick={() => setShowEightModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Eightから追加
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">内製</p>
          <p className="text-sm font-semibold text-gray-900">{inhouse.length}名</p>
          <p className="text-xs text-gray-500">平均稼働 {inhouseAvgLoad}%</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">外注</p>
          <p className="text-sm font-semibold text-gray-900">{outsource.length}社</p>
          <p className="text-xs text-gray-500">登録済み</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">稼働率80%超</p>
          <p className={`text-sm font-semibold ${highLoad.length > 0 ? 'text-red-600' : 'text-gray-900'}`}>{highLoad.length}名</p>
          <p className="text-xs text-gray-500">要注意</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-0.5">空きあり</p>
          <p className="text-sm font-semibold text-blue-600">{hasCapacity.length}名</p>
          <p className="text-xs text-gray-500">50%未満</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {(['all', 'inhouse', 'outsource'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {f === 'all' ? '全員' : f === 'inhouse' ? '内製' : '外注'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'card' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            カード
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            テーブル
          </button>
        </div>
      </div>

      {viewMode === 'card' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              expanded={expandedId === r.id}
              onToggle={() => setExpandedId(expandedId === r.id ? null : r.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 overflow-x-auto bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-500 font-medium">名前</th>
                <th className="text-left px-3 py-2.5 text-gray-500 font-medium">種別</th>
                <th className="text-left px-3 py-2.5 text-gray-500 font-medium">役割</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">単価</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">稼働率</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">速度</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">品質</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">納期</th>
                <th className="text-right px-3 py-2.5 text-gray-500 font-medium">案件数</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const rate = loadRate(r);
                return (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      {r.company && <p className="text-xs text-gray-500">{r.company}</p>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${r.type === 'inhouse' ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-600'}`}>
                        {r.type === 'inhouse' ? '内製' : '外注'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{r.role}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums font-medium">¥{(r.unitPrice / 10000).toFixed(0)}万</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`font-semibold tabular-nums ${rate >= 80 ? 'text-red-600' : rate < 50 ? 'text-blue-600' : 'text-gray-700'}`}>
                        {rate}%
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${r.avgSpeedRate > 100 ? 'text-gray-500' : 'text-gray-700'}`}>{r.avgSpeedRate}%</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-gray-700">{r.qualityScore.toFixed(1)}</td>
                    <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${r.onTimeRate < 80 ? 'text-red-600' : 'text-gray-700'}`}>{r.onTimeRate}%</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 tabular-nums">{r.totalProjects}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showEightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg border border-gray-200 w-full max-w-sm mx-4">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Eightから外注先を追加</h3>
              <p className="text-xs text-gray-500 mt-0.5">名刺データから外注先候補を選択してください</p>
            </div>
            <div className="p-4 space-y-2">
              {EIGHT_OUTSOURCE_CANDIDATES.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedCandidate(selectedCandidate === i ? null : i)}
                  className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${selectedCandidate === i ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.contact}・{c.role}</p>
                    </div>
                    {selectedCandidate === i && (
                      <svg className="w-4 h-4 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.skills.map((s) => (
                      <span key={s} className="text-xs text-gray-600 bg-gray-100 rounded px-1.5 py-0.5">{s}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => { setShowEightModal(false); setSelectedCandidate(null); }}
                className="flex-1 py-2.5 border border-gray-200 rounded text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                disabled={selectedCandidate === null}
                onClick={() => { setShowEightModal(false); setSelectedCandidate(null); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                リソースに追加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
