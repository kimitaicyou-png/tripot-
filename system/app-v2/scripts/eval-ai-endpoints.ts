import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

type EvalCase = {
  id: string;
  label: string;
  jobType: string;
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodTypeAny;
};

const cases: EvalCase[] = [
  {
    id: 'risk-score',
    label: 'B7.1 失注リスクスコア',
    jobType: 'risk-score',
    systemPrompt:
      'あなたはBtoB営業のリスク評価アナリスト。0-100でリスクを数値化。出力は厳密にJSONのみ、markdown禁止。',
    userPrompt: `案件: ECサイト構築 PoC
顧客: 株式会社サンプル商事
ステージ: proposing
受注金額: ¥3,000,000
受注予定: 2026-04-15（16日超過）
案件作成からの経過: 60日
最終行動からの経過: 28日
最終議事録からの経過: 35日

リスクを 0-100 で評価し、理由3点と推奨対策2点を提示。
JSONのみ:{"score":<0-100>,"level":"low|medium|high|critical","reasons":[...],"recommended_actions":[...]}`,
    schema: z.object({
      score: z.number().int().min(0).max(100),
      level: z.enum(['low', 'medium', 'high', 'critical']),
      reasons: z.array(z.string()).min(1).max(4),
      recommended_actions: z.array(z.string()).min(1).max(3),
    }),
  },
  {
    id: 'next-action',
    label: 'O-14 次の一手',
    jobType: 'suggest-next-action',
    systemPrompt:
      'あなたは日本のBtoB営業のシニアコーチ。「次の一手」を1つだけ提案。出力は厳密にJSONのみ。',
    userPrompt: `案件: 業務システム刷新
顧客: 株式会社テックサンプル
ステージ: ordered
受注金額: ¥8,000,000
直近行動: 提案 (5日前)
未完了タスク: 詳細仕様の合意 (期限 来週金曜)

JSONのみ:{"action":"...","reason":"...","due_in_days":<0-60>,"action_type":"call|meeting|proposal|email|visit|other"}`,
    schema: z.object({
      action: z.string().min(1).max(200),
      reason: z.string().min(1).max(300),
      due_in_days: z.number().int().min(0).max(60),
      action_type: z.enum(['call', 'meeting', 'proposal', 'email', 'visit', 'other']),
    }),
  },
  {
    id: 'morning-brief',
    label: 'O-27 朝ブリーフィング',
    jobType: 'morning-brief',
    systemPrompt:
      'あなたは経営者の朝会メモ作成アシスタント。簡潔3点で。出力は厳密にJSONのみ。',
    userPrompt: `担当: 鈴木太郎
今週の進行中案件: 5件
期限切れタスク: 2件
今週の電話: 12件 / 商談: 4件 / 提案: 2件
直近の行動: 商談 (昨日), 提案 (一昨日)

今日の朝会用メモ。
JSONのみ:{"focus":"今日最優先の1点","alerts":["注意事項",...],"motivational":"一言"}`,
    schema: z.object({
      focus: z.string().min(1).max(200),
      alerts: z.array(z.string()).min(0).max(5),
      motivational: z.string().min(1).max(120),
    }),
  },
  {
    id: 'generate-email',
    label: 'O-9 メール下書き',
    jobType: 'generate-email',
    systemPrompt:
      'あなたはBtoB営業のメール作成アシスタント。日本語ビジネスメール。出力は厳密にJSONのみ。',
    userPrompt: `宛先: 山田部長 (株式会社XXX商事)
案件: ECサイト構築 PoC
状況: 提案書送付から5日経過、返信なし
目的: フォローアップ + 次回打合せ提案

JSONのみ:{"subject":"件名","body":"本文（Plain text、改行入り、200-400字）"}`,
    schema: z.object({
      subject: z.string().min(1).max(120),
      body: z.string().min(50).max(2000),
    }),
  },
  {
    id: 'summarize-meeting',
    label: 'O-8 議事録要約',
    jobType: 'generate-minutes',
    systemPrompt:
      'あなたは議事録要約アシスタント。要点を3-5個。出力は厳密にJSONのみ。',
    userPrompt: `# 商談メモ
参加: 鈴木 (営業), 田中 (顧客 / 部長)
日時: 本日 14:00-15:00

## 内容
- 田中部長から既存システムの問題点ヒアリング (在庫管理が手作業、月末の負荷大)
- 我々から PoC 提案 (3ヶ月、¥3M)
- 田中部長「予算枠は確保できそう。社内合議は来月末まで」
- 競合: A社, B社の名前あり
- 次回: 2週後、技術部門も参加

要約:JSONのみ:{"summary":"3-5文","key_points":[...3-5項目],"next_actions":[...2-4項目]}`,
    schema: z.object({
      summary: z.string().min(20).max(500),
      key_points: z.array(z.string()).min(3).max(6),
      next_actions: z.array(z.string()).min(1).max(5),
    }),
  },
];

