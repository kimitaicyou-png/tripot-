'use client';

import { useState } from 'react';

type MigrateResult = { total: number; success: number; errors: string[] };

async function migrateCollection(
  lsKeys: string[],
  apiUrl: string,
  label: string,
): Promise<MigrateResult> {
  const items = new Map<string, Record<string, unknown>>();
  for (const key of lsKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed) ? parsed : Object.values(parsed);
      for (const item of arr) {
        if (item && typeof item === 'object' && (item as Record<string, unknown>).id) {
          items.set((item as Record<string, unknown>).id as string, item as Record<string, unknown>);
        }
      }
    } catch {}
  }

  const result: MigrateResult = { total: items.size, success: 0, errors: [] };

  for (const [id, item] of items) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (res.ok) {
        result.success++;
      } else {
        const data = await res.json();
        if (data.skipped) {
          result.success++;
        } else {
          result.errors.push(`${label} ${(item as Record<string, unknown>).dealName ?? (item as Record<string, unknown>).name ?? id}: ${data.error ?? res.statusText}`);
        }
      }
    } catch {
      result.errors.push(`${label} ${id}: ネットワークエラー`);
    }
  }

  return result;
}

export default function MigratePage() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [totals, setTotals] = useState({ total: 0, success: 0, errors: 0 });

  const addLog = (msg: string) => setLog((prev) => [...prev, msg]);

  const handleMigrate = async () => {
    setStatus('running');
    let totalAll = 0;
    let successAll = 0;
    let errorsAll = 0;

    addLog('案件データを移行中...');
    const deals = await migrateCollection(
      ['tripot_deals_all', 'coaris_attack_to_deals'],
      '/api/deals',
      '案件',
    );
    totalAll += deals.total;
    successAll += deals.success;
    errorsAll += deals.errors.length;
    addLog(`案件: ${deals.success}/${deals.total} 件完了${deals.errors.length > 0 ? `（${deals.errors.length}件エラー）` : ''}`);

    addLog('制作カードを移行中...');
    const cards = await migrateCollection(
      ['tripot_production_cards'],
      '/api/production',
      '制作カード',
    );
    totalAll += cards.total;
    successAll += cards.success;
    errorsAll += cards.errors.length;
    addLog(`制作カード: ${cards.success}/${cards.total} 件完了${cards.errors.length > 0 ? `（${cards.errors.length}件エラー）` : ''}`);

    addLog('顧客データを移行中...');
    const customers = await migrateCustomers();
    totalAll += customers.total;
    successAll += customers.success;
    errorsAll += customers.errors.length;
    addLog(`顧客: ${customers.success}/${customers.total} 件完了`);

    addLog('打合せ記録を移行中...');
    const meetings = await migrateMeetings();
    totalAll += meetings.total;
    successAll += meetings.success;
    addLog(`打合せ: ${meetings.success}/${meetings.total} 件完了`);

    const allErrors = [...deals.errors, ...cards.errors, ...customers.errors, ...meetings.errors];
    if (allErrors.length > 0) {
      allErrors.forEach((e) => addLog(`エラー: ${e}`));
    }

    addLog(`移行完了！ ${successAll}/${totalAll} 件`);
    setTotals({ total: totalAll, success: successAll, errors: errorsAll });
    setStatus('done');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-xl font-semibold text-gray-900 mb-2">データ移行</h1>
      <p className="text-sm text-gray-600 mb-6">
        ブラウザに保存されているデータ（案件・制作カード・顧客・打合せ記録）をデータベースに移行します。
        <br />何度実行しても安全です（重複はスキップ）。
      </p>

      {status === 'idle' && (
        <button
          onClick={handleMigrate}
          className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
        >
          移行を開始する
        </button>
      )}

      {log.length > 0 && (
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1 max-h-80 overflow-y-auto">
          {log.map((l, i) => (
            <p key={i} className={`text-xs font-mono ${l.startsWith('エラー') ? 'text-red-600' : l.includes('完了') ? 'text-emerald-700 font-semibold' : 'text-gray-700'}`}>
              {l}
            </p>
          ))}
          {status === 'running' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-gray-500">処理中...</span>
            </div>
          )}
        </div>
      )}

      {status === 'done' && (
        <div className="mt-4 space-y-3">
          <div className={`p-4 rounded-xl border ${totals.errors === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className="text-sm font-semibold text-gray-900">{totals.success}/{totals.total} 件をデータベースに保存しました</p>
          </div>
          <a href="/home/toki" className="block w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl text-center hover:bg-blue-700 active:scale-[0.98] transition-all">
            ダッシュボードへ
          </a>
        </div>
      )}
    </div>
  );
}

async function migrateCustomers(): Promise<MigrateResult> {
  const result: MigrateResult = { total: 0, success: 0, errors: [] };
  try {
    const raw = localStorage.getItem('coaris_customers');
    if (!raw) return result;
    const customers = JSON.parse(raw) as Array<Record<string, unknown>>;
    result.total = customers.length;
    for (const c of customers) {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(c),
        });
        if (res.ok || (await res.json()).skipped) result.success++;
        else result.errors.push(`顧客 ${c.companyName ?? c.id}: 保存失敗`);
      } catch { result.errors.push(`顧客 ${c.companyName ?? c.id}: ネットワークエラー`); }
    }
  } catch {}
  return result;
}

async function migrateMeetings(): Promise<MigrateResult> {
  const result: MigrateResult = { total: 0, success: 0, errors: [] };
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('coaris_meetings_') || k.startsWith('coaris_minutes_'));
  for (const key of keys) {
    try {
      const dealId = key.replace('coaris_meetings_', '').replace('coaris_minutes_', '');
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const items = JSON.parse(raw);
      const arr = Array.isArray(items) ? items : [];
      for (const item of arr) {
        result.total++;
        try {
          const meeting = typeof item === 'string'
            ? { id: `m_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, deal_id: dealId, date: new Date().toISOString().slice(0,10), type: 'meeting', title: '議事録', summary: item }
            : { ...item, deal_id: item.dealId ?? dealId };
          const res = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(meeting),
          });
          if (res.ok) result.success++;
        } catch {}
      }
    } catch {}
  }
  return result;
}
