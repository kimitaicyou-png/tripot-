import { db } from '@/lib/db';
import { deals, actions, customers, tasks } from '@/db/schema';
import { eq, and, isNull, gte, sql, desc } from 'drizzle-orm';

/**
 * Tool definitions for B7.12 chat 本格版（tool use + DB query）.
 * Anthropic Messages API tools 仕様。
 *
 * 5/2 公開向け 3 tools 限定（deals / revenue / actions）。
 * 拡充は 5/2 後の P2-P3。
 */

export const CHAT_TOOLS = [
  {
    name: 'query_deals_summary',
    description:
      '案件のステージ別集計（件数・合計金額）を返す。「案件状況」「進行中」「失注」等の質問に使用。',
    input_schema: {
      type: 'object' as const,
      properties: {
        stage: {
          type: 'string',
          enum: ['prospect', 'proposing', 'ordered', 'in_production', 'delivered', 'paid', 'lost', 'all'],
          description: 'ステージ絞り込み。指定なし or "all" で全件',
        },
      },
      required: [],
    },
  },
  {
    name: 'query_revenue',
    description:
      '入金確定済（stage=paid）案件の合計売上を返す。「今月の売上」「入金確定」等の質問に使用。',
    input_schema: {
      type: 'object' as const,
      properties: {
        period: {
          type: 'string',
          enum: ['this_month', 'last_month', 'all_time'],
          description: '期間。this_month=今月、last_month=先月、all_time=全期間',
        },
      },
      required: ['period'],
    },
  },
  {
    name: 'query_recent_actions',
    description:
      '直近の行動量（電話・商談・提案）を集計。「最近の行動」「今週何件動いた」等の質問に使用。',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          description: '過去 N 日（デフォルト 7、最大 90）',
        },
      },
      required: [],
    },
  },
];

export type ToolName = (typeof CHAT_TOOLS)[number]['name'];

export type ToolInput = Record<string, unknown>;

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

/**
 * 各 tool の DB query 実装。company_id 必須注入（マルチテナント safety）。
 */
export async function executeToolCall(
  name: string,
  input: ToolInput,
  companyId: string
): Promise<ToolResult> {
  try {
    switch (name) {
      case 'query_deals_summary': {
        const stage = (input.stage as string) ?? 'all';
        const baseWhere = and(eq(deals.company_id, companyId), isNull(deals.deleted_at));
        const whereClause =
          stage === 'all' || !stage
            ? baseWhere
            : and(baseWhere, eq(deals.stage, stage as 'prospect' | 'proposing' | 'ordered' | 'in_production' | 'delivered' | 'paid' | 'lost'));

        const result = await db
          .select({
            stage: deals.stage,
            count: sql<number>`count(*)::int`,
            total_amount: sql<number>`coalesce(sum(${deals.amount}), 0)::bigint`,
          })
          .from(deals)
          .where(whereClause)
          .groupBy(deals.stage);

        return {
          ok: true,
          data: {
            filter_stage: stage,
            results: result.map((r) => ({
              stage: r.stage,
              count: r.count,
              total_amount: Number(r.total_amount),
            })),
          },
        };
      }

      case 'query_revenue': {
        const period = (input.period as string) ?? 'this_month';
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (period === 'this_month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        } else if (period === 'last_month') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        const conditions = [
          eq(deals.company_id, companyId),
          isNull(deals.deleted_at),
          eq(deals.stage, 'paid' as const),
        ];
        if (startDate) {
          conditions.push(gte(deals.paid_at, startDate.toISOString().slice(0, 10)));
        }
        if (endDate) {
          conditions.push(sql`${deals.paid_at} < ${endDate.toISOString().slice(0, 10)}`);
        }

        const [row] = await db
          .select({
            count: sql<number>`count(*)::int`,
            total_amount: sql<number>`coalesce(sum(${deals.amount}), 0)::bigint`,
          })
          .from(deals)
          .where(and(...conditions));

        return {
          ok: true,
          data: {
            period,
            count: row?.count ?? 0,
            total_amount: Number(row?.total_amount ?? 0),
          },
        };
      }

      case 'query_recent_actions': {
        const days = Math.min((input.days as number) ?? 7, 90);
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const result = await db
          .select({
            type: actions.type,
            count: sql<number>`count(*)::int`,
          })
          .from(actions)
          .where(
            and(
              eq(actions.company_id, companyId),
              gte(actions.occurred_at, since)
            )
          )
          .groupBy(actions.type);

        return {
          ok: true,
          data: {
            since_days: days,
            since_iso: since.toISOString(),
            results: result.map((r) => ({ type: r.type, count: r.count })),
          },
        };
      }

      default:
        return { ok: false, error: `unknown tool: ${name}` };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'unknown error',
    };
  }
}
