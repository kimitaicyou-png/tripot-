import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export type DealAiAction =
  | 'generate-proposal'
  | 'generate-requirement'
  | 'generate-tasks'
  | 'generate-estimate'
  | 'generate-budget'
  | 'generate-minutes'
  | 'generate-email';

const MODEL = 'claude-sonnet-4-6';

function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が設定されていません');
  return new Anthropic({ apiKey });
}

async function callText(system: string, user: string, max = 2000): Promise<string> {
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
  const start = cleaned.indexOf('[');
  const startObj = cleaned.indexOf('{');
  const idx = start !== -1 && (start < startObj || startObj === -1) ? start : startObj;
  if (idx === -1) return null;
  try {
    return JSON.parse(cleaned.slice(idx)) as T;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as DealAiAction;

    if (action === 'generate-proposal') {
      const { dealName, clientName, industry, assignee, amount, dealContext, researchEnabled, userPrompt } = body;
      const researchNote = researchEnabled
        ? `市場調査も含めてください。${industry}業界の市場規模・成長率・主要トレンド・競合情報を調べて反映してください。`
        : '';
      const raw = await callText(
        `あなたは${industry}業界のシステム提案のプロフェッショナルです。提案書のスライドデータをJSON配列で出力します。`,
        `${clientName}向け「${dealName}」の提案書を起承転結の構成で12〜15枚のスライドとして作成してください。
${researchNote}

担当: ${assignee}
予算感: ${amount > 0 ? `¥${amount.toLocaleString()}` : '未定'}

${dealContext ? `【顧客コンテキスト】\n${dealContext}` : ''}
${userPrompt ? `【追加指示】\n${userPrompt}` : ''}

出力フォーマット（JSON配列のみ、説明文不要）:
[
  {"type":"cover","title":"提案タイトル","bullets":["顧客名 御中","トライポット株式会社","担当: ${assignee}","2026年4月"]},
  {"type":"problem","title":"スライドタイトル","bullets":["ポイント1","ポイント2","ポイント3"]},
  ...
]

type は以下から選択:
- cover: 表紙（1枚）
- problem: 課題・市場（起に該当、2-3枚）
- solution: 解決策（承）
- effect: 効果・メリット（承）
- tech: 技術・競合優位性（承）
- schedule: スケジュール（転）
- team: 体制・獲得プラン（転）
- cases: 事例・KPI（転）
- cost: 費用（転）
- next: ビジョン・ネクストステップ（結、1-2枚）

各スライドのbulletsは3〜5個。具体的な数字・データを含めること。`,
        4000
      );
      const slides = extractJson<Array<{ type: string; title: string; bullets: string[] }>>(raw);
      if (!slides || slides.length === 0) {
        return NextResponse.json({ error: 'スライドの生成に失敗しました', raw }, { status: 500 });
      }
      return NextResponse.json({ slides });
    }

    if (action === 'generate-requirement') {
      const { dealName, clientName, industry, amount, monthlyAmount, dealContext } = body;
      const text = await callText(
        'あなたは制作会社のシニアPMです。システム開発の要件定義書を作成します。Markdownで構造化して出力します。',
        `以下の案件の要件定義書を作成してください。

案件名: ${dealName}
クライアント: ${clientName}
業種: ${industry}
予算: ${amount > 0 ? `¥${amount.toLocaleString()}` : monthlyAmount ? `¥${monthlyAmount.toLocaleString()}/月` : '別途協議'}

${dealContext ? `【顧客コンテキスト・ヒアリング内容】\n${dealContext}` : ''}

以下の構成で要件定義書を作成してください:
1. プロジェクト概要（クライアント・案件名・予算・業種）
2. 背景・課題（顧客ヒアリングから導出）
3. 機能要件（3〜6個、各機能は箇条書きで具体的に）
4. 非機能要件（レスポンス・稼働率・セキュリティ・ブラウザ）
5. 技術スタック（推奨）
6. 画面一覧（概算）

出力はMarkdownのみ、説明文不要。`,
        3000
      );
      return NextResponse.json({ text });
    }

    if (action === 'generate-tasks') {
      const { dealName, clientName, assignedMembers, requirementText } = body;
      const membersInfo = (assignedMembers as Array<{ name: string; role: string }>)
        .map((m) => `- ${m.name}（${m.role}）`).join('\n');
      const raw = await callText(
        'あなたは制作PMです。要件定義から実装タスクを生成します。出力はJSONのみ。',
        `以下の要件からタスクを生成してください。

案件: ${dealName}（${clientName}）

アサインメンバー:
${membersInfo || '未定'}

要件定義:
${requirementText}

出力フォーマット（JSON配列のみ、説明文不要）:
[
  {"title":"タスク名","detail":"詳細説明","daysFromNow":3,"assigneeIndex":0},
  ...
]

- 8〜12タスクを生成
- daysFromNow: 今日から何日後が期限か
- assigneeIndex: アサインメンバーのインデックス（0始まり、メンバーが未定なら0）
- キックオフ準備→ヒアリング→設計→実装→テスト→納品の流れで`,
        2500
      );
      const tasks = extractJson<Array<{ title: string; detail: string; daysFromNow: number; assigneeIndex: number }>>(raw);
      return NextResponse.json({ tasks: tasks ?? [], raw });
    }

    if (action === 'generate-estimate') {
      const { dealName, clientName, industry, amount, dealContext, slideSummary } = body;
      const raw = await callText(
        `あなたは${industry}業界のシステム開発の見積もりの専門家です。見積項目をJSON配列で出力します。`,
        `以下の案件の見積もりを作成してください。

案件: ${dealName}（${clientName}）
業種: ${industry}
予算目安: ${amount > 0 ? `¥${amount.toLocaleString()}` : '未定（300万円前後で見積もってください）'}

${slideSummary ? `【提案書の概要】\n${slideSummary}` : ''}
${dealContext ? `【顧客コンテキスト】\n${dealContext}` : ''}

出力フォーマット（JSON配列のみ、説明文不要）:
[
  {"name":"要件定義","unitPrice":800000,"manMonth":1.5},
  {"name":"基本設計","unitPrice":900000,"manMonth":1.0},
  ...
]

- 5〜7項目
- unitPrice: 人月単価（円）
- manMonth: 工数（人月）
- 合計が予算を大幅に超えないこと
- ${industry}業界の相場を考慮`,
        1500
      );
      const items = extractJson<Array<{ name: string; unitPrice: number; manMonth: number }>>(raw);
      if (items) {
        const withAmount = items.map((i) => ({ ...i, amount: Math.round(i.unitPrice * i.manMonth) }));
        return NextResponse.json({ items: withAmount });
      }
      return NextResponse.json({ items: [], raw });
    }

    if (action === 'generate-budget') {
      const { items, industry } = body;
      const itemsList = (items as Array<{ name: string; amount: number; manMonth: number; unitPrice: number }>)
        .map((i) => `- ${i.name}: 売上¥${i.amount.toLocaleString()}（${i.manMonth}人月 × ¥${i.unitPrice.toLocaleString()}）`).join('\n');
      const raw = await callText(
        `あなたは制作会社の経理担当です。見積項目に対するコスト予算（原価）を算出します。${industry}業界の相場を考慮してください。出力はJSONのみ。`,
        `以下の見積項目に対して、各項目の予算コスト（原価）を算出してください。

${itemsList}

出力フォーマット（JSON配列のみ、説明文不要）:
[
  {"name":"要件定義","revenue":1200000,"budgetCost":900000,"costLabel":"1.5人月 × ¥60万","grossProfit":300000},
  ...
]

- budgetCost は原価（外注費+人件費）
- grossProfit = revenue - budgetCost
- 粗利率25〜35%を目安に設定
- costLabel は原価の内訳説明`,
        1500
      );
      const budget = extractJson<Array<{ name: string; revenue: number; budgetCost: number; costLabel: string; grossProfit: number }>>(raw);
      return NextResponse.json({ budget: budget ?? [] });
    }

    if (action === 'generate-minutes') {
      const { dealName, voiceText, assignee } = body;
      const text = await callText(
        'あなたは会議書記です。走り書きや音声書き起こしから、構造化された議事録を生成します。また、顧客のニーズを抽出します。',
        `以下の打ち合わせメモ/音声入力から議事録を生成してください。

案件: ${dealName}
担当: ${assignee}
日時: ${new Date().toLocaleDateString('ja-JP')}

メモ内容:
${voiceText}

以下のJSON形式で出力してください（説明文不要）:
{
  "minutes": "# 議事録: ...\n**日時:** ...\n\n## 議題\n...\n\n## 決定事項\n...\n\n## 宿題\n...\n\n## 次回予定\n...",
  "needs": ["ニーズ1", "ニーズ2", "ニーズ3"]
}

- minutes はMarkdown形式の議事録
- needs は顧客のニーズ・要望を3〜5個抽出`,
        2000
      );
      const parsed = extractJson<{ minutes: string; needs: string[] }>(text);
      if (parsed) {
        return NextResponse.json(parsed);
      }
      return NextResponse.json({ minutes: text, needs: [] });
    }

    if (action === 'generate-email') {
      const { dealName, clientName, assignee, industry, commsHistory, allNeeds } = body;
      const text = await callText(
        `あなたはIT企業のビジネスメール作成のプロです。${industry}業界の顧客に対する丁寧で具体的なメールを作成します。`,
        `以下の情報を元に、顧客へのフォローアップメールを作成してください。

案件: ${dealName}
顧客: ${clientName}
担当: ${assignee}

${commsHistory ? `【直近のやり取り】\n${commsHistory}` : ''}
${allNeeds?.length > 0 ? `【抽出済みニーズ】\n${(allNeeds as string[]).map((n: string) => `・${n}`).join('\n')}` : ''}

メール本文のみ出力してください（件名不要、説明文不要）。
宛先は「${clientName}\nご担当者様」で始め、「トライポット株式会社\n${assignee}」で締めてください。`,
        1000
      );
      return NextResponse.json({ text });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
