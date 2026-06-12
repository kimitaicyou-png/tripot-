/**
 * 今週の入金 / 受注 / 新規パイプライン カード（3 枚）
 *
 * 隊長思想「行動 → 週次 → 月次 → PL/CF」の週次レイヤー強化。
 * 既存の「会社全体の入金確定累計」は累計、こちらは今週分だけ切り出す。
 *
 * - 今週入金：paid_at が直近 7 日
 * - 今週受注：ordered_at が直近 7 日
 * - 今週新規パイプライン：created_at が直近 7 日（ロスト除く）
 */

import { formatYen, formatMan } from '@/lib/format';

type CardProps = {
  label: string;
  amount: number;
  count: number;
  tone: 'paid' | 'ordered' | 'pipeline';
  hint?: string;
};

const TONE_BORDER: Record<CardProps['tone'], string> = {
  paid: 'border-emerald-200',
  ordered: 'border-amber-200',
  pipeline: 'border-blue-200',
};

const TONE_LABEL: Record<CardProps['tone'], string> = {
  paid: 'text-emerald-700',
  ordered: 'text-amber-700',
  pipeline: 'text-blue-700',
};

function WeekCard({ label, amount, count, tone, hint }: CardProps) {
  return (
    <section className={`bg-white border ${TONE_BORDER[tone]} rounded-xl p-5 shadow-sm`}>
      <p className={`text-xs uppercase tracking-widest ${TONE_LABEL[tone]} truncate`}>{label}</p>
      <p className="font-mono tabular-nums text-3xl text-gray-900 mt-1.5 truncate">
        {formatMan(amount)}
      </p>
      <p className="text-xs text-gray-600 mt-1">
        <span className="font-mono tabular-nums">{count}</span> 件{' '}
        <span className="text-gray-500">／ {formatYen(amount)}</span>
      </p>
      {hint && <p className="text-[10px] text-gray-500 mt-2">{hint}</p>}
    </section>
  );
}

export function WeeklyRevenueCards({
  paidAmount,
  paidCount,
  orderedAmount,
  orderedCount,
  newPipelineAmount,
  newPipelineCount,
}: {
  paidAmount: number;
  paidCount: number;
  orderedAmount: number;
  orderedCount: number;
  newPipelineAmount: number;
  newPipelineCount: number;
}) {
  return (
    <section>
      <h2 className="text-sm font-medium text-gray-900 mb-3">今週の動き（直近 7 日）</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <WeekCard
          label="入金確定"
          amount={paidAmount}
          count={paidCount}
          tone="paid"
          hint="paid_at が直近 7 日の案件合計"
        />
        <WeekCard
          label="新規受注"
          amount={orderedAmount}
          count={orderedCount}
          tone="ordered"
          hint="ordered_at が直近 7 日の案件合計"
        />
        <WeekCard
          label="新規パイプライン"
          amount={newPipelineAmount}
          count={newPipelineCount}
          tone="pipeline"
          hint="今週登録された案件（受注前）"
        />
      </div>
    </section>
  );
}
