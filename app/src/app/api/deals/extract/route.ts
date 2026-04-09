import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export type ExtractedDeal = {
  title: string | null;
  customerName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  memo: string | null;
  estimatedAmount: number | null;
  stage: 'lead' | 'meeting' | 'proposal' | 'negotiation';
  companyName: string | null;
  companyAddress: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  department: string | null;
  position: string | null;
  fax: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { imageBase64: string; mediaType?: string };
    const { imageBase64, mediaType = 'image/jpeg' } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: '画像データがありません' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY が設定されていません' }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: 'この画像から情報を抽出してJSONで返してください。画像は名刺・打合せメモ・メールスクショ・チャット画面のいずれかです。必ずJSON文字列のみを返してください。説明文や前置きは不要です。返すJSON: { "title": "案件名（推測）", "customerName": "顧客企業名（短縮可）", "contactName": "担当者名（姓名）", "contactEmail": "担当者メールアドレス", "contactPhone": "担当者直通電話", "memo": "案件概要・要望", "estimatedAmount": 受注予定金額（数値、わからなければnull）, "stage": "lead | meeting | proposal | negotiation"（推測、デフォルトlead）, "companyName": "会社名・正式名称（株式会社等含む）", "companyAddress": "会社住所（郵便番号含む全文）", "companyPhone": "会社代表電話番号", "companyWebsite": "会社WebサイトURL", "department": "部署名", "position": "役職名", "fax": "FAX番号" } 読み取れない項目はnullまたは空文字。',
            },
          ],
        },
      ],
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: '抽出結果を解析できませんでした' }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]) as ExtractedDeal;
    return NextResponse.json({ data: extracted });
  } catch (err) {
    const message = err instanceof Error ? err.message : '不明なエラー';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
