export type CsvRow = Record<string, string>;

export type CsvParseResult = {
  headers: string[];
  rows: CsvRow[];
  errors: string[];
};

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuote = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuote = false;
        i += 1;
        continue;
      }
      current += ch;
      i += 1;
      continue;
    }

    if (ch === '"' && current === '') {
      inQuote = true;
      i += 1;
      continue;
    }

    if (ch === ',') {
      fields.push(current);
      current = '';
      i += 1;
      continue;
    }

    current += ch;
    i += 1;
  }

  fields.push(current);
  return fields;
}

export function parseCsv(text: string): CsvParseResult {
  const errors: string[] = [];
  const trimmed = text.replace(/^﻿/, '').trim();

  if (!trimmed) {
    return { headers: [], rows: [], errors: ['CSVが空です'] };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length < 2) {
    return {
      headers: [],
      rows: [],
      errors: ['ヘッダ行 + データ行 1行以上が必要です'],
    };
  }

  const headers = parseLine(lines[0]).map((h) => h.trim());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseLine(lines[i]);
    if (fields.length !== headers.length) {
      errors.push(
        `行 ${i + 1}: フィールド数が ${fields.length} (ヘッダは ${headers.length})`
      );
      continue;
    }

    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = fields[idx]?.trim() ?? '';
    });
    rows.push(row);
  }

  return { headers, rows, errors };
}

export function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s_-]/g, '');
}

export function findColumn(headers: string[], candidates: string[]): string | null {
  const normalized = headers.map(normalizeHeader);
  for (const cand of candidates) {
    const target = normalizeHeader(cand);
    const idx = normalized.indexOf(target);
    if (idx >= 0) return headers[idx];
  }
  return null;
}
