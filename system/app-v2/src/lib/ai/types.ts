export type AiJobType =
  | 'transcribe'
  | 'summarize-voice'
  | 'extract-deal-from-photo'
  | 'extract-deals-from-file'
  | 'generate-proposal'
  | 'generate-requirement'
  | 'generate-tasks'
  | 'generate-estimate'
  | 'generate-budget'
  | 'generate-minutes'
  | 'generate-email'
  | 'refine-requirements'
  | 'generate-sitemap'
  | 'suggest-next-action'
  | 'import-reply'
  | 'risk-score'
  | 'stuck-deals'
  | 'win-probability'
  | 'loyalty'
  | 'silence-detect'
  | 'competitor-watch'
  | 'overload-detect'
  | 'price-suggest'
  | 'upsell'
  | 'proposal-winrate'
  | 'morning-brief'
  | 'chat'
  | 'extract-needs';

export type AiProvider = 'anthropic' | 'openai' | 'google' | 'other';

export type AiCallContext = {
  companyId: string;
  memberId?: string;
  jobType: AiJobType;
  dealId?: string;
};

export type AiUsageRecord = {
  tokensIn: number;
  tokensOut: number;
  costMicroUsd: number;
};

export type AiTextResult = {
  text: string;
  usage: AiUsageRecord;
  jobId: string;
};

export type AiJsonResult<T> = {
  data: T;
  usage: AiUsageRecord;
  jobId: string;
  rawText: string;
};

export class AiError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AiError';
  }
}
