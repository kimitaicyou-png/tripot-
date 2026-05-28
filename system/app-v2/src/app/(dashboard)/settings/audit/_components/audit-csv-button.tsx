'use client';

import { Download } from 'lucide-react';
// 日付は format.ts の正本に統一（JST 固定）。自前の getHours() 実装は
// サーバー TZ（Vercel=UTC）依存で CSV の時刻が UTC になる不具合があったため寄せた。
import { formatDateTime } from '@/lib/format';

type AuditRow = {
  id: string;
  occurred_at: string | Date;
  member_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
};

function escapeCsv(value: string | null | undefined): string {
  const s = value ?? '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function AuditCsvButton({ rows }: { rows: AuditRow[] }) {
  function handleDownload() {
    const header = ['日時', '実行者', 'アクション', 'リソース種別', 'リソースID'];
    const lines = rows.map((r) =>
      [
        escapeCsv(formatDateTime(r.occurred_at)),
        escapeCsv(r.member_name),
        escapeCsv(r.action),
        escapeCsv(r.resource_type),
        escapeCsv(r.resource_id),
      ].join(',')
    );
    const csv = '﻿' + [header.join(','), ...lines].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rows.length === 0) return null;

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-900 transition-colors active:scale-[0.98]"
    >
      <Download className="w-3.5 h-3.5" />
      CSV 出力
    </button>
  );
}
