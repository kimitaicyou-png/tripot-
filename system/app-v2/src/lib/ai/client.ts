import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { ai_jobs, ai_usage } from '@/db/schema';
import { calculateCost } from './cost';
import {
  AiError,
  type AiCallContext,
  type AiTextResult,
  type AiJsonResult,
  type AiUsageRecord,
} from './types';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 500;

let cachedClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiError(
      'ANTHROPIC_API_KEY is not set. Configure it in Vercel env (Sensitive policy) or .env.local',
      undefined,
      false
    );
  }
  cachedClient = new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS });
  return cachedClient;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 429) return true;
    if (error.status && error.status >= 500) return true;
  }
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

type CallOptions = {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  userPrompt: string;
  imageBase64?: string;
  imageMediaType?: 'image/png' | 'image/jpeg' | 'image/webp';
};

async function startJob(ctx: AiCallContext, model: string, input: unknown): Promise<string> {
  const [row] = await db
    .insert(ai_jobs)
    .values({
      company_id: ctx.companyId,
      member_id: ctx.memberId,
      job_type: ctx.jobType,
      provider: 'anthropic',
      model,
      status: 'running',
      input: input as Record<string, unknown>,
      started_at: new Date(),
    })
    .returning({ id: ai_jobs.id });
  return row.id;
}

async function finishJob(
  jobId: string,
  status: 'succeeded' | 'failed',
  output: unknown,
  errorMsg: string | null
): Promise<void> {
  await db
    .update(ai_jobs)
    .set({
      status,
      output: output as Record<string, unknown> | null,
      error: errorMsg,
      finished_at: new Date(),
    })
    .where(eq(ai_jobs.id, jobId));
}

async function recordUsage(
  ctx: AiCallContext,
  jobId: string,
  model: string,
  usage: AiUsageRecord
): Promise<void> {
  await db.insert(ai_usage).values({
    company_id: ctx.companyId,
    member_id: ctx.memberId,
    job_id: jobId,
    provider: 'anthropic',
    model,
    tokens_in: usage.tokensIn,
    tokens_out: usage.tokensOut,
    cost_micro_usd: usage.costMicroUsd,
  });
}

async function callAnthropicWithRetry(
  options: CallOptions
): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
  const client = getAnthropic();
  const model = options.model ?? DEFAULT_MODEL;

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const userContent: Anthropic.MessageParam['content'] = options.imageBase64
        ? [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: options.imageMediaType ?? 'image/jpeg',
                data: options.imageBase64,
              },
            },
            { type: 'text', text: options.userPrompt },
          ]
        : options.userPrompt;

      const response = await client.messages.create({
        model,
        max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: options.temperature ?? 0.7,
        ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
        messages: [{ role: 'user', content: userContent }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        text,
        tokensIn: response.usage.input_tokens,
        tokensOut: response.usage.output_tokens,
      };
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES - 1) break;
      const backoff = BACKOFF_BASE_MS * Math.pow(2, attempt);
      await sleep(backoff);
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Unknown AI provider error';
  throw new AiError(`AI call failed after ${MAX_RETRIES} attempts: ${message}`, lastError, isRetryable(lastError));
}

export async function callText(
  ctx: AiCallContext,
  options: CallOptions
): Promise<AiTextResult> {
  const model = options.model ?? DEFAULT_MODEL;
  const jobId = await startJob(ctx, model, {
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
    hasImage: Boolean(options.imageBase64),
  });

  try {
    const { text, tokensIn, tokensOut } = await callAnthropicWithRetry(options);
    const usage = calculateCost(model, tokensIn, tokensOut);
    await Promise.all([
      finishJob(jobId, 'succeeded', { text }, null),
      recordUsage(ctx, jobId, model, usage),
    ]);
    return { text, usage, jobId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await finishJob(jobId, 'failed', null, message);
    throw err;
  }
}

export async function callJson<T>(
  ctx: AiCallContext,
  options: CallOptions & { schema?: string }
): Promise<AiJsonResult<T>> {
  const jsonInstruction =
    'Respond ONLY with valid JSON, no prose, no markdown fences. ' +
    (options.schema ? `Conform to this schema: ${options.schema}` : '');
  const merged: CallOptions = {
    ...options,
    systemPrompt: options.systemPrompt
      ? `${options.systemPrompt}\n\n${jsonInstruction}`
      : jsonInstruction,
    temperature: options.temperature ?? 0.2,
  };

  const result = await callText(ctx, merged);
  const cleaned = result.text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let data: T;
  try {
    data = JSON.parse(cleaned) as T;
  } catch (err) {
    throw new AiError(
      `AI returned non-JSON response: ${cleaned.slice(0, 200)}`,
      err,
      false
    );
  }

  return {
    data,
    usage: result.usage,
    jobId: result.jobId,
    rawText: result.text,
  };
}
