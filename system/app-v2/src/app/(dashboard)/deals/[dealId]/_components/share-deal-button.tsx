'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, ClipboardCopy, Mail, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/components/ui/toaster';

/**
 * 案件共有ボタン（石田 QA 委任向け、隊長明示 2026-05-27 11:38「人に送れるように」）
 *
 * 案件詳細ヘッダーに置く小さい「送る」ボタン。
 * クリックで小さい popover が開いて 2 つのアクション：
 *  - URL コピー（社内チャット貼付用）
 *  - メールで送る（mailto: で既定メーラー起動、件名+本文プリフィル）
 *
 * URL は client 側で window.location.href から生成。
 * server 側で URL を組まないので、本番/preview/local どこでも正しい絶対 URL になる。
 */
type Props = {
  dealTitle: string;
  customerName: string | null;
  stage: string;
};

const STAGE_LABEL_JA: Record<string, string> = {
  prospect: '見込み',
  proposing: '提案中',
  ordered: '受注',
  in_production: '制作中',
  delivered: '納品済',
  acceptance: '検収',
  invoiced: '請求済',
  paid: '入金済',
  lost: '失注',
};

export function ShareDealButton({ dealTitle, customerName, stage }: Props) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape で閉じる
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  function getCurrentUrl(): string {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }

  async function handleCopy() {
    const url = getCurrentUrl();
    try {
      await navigator.clipboard.writeText(url);
      toast.success('URL をコピーしました', { description: '社内チャットに貼って共有してください' });
      setOpen(false);
    } catch {
      toast.error('コピーに失敗', { description: 'ブラウザの権限を確認してください' });
    }
  }

  function handleMailto() {
    const url = getCurrentUrl();
    const stageLabel = STAGE_LABEL_JA[stage] ?? stage;
    const subject = `【案件確認のお願い】${dealTitle}`;
    const bodyLines = [
      'お疲れさまです。',
      '',
      '以下の案件を tripot で確認お願いします。',
      '',
      `■ 案件: ${dealTitle}`,
      customerName ? `■ 顧客: ${customerName}` : null,
      `■ ステージ: ${stageLabel}`,
      '',
      '■ URL',
      url,
      '',
      '※ tripot にログイン（Google アカウント）必要です。',
      'よろしくお願いします。',
    ].filter(Boolean);
    const body = bodyLines.join('\n');
    const params = new URLSearchParams({ subject, body });
    window.location.href = `mailto:?${params.toString()}`;
    setOpen(false);
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] transition-all"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="案件を共有"
      >
        <Send className="w-3.5 h-3.5" />
        送る
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden z-50"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">共有方法を選ぶ</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleCopy}
            className="w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition-all flex items-start gap-2.5"
          >
            <ClipboardCopy className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" />
            <span className="flex-1">
              <span className="block font-medium">URL をコピー</span>
              <span className="block text-xs text-gray-500 mt-0.5">Slack / LINE に貼る</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleMailto}
            className="w-full px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50 active:scale-[0.99] transition-all flex items-start gap-2.5 border-t border-gray-100"
          >
            <Mail className="w-4 h-4 mt-0.5 shrink-0 text-gray-600" />
            <span className="flex-1">
              <span className="block font-medium">メールで送る</span>
              <span className="block text-xs text-gray-500 mt-0.5">件名・本文プリフィル</span>
            </span>
          </button>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[11px] text-gray-500 flex items-start gap-1">
              <LinkIcon className="w-3 h-3 mt-0.5 shrink-0" />
              <span>受信者は tripot ログイン（Google）が必要</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
