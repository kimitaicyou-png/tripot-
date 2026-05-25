'use client';

import { useTransition } from 'react';
import { Send, Check, X, Undo2, Mail } from 'lucide-react';
import { updateEstimateStatus, deleteEstimate } from '@/lib/actions/estimates';
import { Button } from '@/components/ui/form';
import { toast } from '@/components/ui/toaster';
import { formatYen } from '@/lib/format';

export function EstimateStatusActions({
  estimateId,
  dealId,
  currentStatus,
  dealTitle,
  customerName,
  totalAmount,
  estimateVersion,
}: {
  estimateId: string;
  dealId: string;
  currentStatus: 'draft' | 'sent' | 'accepted' | 'declined';
  /** F（隊長明示 2026-05-26 03:14）：mailto: で件名・本文 prefill 用 */
  dealTitle?: string;
  customerName?: string | null;
  totalAmount?: number | null;
  estimateVersion?: number;
}) {
  const [pending, startTransition] = useTransition();

  /**
   * F：mailto: で隊長の既定メーラー起動、見積送付テンプレを prefill
   * - 件名：「[見積書 v○] 案件名 / ¥金額」
   * - 本文：丁寧な敬語テンプレ、顧客名・案件名・金額・追記欄
   * - 注：LINE 送信は LINE Notify API or 個人 LINE 連携で別途調査要（今回は mailto: のみ）
   */
  function openMailDraft() {
    const yen = totalAmount ? formatYen(totalAmount) : '（金額未定）';
    const customer = customerName ?? 'ご担当者';
    const title = dealTitle ?? '案件';
    const version = estimateVersion ? `v${estimateVersion}` : '最新版';

    const subject = `【見積書 ${version}】${title} / ${yen}`;
    const body = [
      `${customer} 様`,
      '',
      'いつもお世話になっております。',
      `先日ご相談いただきました「${title}」につきまして、お見積書を作成いたしました。`,
      '',
      `見積金額：${yen}（${version}）`,
      '',
      'ご確認のほど、よろしくお願いいたします。',
      'ご不明な点がございましたらお気軽にお知らせください。',
      '',
      '----',
      'tripot v2 から作成',
    ].join('\n');

    const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(href, '_self');
  }

  function transition(next: 'sent' | 'accepted' | 'declined' | 'draft') {
    startTransition(async () => {
      try {
        await updateEstimateStatus(estimateId, dealId, next);
        const label =
          next === 'sent' ? '送付済' : next === 'accepted' ? '受諾' : next === 'declined' ? '辞退' : '下書き';
        toast.success(`${label}に更新`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '更新失敗';
        toast.error('更新失敗', { description: msg });
      }
    });
  }

  function handleDelete() {
    if (!confirm('この見積を削除しますか？')) return;
    startTransition(async () => {
      try {
        await deleteEstimate(estimateId, dealId);
        toast.success('削除しました');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '削除失敗';
        toast.error('削除失敗', { description: msg });
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {currentStatus === 'draft' && (
        <>
          {/* F：mailto: でメール下書きを開く（隊長明示 2026-05-26 03:14） */}
          <Button type="button" variant="secondary" size="sm" onClick={openMailDraft}>
            <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" />メールで送る</span>
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => transition('sent')} disabled={pending}>
            <span className="inline-flex items-center gap-1"><Send className="w-3.5 h-3.5" />送付した</span>
          </Button>
        </>
      )}
      {currentStatus === 'sent' && (
        <>
          <Button type="button" variant="primary" size="sm" onClick={() => transition('accepted')} disabled={pending}>
            <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />受諾された</span>
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => transition('declined')} disabled={pending}>
            <span className="inline-flex items-center gap-1"><X className="w-3.5 h-3.5" />辞退された</span>
          </Button>
        </>
      )}
      {(currentStatus === 'accepted' || currentStatus === 'declined') && (
        <Button type="button" variant="ghost" size="sm" onClick={() => transition('draft')} disabled={pending}>
          <span className="inline-flex items-center gap-1"><Undo2 className="w-3.5 h-3.5" />下書きに戻す</span>
        </Button>
      )}
      <Button type="button" variant="danger" size="sm" onClick={handleDelete} disabled={pending}>
        削除
      </Button>
    </div>
  );
}
