'use client';

import { Download } from 'lucide-react';

type AuditRow = {
  id: string;
  occurred_at: string | Date;
  member_name: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
};

function formatDatetime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd} ${hh}:${min}`;
}

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
        escapeCsv(formatDatetime(r.occurred_at)),
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
