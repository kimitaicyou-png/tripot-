'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';
import { parseCsv, findColumn, type CsvRow } from '@/lib/csv-parser';
import { bulkCreateDeals, type BulkCreateDealsResult } from '@/lib/actions/deals';

const TEMPLATE_CSV = `title,customer_name,assignee_email,stage,amount,expected_close_date
ECサイト構築 PoC,株式会社サンプル商事,sample@example.com,proposing,3000000,2026-06-30
業務システム刷新,株式会社テックサンプル,,ordered,8000000,2026-08-31
`;

const VALID_STAGES = [
  'prospect',
  'proposing',
  'ordered',
  'in_production',
  'delivered',
  'acceptance',
  'invoiced',
  'paid',
  'lost',
];

type PreviewRow = {
  rowNumber: number;
  title: string;
  customer_name: string;
  assignee_email: string;
  stage: string;
  amount: number;
  expected_close_date: string;
  valid: boolean;
  errorMessage?: string;
};

function downloadTemplate() {
  const blob = new Blob(['﻿' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'deals-template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function DealsImportPage() {
  const router = useRouter();
  const [csvText, setCsvText] = useState('');
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BulkCreateDealsResult | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      setCsvText(text);
      handleParse(text);
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleParse(textOverride?: string) {
    const text = textOverride ?? csvText;
    const { headers, rows, errors } = parseCsv(text);
    setParseErrors(errors);

    if (rows.length === 0) {
      setPreview([]);
      return;
    }

    const titleCol = findColumn(headers, ['title', '案件名', 'タイトル']);
    const customerCol = findColumn(headers, ['customer_name', '顧客名', '会社名']);
    const assigneeCol = findColumn(headers, ['assignee_email', '担当者メール', '担当者']);
    const stageCol = findColumn(headers, ['stage', 'ステージ', '状態']);
    const amountCol = findColumn(headers, ['amount', '金額', '受注金額']);
    const closeDateCol = findColumn(headers, ['expected_close_date', '受注予定', '受注予定日']);

    if (!titleCol) {
      setParseErrors([`必須列 "title" (または "案件名" / "タイトル") が見つかりません。検出された列: ${headers.join(', ')}`]);
      setPreview([]);
      return;
    }

    const previewRows: PreviewRow[] = rows.map((row: CsvRow, idx) => {
      const title = row[titleCol]?.trim() ?? '';
      const customer_name = customerCol ? row[customerCol]?.trim() ?? '' : '';
      const assignee_email = assigneeCol ? row[assigneeCol]?.trim() ?? '' : '';
      const stageRaw = stageCol ? row[stageCol]?.trim().toLowerCase() ?? 'prospect' : 'prospect';
      const stage = VALID_STAGES.includes(stageRaw) ? stageRaw : 'prospect';
      const amountRaw = amountCol ? row[amountCol]?.trim() ?? '0' : '0';
      const amount = parseInt(amountRaw.replace(/[¥,]/g, '') || '0', 10) || 0;
      const expected_close_date = closeDateCol ? row[closeDateCol]?.trim() ?? '' : '';

      let valid = true;
      let errorMessage: string | undefined;

      if (!title) {
        valid = false;
        errorMessage = 'title が空';
      } else if (stageRaw && !VALID_STAGES.includes(stageRaw)) {
        valid = false;
        errorMessage = `stage "${stageRaw}" 不正（有効: ${VALID_STAGES.join(', ')}）`;
      } else if (
        expected_close_date &&
        !/^\d{4}-\d{2}-\d{2}$/.test(expected_close_date)
      ) {
        valid = false;
        errorMessage = `expected_close_date YYYY-MM-DD 形式: ${expected_close_date}`;
      }

      return {
        rowNumber: idx + 2,
        title,
        customer_name,
        assignee_email,
        stage,
        amount,
        expected_close_date,
        valid,
        errorMessage,
      };
    });

    setPreview(previewRows);
  }

  async function handleSubmit() {
    if (submitting || preview.length === 0) return;
    setSubmitting(true);
    try {
      const validRows = preview
        .filter((p) => p.valid)
        .map((p) => ({
          title: p.title,
          customer_name: p.customer_name || null,
          assignee_email: p.assignee_email || null,
          stage: p.stage as
            | 'prospect'
            | 'proposing'
            | 'ordered'
            | 'in_production'
            | 'delivered'
            | 'acceptance'
            | 'invoiced'
            | 'paid'
            | 'lost',
          amount: p.amount,
          expected_close_date: p.expected_close_date || null,
        }));

      const r = await bulkCreateDeals(validRows);
      setResult(r);

      if (r.inserted > 0) {
        toast.success(`${r.inserted}件の案件を登録しました`, {
          description: r.errors.length > 0 ? `エラー ${r.errors.length}件あり` : '全件成功',
        });
        if (r.errors.length === 0) {
          setTimeout(() => router.push('/deals'), 1500);
        }
      } else {
        toast.error('登録できませんでした', {
          description: `エラー ${r.errors.length}件、有効データ 0件`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('登録失敗', { description: msg });
    } finally {
      setSubmitting(false);
    }
  }

  const validCount = preview.filter((p) => p.valid).length;
  const invalidCount = preview.length - validCount;

  return (
    <main className="min-h-screen bg-gray-50">
      <PageHeader
        eyebrow="DEALS / IMPORT"
        title="案件 CSV 取込"
        subtitle="既存の進行中案件を CSV で一括登録できます"
        actions={
          <Link
            href="/deals"
            className="inline-flex items-center gap-1 px-4 py-2 text-sm border border-gray-200 rounded text-gray-700 hover:text-gray-900 hover:border-gray-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            案件一覧
          </Link>
        }
      />

      <div className="px-6 py-10 max-w-5xl mx-auto space-y-8">
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <p className="text-xs uppercase tracking-widest text-gray-500">CSV フォーマット</p>
          </div>
          <div className="text-sm text-gray-700 space-y-1">
            <p>
              必須列：<span className="font-mono text-gray-900">title</span>（案件名）
            </p>
            <p>
              任意列：<span className="font-mono text-gray-900">customer_name</span>（顧客マスタの正確な名前）
              / <span className="font-mono">assignee_email</span>（メンバーのメール）
              / <span className="font-mono">stage</span>（{VALID_STAGES.join(' | ')}）
              / <span className="font-mono">amount</span>（円整数）
              / <span className="font-mono">expected_close_date</span>（YYYY-MM-DD）
            </p>
          </div>
          <p className="text-xs text-gray-500">
            customer_name は顧客マスタに事前登録が必要（先に顧客 CSV 取込を実行）。assignee_email も同様にメンバー登録済が必要
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
            <span className="inline-flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              テンプレ CSV をダウンロード
            </span>
          </Button>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-gray-500" />
              <p className="text-xs uppercase tracking-widest text-gray-500">CSV を読み込む</p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="text-sm"
              disabled={submitting}
            />
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            onBlur={() => handleParse()}
            placeholder="ファイル選択 or ここに CSV テキストを貼り付け"
            className="w-full h-40 border border-gray-200 rounded-lg p-3 text-sm font-mono text-gray-900 focus:outline-none focus:border-gray-900"
            disabled={submitting}
          />

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleParse()} disabled={submitting}>
              プレビュー解析
            </Button>
            {parseErrors.length > 0 && (
              <span className="text-xs text-red-700">⚠ {parseErrors.length} 件のパース問題</span>
            )}
          </div>

          {parseErrors.length > 0 && (
            <ul className="text-xs text-red-700 space-y-1 ml-4">
              {parseErrors.slice(0, 5).map((e, idx) => (
                <li key={idx}>· {e}</li>
              ))}
            </ul>
          )}
        </section>

        {preview.length > 0 && (
          <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs uppercase tracking-widest text-gray-500">プレビュー</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-mono tabular-nums text-blue-700 font-semibold">
                  有効 {validCount}件
                </span>
                {invalidCount > 0 && (
                  <span className="font-mono tabular-nums text-red-700 font-semibold">
                    エラー {invalidCount}件
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs">行</th>
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs">title</th>
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs">顧客</th>
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs">stage</th>
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs text-right">金額</th>
                    <th className="py-2 pr-3 font-medium text-gray-500 text-xs">予定日</th>
                    <th className="py-2 font-medium text-gray-500 text-xs">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((p) => (
                    <tr key={p.rowNumber} className="border-b border-gray-100">
                      <td className="py-2 pr-3 text-xs text-gray-500 font-mono">{p.rowNumber}</td>
                      <td className="py-2 pr-3 text-gray-900 truncate max-w-[200px]">{p.title}</td>
                      <td className="py-2 pr-3 text-gray-700 text-xs">{p.customer_name || '—'}</td>
                      <td className="py-2 pr-3 text-gray-700 font-mono text-xs">{p.stage}</td>
                      <td className="py-2 pr-3 text-gray-900 font-mono text-xs tabular-nums text-right">
                        {p.amount > 0 ? `¥${p.amount.toLocaleString('ja-JP')}` : '—'}
                      </td>
                      <td className="py-2 pr-3 text-gray-700 font-mono text-xs">{p.expected_close_date || '—'}</td>
                      <td className="py-2">
                        {p.valid ? (
                          <span className="inline-flex items-center gap-1 text-blue-700 text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-700 text-xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            {p.errorMessage}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="text-xs text-gray-500 mt-2">
                  ... 他 {preview.length - 50}件（最初の 50 行のみ表示、登録時は全件処理）
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                登録すると有効行 {validCount}件 が案件マスタに追加されます。customer_name / assignee_email が解決できない行はサーバー側でスキップ
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || validCount === 0}
              >
                {submitting ? '登録中…' : `${validCount}件 登録`}
              </Button>
            </div>
          </section>
        )}

        {result && (
          <section
            className={`border rounded-xl p-6 ${
              result.errors.length === 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">登録結果</p>
            <p className="font-semibold text-2xl text-gray-900 tabular-nums">
              {result.inserted} 件登録
              {result.skipped > 0 && (
                <span className="text-base font-normal text-gray-500 ml-3">/ {result.skipped} 件スキップ</span>
              )}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-3 text-xs text-red-700 space-y-1">
                {result.errors.slice(0, 10).map((e, idx) => (
                  <li key={idx}>· 行 {e.row}: {e.message}</li>
                ))}
                {result.errors.length > 10 && (
                  <li className="text-gray-500">...他 {result.errors.length - 10}件</li>
                )}
              </ul>
            )}
            {result.errors.length === 0 && (
              <Link href="/deals" className="inline-block mt-3 text-sm text-blue-700 hover:text-blue-900">
                案件一覧に戻る →
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
