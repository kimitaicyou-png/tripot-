import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/apiAuth';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `あなたはIT・デザイン制作会社の案件管理アシスタントです。
ユーザーがアップロードしたファイル（請求書、見積書、メール、メモ、CSV、スクリーンショット等）から、案件情報を抽出してください。

必ず以下のJSON配列形式で出力してください。1ファイルから複数案件が読み取れる場合は複数行で。
\`\`\`json
[
  {
    "clientName": "顧客名（株式会社○○）",
    "dealName": "案件名（なければ顧客名+内容で推定）",
    "amount": 金額（数値。不明なら0）,
    "stage": "ステージ（以下から選択: lead, meeting, proposal, estimate_sent, negotiation, ordered, in_production, delivered, acceptance, invoiced, accounting, paid）",
    "industry": "業種（IT, 製造業, 医療, 飲食, 不動産, 建設, 教育, その他）",
    "memo": "読み取れた補足情報",
    "revenueType": "shot または running",
    "monthlyAmount": ランニングの場合の月額（数値。不明なら0）
  }
]
\`\`\`

重要ルール:
- 請求書なら stage は "invoiced" にする
- 見積書なら stage は "estimate_sent" にする
- 入金確認なら stage は "paid" にする
- 金額は税込で。不明なら 0
- 顧客名は正式名称で（株式会社を省略しない）
- JSON以外のテキストは出力しない`;

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  const assignee = formData.get('assignee') as string | null;

  if (files.length === 0) {
    return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const allDeals: Array<Record<string, unknown>> = [];
  const errors: string[] = [];

  for (const file of files) {
    try {
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const mimeType = file.type || 'application/octet-stream';
      const isImage = mimeType.startsWith('image/');
      const isPdf = mimeType === 'application/pdf';
      const isText = mimeType.startsWith('text/') || file.name.endsWith('.csv') || file.name.endsWith('.tsv');

      let content: Anthropic.Messages.ContentBlockParam[];

      if (isImage || isPdf) {
        content = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (isPdf ? 'image/png' : mimeType) as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: base64,
            },
          },
          { type: 'text', text: `このファイル（${file.name}）から案件情報を抽出してください。` },
        ];
      } else if (isText) {
        const text = new TextDecoder('utf-8').decode(buffer);
        content = [
          { type: 'text', text: `以下のテキストファイル（${file.name}）から案件情報を抽出してください:\n\n${text.slice(0, 10000)}` },
        ];
      } else {
        const text = new TextDecoder('utf-8').decode(buffer);
        content = [
          { type: 'text', text: `以下のファイル（${file.name}）から案件情報を抽出してください:\n\n${text.slice(0, 10000)}` },
        ];
      }

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content }],
      });

      const responseText = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<Record<string, unknown>>;
        for (const deal of parsed) {
          allDeals.push({
            ...deal,
            sourceFile: file.name,
            assignee: assignee ?? '',
          });
        }
      } else {
        errors.push(`${file.name}: 案件情報を抽出できませんでした`);
      }
    } catch (e) {
      errors.push(`${file.name}: ${e instanceof Error ? e.message : '処理エラー'}`);
    }
  }

  return NextResponse.json({ deals: allDeals, errors, fileCount: files.length });
}

export async function PUT(req: NextRequest) {
  const authResult = await requireAuth(); if (isAuthError(authResult)) return authResult;

  const body = await req.json() as { deals: Array<Record<string, unknown>> };
  if (!body.deals || !Array.isArray(body.deals)) {
    return NextResponse.json({ error: 'deals array is required' }, { status: 400 });
  }

  const sql = getDb();
  const now = new Date().toISOString();
  let inserted = 0;

  for (const d of body.deals) {
    const id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    try {
      await sql`
        INSERT INTO deals (id, client_name, deal_name, industry, stage, amount, probability, assignee, last_date, memo, revenue_type, monthly_amount, updated_at)
        VALUES (
          ${id},
          ${String(d.clientName ?? '')},
          ${String(d.dealName ?? '')},
          ${String(d.industry ?? 'その他')},
          ${String(d.stage ?? 'lead')},
          ${Number(d.amount) || 0},
          ${50},
          ${String(d.assignee ?? '')},
          ${now.slice(0, 10)},
          ${String(d.memo ?? '')},
          ${String(d.revenueType ?? 'shot')},
          ${Number(d.monthlyAmount) || 0},
          ${now}
        )
      `;
      inserted++;
    } catch {
      continue;
    }
  }

  return NextResponse.json({ inserted, total: body.deals.length });
}
