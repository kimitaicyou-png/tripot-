import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export type AiAction =
  | 'refine-requirements'
  | 'generate-sitemap'
  | 'generate-tasks'
  | 'summarize-voice'
  | 'suggest-next-action'
  | 'import-reply';

export type GeneratedTask = {
  title: string;
  assigneeType: 'internal' | 'external';
  suggestedMemberName?: string;
  suggestedVendorName?: string;
  estimatedCost?: number;
  dueDate?: string;
  requirementRefs?: string[];
};

const MODEL = 'claude-sonnet-4-6';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');
  return new Anthropic({ apiKey });
}

async function callText(system: string, user: string, max = 1500): Promise<string> {
  const client = getClient();
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: max,
    system,
    messages: [{ role: 'user', content: user }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') return '';
  return block.text.trim();
}

function extractJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  const idx = startArr !== -1 && (startArr < start || start === -1) ? startArr : start;
  if (idx === -1) return null;
  try {
    return JSON.parse(cleaned.slice(idx)) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;
  try {
    const body = await req.json() as {
      action: AiAction;
      requirement?: string;
      sitemap?: string;
      proposalSummary?: string;
      handoffNotes?: string;
      budget?: number;
      members?: { id: string; name: string; role?: string; skills?: string[]; load?: number }[];
      vendors?: { name: string; specialty: string }[];
      actions?: { type: string; date: string; content: string }[];
      transcript?: string;
      replyText?: string;
      channel?: 'email' | 'slack';
    };

    if (body.action === 'refine-requirements') {
      const text = await callText(
        'あなたは制作会社のシニアPMです。受け取った要件定義を、漏れを補完し、構造化された見やすいMarkdownに整形します。日本語で簡潔に。',
        `以下の要件定義を整形してください。見出し(##)・箇条書き(-)を使い、「機能要件/非機能要件/制約/前提」のセクションに分けてください。不足を推測で埋める場合は ※推測 と注記してください。\n\n---\n${body.requirement ?? ''}\n---`,
        2000
      );
      return NextResponse.json({ text });
    }

    if (body.action === 'generate-sitemap') {
      const text = await callText(
        'あなたはWebサイト/アプリの情報設計者です。要件からサイトマップを生成します。Markdownの階層リスト(-)で出力し、各画面には1行の目的コメントを付けます。',
        `以下の要件からサイトマップを生成してください。出力はMarkdownのみ、説明文不要。\n\n# 提案概要\n${body.proposalSummary ?? '(なし)'}\n\n# 要件\n${body.requirement ?? ''}`,
        1500
      );
      return NextResponse.json({ text });
    }

    if (body.action === 'generate-tasks') {
      const membersText = (body.members ?? []).map((m) => `- ${m.name}${m.role ? `(${m.role})` : ''}${m.skills?.length ? ` [${m.skills.join(',')}]` : ''}${m.load !== undefined ? ` 稼働${m.load}件` : ''}`).join('\n');
      const vendorsText = (body.vendors ?? []).map((v) => `- ${v.name}: ${v.specialty}`).join('\n');
      const user = `以下の要件と制約から、実装タスクをJSON配列で出力してください。各タスクに適切な担当（内部メンバーなら suggestedMemberName、外部なら suggestedVendorName と外部扱い）と概算原価(円)を付与してください。稼働が多いメンバーは避けてください。予算上限: ${body.budget?.toLocaleString() ?? '未設定'}円。合計が予算を超えないこと。\n\n# 内部メンバー\n${membersText || '(なし)'}\n\n# 外注先候補\n${vendorsText || '(なし)'}\n\n# 要件\n${body.requirement ?? ''}\n\n出力フォーマット（JSON配列のみ、説明文なし）:\n[{"title":"...","assigneeType":"internal","suggestedMemberName":"...","estimatedCost":0},{"title":"...","assigneeType":"external","suggestedVendorName":"...","estimatedCost":0}]`;
      const raw = await callText(
        'あなたは制作PMです。要件から実装タスクを生成し、担当と原価を提案します。出力はJSONのみ、説明不要。',
        user,
        2500
      );
      const tasks = extractJson<GeneratedTask[]>(raw) ?? [];
      return NextResponse.json({ tasks, raw });
    }

    if (body.action === 'summarize-voice') {
      const text = await callText(
        'あなたは会議書記です。音声書き起こしから要点を抽出します。',
        `以下の音声書き起こしを、3〜5行の箇条書き要約にしてください。余計な説明は不要、日本語で出力してください。決定事項・宿題・懸念点を明確に。\n\n---\n${body.transcript ?? ''}\n---`,
        600
      );
      return NextResponse.json({ text });
    }

    if (body.action === 'suggest-next-action') {
      const recentActions = (body.actions ?? []).slice(0, 10).map((a) => `- [${a.date}] ${a.type}: ${a.content}`).join('\n');
      const text = await callText(
        'あなたは制作PMのアシスタントです。最近のアクション履歴から、次に取るべき具体的な行動を1つ提案します。',
        `# 最近のアクション履歴\n${recentActions || '(なし)'}\n\n# 提案サマリー\n${body.proposalSummary ?? ''}\n\n次に取るべき行動を、「いつ / 誰が / 何をする」の1文で提案してください。余計な説明は不要。`,
        300
      );
      return NextResponse.json({ text });
    }

    if (body.action === 'import-reply') {
      const raw = await callText(
        'あなたは制作会社のアシスタントです。顧客または社内からの返信（メール/Slack）を読み、行動履歴に登録するための構造化データを抽出します。出力はJSONのみ。',
        `以下の返信文を解析し、以下のJSONで返してください:\n{"type":"voice|meet|phone|email","date":"YYYY-MM-DD","content":"1文の要約（60字以内、決定事項があれば含める）","assignee":"送信者名（判別できなければ空文字）","suggestedNextAction":"次に取るべき行動の1文（任意）"}\n\n返信チャネル: ${body.channel ?? 'email'}\n今日: ${new Date().toISOString().slice(0,10)}\n\n---\n${body.replyText ?? ''}\n---`,
        600
      );
      const parsed = extractJson<{ type: string; date: string; content: string; assignee: string; suggestedNextAction?: string }>(raw);
      return NextResponse.json({ parsed, raw });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
