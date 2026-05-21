'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Inbox, Sparkles, Loader2, Check, X } from 'lucide-react';
import { logActionEntry } from '@/lib/actions/log-action';
import { Button, TextArea, FormField, Select } from '@/components/ui/form';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';

/**
 * メール / Slack 返信から行動ログを AI で取り込むボタン。
 *
 * goal 2/4：旧 system/app/api/production/ai/import-reply を app-v2 で復活。
 * 顧客や社内からの返信をペースト → AI が構造化 → 確認 → actions に insert。
 *
 * 動作：
 * 1. ボタンクリックで modal 開く
 * 2. 返信テキスト貼り付け + channel 選択
 * 3. 「AI 解析」→ /api/ai/import-reply → 構造化結果プレビュー
 * 4. 確認 → logActionEntry server action で actions テーブルに insert
 * 5. router.refresh で行動履歴一覧を更新
 */

type Parsed = {
  action_type: 'call' | 'meeting' | 'proposal' | 'email' | 'visit' | 'other';
  occurred_at: string;
  note: string;
  sender_name: string;
  is_from_customer: boolean;
  suggested_next_action?: string;
  extracted_needs: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  call: '電話',
  meeting: '商談',
  proposal: '提案',
  email: 'メール',
  visit: '訪問',
  other: 'その他',
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: 'ポジティブ',
  neutral: 'ニュートラル',
  negative: 'ネガティブ',
};

const SENTIMENT_TONE: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-gray-50 text-gray-700 border-gray-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
};

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'メール' },
  { value: 'slack', label: 'Slack' },
  { value: 'chat', label: 'チャット' },
  { value: 'other', label: 'その他' },
];

export function ImportReplyButton({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [channel, setChannel] = useState('email');
  const [running, setRunning] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setReplyText('');
    setChannel('email');
    setParsed(null);
  }

  async function handleAnalyze() {
    if (running || replyText.trim().length < 5) return;
    setRunning(true);
    try {
      const res = await fetch('/api/ai/import-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText,
          channel,
          deal_id: dealId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        const msg =
          json?.error === 'ai_error'
            ? `AI エラー: ${json.message ?? '通信失敗'}`
            : json?.message ?? `エラー: HTTP ${res.status}`;
        toast.error('解析に失敗', { description: msg });
        return;
      }
      setParsed(json as Parsed);
      toast.success('返信を解析しました', {
        description: `${ACTION_TYPE_LABEL[json.action_type]} / ${(json as Parsed).extracted_needs.length} 件のニーズ抽出`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('解析に失敗', { description: msg });
    } finally {
      setRunning(false);
    }
  }

  async function handleSave() {
    if (!parsed || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set('type', parsed.action_type);
      fd.set('note', parsed.note);
      fd.set('deal_id', dealId);
      const result = await logActionEntry({}, fd);
      if (result.errors) {
        const msg = Object.values(result.errors).flat().join(' / ');
        toast.error('行動ログ追加に失敗', { description: msg });
        return;
      }
      toast.success('行動ログに追加しました', {
        description: `${ACTION_TYPE_LABEL[parsed.action_type]} — ${parsed.note.slice(0, 40)}…`,
      });
      reset();
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (err) {
      const msg = err instanceof Error ? err.message : '通信失敗';
      toast.error('行動ログ追加に失敗', { description: msg });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <span className="inline-flex items-center gap-1">
          <Inbox className="w-3.5 h-3.5" />
          返信から取り込み
        </span>
      </Button>

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        size="xl"
      >
        <DialogHeader
          title="メール / Slack 返信から行動ログを取り込み"
          onClose={() => setOpen(false)}
        />
        <DialogBody className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <FormField label="チャネル">
              <Select
                name="channel"
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                options={CHANNEL_OPTIONS}
              />
            </FormField>
          </div>

          <FormField
            label="返信本文"
            hint="顧客 or 社内からの返信をそのままペースト。AI が要約・送信者・ニーズ・次のアクションを抽出します"
          >
            <TextArea
              name="reply_text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={10}
              placeholder="例) お世話になっております。先日いただいた見積、社内で検討した結果、6月初旬の決裁会議にかけることになりました。価格は予算内ですが..."
            />
          </FormField>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={running || replyText.trim().length < 5}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  解析中…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  AI で解析
                </>
              )}
            </button>
          </div>

          {parsed && (
            <div className="border border-gray-200 rounded-xl p-5 space-y-4 bg-gray-50">
              <p className="text-xs uppercase tracking-widest text-gray-500">解析結果</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">種別</p>
                  <p className="font-medium text-gray-900">
                    {ACTION_TYPE_LABEL[parsed.action_type] ?? parsed.action_type}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">日付</p>
                  <p className="font-mono tabular-nums text-gray-900">{parsed.occurred_at}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">送信者</p>
                  <p className="text-gray-900 truncate">{parsed.sender_name || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">方向</p>
                  <p className="text-gray-900">{parsed.is_from_customer ? '顧客 → 自社' : '自社 → 顧客'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">要約（actions.note に登録）</p>
                <p className="text-sm text-gray-900 leading-relaxed bg-white border border-gray-200 rounded-lg p-3">
                  {parsed.note}
                </p>
              </div>

              {parsed.suggested_next_action && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-emerald-800 mb-1">
                    次にやること
                  </p>
                  <p className="text-sm text-emerald-900">{parsed.suggested_next_action}</p>
                </div>
              )}

              {parsed.extracted_needs.length > 0 && (
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1.5">
                    抽出された顧客ニーズ ({parsed.extracted_needs.length})
                  </p>
                  <ul className="space-y-1">
                    {parsed.extracted_needs.map((n, i) => (
                      <li key={i} className="text-sm text-gray-900">
                        ・{n}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-1.5">
                    ※ニーズは現状 actions には保存されません。議事録を作って summarize-meeting すると needs に蓄積されます
                  </p>
                </div>
              )}

              {parsed.sentiment && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">トーン：</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-lg border ${SENTIMENT_TONE[parsed.sentiment]}`}
                  >
                    {SENTIMENT_LABEL[parsed.sentiment]}
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            <span className="inline-flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              キャンセル
            </span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!parsed || saving}
          >
            <span className="inline-flex items-center gap-1">
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  保存中…
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  この内容で行動ログに追加
                </>
              )}
            </span>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
