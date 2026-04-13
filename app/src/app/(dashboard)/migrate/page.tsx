'use client';

import { useState } from 'react';

type MigrateResult = { total: number; success: number; errors: string[] };

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [result, setResult] = useState<MigrateResult | null>(null);

  const handleMigrate = async () => {
    setStatus('running');
    const errors: string[] = [];
    let total = 0;
    let success = 0;

    const keys = ['tripot_deals_all', 'coaris_attack_to_deals', 'coaris_deals_override'];
    const allDeals = new Map<string, Record<string, unknown>>();

    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
        for (const deal of arr) {
          if (deal && typeof deal === 'object' && deal.id) {
            allDeals.set(deal.id as string, deal as Record<string, unknown>);
          }
        }
      } catch {}
    }

    total = allDeals.size;
    setResult({ total, success: 0, errors: [] });

    for (const [id, deal] of allDeals) {
      try {
        const res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deal),
        });
        if (res.ok) {
          success++;
        } else {
          const data = await res.json();
          if (data.error?.includes('duplicate') || res.status === 409) {
            success++;
          } else {
            errors.push(`${(deal as Record<string, unknown>).dealName ?? id}: ${data.error ?? res.statusText}`);
          }
        }
      } catch (e) {
        errors.push(`${(deal as Record<string, unknown>).dealName ?? id}: ネットワークエラー`);
      }
      setResult({ total, success, errors: [...errors] });
    }

    setStatus('done');
    setResult({ total, success, errors });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">データ移行</h1>
      <p className="text-sm text-gray-600 mb-6">
        ブラウザに保存されている案件データをサーバー（データベース）に移行します。
        <br />この操作は何度実行しても安全です。
      </p>

      {status === 'idle' && (
        <button
          onClick={handleMigrate}
          className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          移行を開始する
        </button>
      )}

      {status === 'running' && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-semibold text-gray-700">移行中... {result.success}/{result.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${result.total > 0 ? (result.success / result.total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div className="space-y-4">
          <div className={`p-4 rounded-xl border ${result.errors.length === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className="text-sm font-semibold text-gray-900">
              {result.errors.length === 0 ? '移行完了！' : '移行完了（一部エラーあり）'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {result.success}/{result.total} 件の案件をデータベースに保存しました
            </p>
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-700 mb-2">エラー一覧:</p>
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
          <a href="/home/toki" className="block w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl text-center hover:bg-blue-700 active:scale-[0.98] transition-all">
            ダッシュボードへ
          </a>
        </div>
      )}
    </div>
  );
}