type EvalResult = {
  id: string;
  label: string;
  jobType: string;
  ok: boolean;
  validation: 'pass' | 'fail';
  validationError?: string;
  durationMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  rawText: string;
  parsed?: unknown;
};

async function runCase(client: Anthropic, c: EvalCase): Promise<EvalResult> {
  const start = Date.now();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
      system: c.systemPrompt,
      messages: [{ role: 'user', content: c.userPrompt }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return {
      id: c.id,
      label: c.label,
      jobType: c.jobType,
      ok: false,
      validation: 'fail',
      validationError: `API error: ${message}`,
      durationMs: Date.now() - start,
      tokensIn: 0,
      tokensOut: 0,
      costUsd: 0,
      rawText: '',
    };
  }
  const durationMs = Date.now() - start;

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: unknown = null;
  let validation: 'pass' | 'fail' = 'fail';
  let validationError: string | undefined;

  try {
    parsed = JSON.parse(cleaned);
    const validated = c.schema.safeParse(parsed);
    if (validated.success) {
      validation = 'pass';
    } else {
      validationError = validated.error.errors
        .slice(0, 3)
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
    }
  } catch (err) {
    validationError = err instanceof Error ? err.message : 'JSON parse error';
  }

  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  const costUsd =
    (tokensIn * 3.0) / 1_000_000 + (tokensOut * 15.0) / 1_000_000;

  return {
    id: c.id,
    label: c.label,
    jobType: c.jobType,
    ok: true,
    validation,
    validationError,
    durationMs,
    tokensIn,
    tokensOut,
    costUsd: Math.round(costUsd * 10000) / 10000,
    rawText: text.slice(0, 500),
    parsed,
  };
}

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set');
    process.exit(1);
  }
  const client = new Anthropic({ apiKey, timeout: 60_000 });

  console.log(`\nB7.14 AI 評価ハーネス — model=${MODEL}, max_tokens=${MAX_TOKENS}`);
  console.log(`実行: ${new Date().toISOString()}`);
  console.log(`評価対象: ${cases.length} endpoint\n`);

  const results: EvalResult[] = [];
  for (const c of cases) {
    process.stdout.write(`[${c.id.padEnd(20)}] ${c.label} ... `);
    const r = await runCase(client, c);
    results.push(r);
    const flag = r.validation === 'pass' ? 'PASS' : 'FAIL';
    console.log(
      `${flag} ${r.durationMs}ms  in=${r.tokensIn} out=${r.tokensOut} cost=$${r.costUsd.toFixed(4)}${
        r.validationError ? `  err=${r.validationError}` : ''
      }`
    );
  }

  const totalCost = results.reduce((s, r) => s + r.costUsd, 0);
  const totalTokensIn = results.reduce((s, r) => s + r.tokensIn, 0);
  const totalTokensOut = results.reduce((s, r) => s + r.tokensOut, 0);
  const passCount = results.filter((r) => r.validation === 'pass').length;
  const failCount = results.length - passCount;

  console.log(`\n--- summary ---`);
  console.log(`PASS: ${passCount} / ${results.length}`);
  console.log(`FAIL: ${failCount}`);
  console.log(`total tokens: in=${totalTokensIn} out=${totalTokensOut}`);
  console.log(`total cost: $${totalCost.toFixed(4)}`);

  const date = new Date();
  const stamp = date.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = join(process.cwd(), 'tmp', 'eval-results');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${stamp}.json`);
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        timestamp: date.toISOString(),
        model: MODEL,
        max_tokens: MAX_TOKENS,
        summary: {
          passCount,
          failCount,
          total: results.length,
          totalTokensIn,
          totalTokensOut,
          totalCostUsd: totalCost,
        },
        results,
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`\n保存: ${outFile}`);

  if (failCount > 0) {
    console.error(`\nFAIL があります。validation_error を確認してください`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
