# トライポット業務システム

コアリスHD 事業会社「トライポット株式会社」（IT・受託開発）の経営管理システム。

> **重要**: 旧 `system/app/` 構造は **凍結・参照のみ**。すべての新規開発は
> `system/app-v2/` で行うこと。app-v2 は drizzle/Postgres/NextAuth v5 を中核とした
> 完全新設計、localStorage 中心の旧 v1 は撲滅済み。

## プロジェクト構造

```
tripot/
├── .vercel/                      ← Vercel プロジェクトID（プロジェクトルート）
├── vercel.json                   ← system/app-v2 を Next.js root として指定
├── README.md
└── system/
    ├── CLAUDE.md                 ← このファイル
    ├── app-v2/                   ← ★ 現行アプリ本体 ★
    │   ├── src/
    │   │   ├── app/
    │   │   │   ├── (auth)/login/
    │   │   │   ├── (dashboard)/
    │   │   │   │   ├── home/[memberId]/   ← 個人ダッシュボード
    │   │   │   │   │   └── _components/
    │   │   │   │   │       └── welcome-first-steps.tsx  ← 初日メンバー向け 3 ステップ
    │   │   │   │   ├── deals/             ← 案件管理（Kanban + リスト切替）
    │   │   │   │   │   ├── _components/
    │   │   │   │   │   │   └── deals-kanban.tsx
    │   │   │   │   │   └── [dealId]/_components/
    │   │   │   │   │       ├── stage-stepper.tsx        ← 縦型 9 段 Stepper
    │   │   │   │   │       ├── stage-bar.tsx            ← 1 行サマリー（折りたたみ summary）
    │   │   │   │   │       ├── next-stage-checklist.tsx ← 次に進む条件
    │   │   │   │   │       ├── inline-stage-changer.tsx ← バッジクリック → dropdown
    │   │   │   │   │       ├── meeting-form.tsx         ← 録音 + 議事録入力
    │   │   │   │   │       ├── meetings-tab.tsx
    │   │   │   │   │       ├── generate-requirement-button.tsx
    │   │   │   │   │       └── estimate-editor.tsx      ← AI 明細生成ボタン込み
    │   │   │   │   ├── monthly/ weekly/ budget/ tasks/ customers/ team/ production/ approval/ settings/ search/ notifications/
    │   │   │   │   └── layout.tsx
    │   │   │   └── api/
    │   │   │       ├── auth/[...nextauth]/
    │   │   │       ├── ai/                ← AI 11 ルート + bridge/kpi
    │   │   │       │   ├── chat/          ← tool use loop、ai_jobs/ai_usage 直書き
    │   │   │       │   ├── generate-email/
    │   │   │       │   ├── generate-estimate/    ← 2026-05-20 旧 → 新移植
    │   │   │       │   ├── generate-proposal/
    │   │   │       │   ├── generate-requirement/ ← 2026-05-20 旧 → 新移植
    │   │   │       │   ├── generate-tasks/
    │   │   │       │   ├── morning-brief/
    │   │   │       │   ├── next-action/
    │   │   │       │   ├── optimize-work/
    │   │   │       │   ├── recommend-assignee/
    │   │   │       │   ├── risk-score/
    │   │   │       │   └── summarize-meeting/   ← 議事録 → 要約 + needs 抽出
    │   │   │       └── bridge/kpi/        ← 本部向け KPI API
    │   │   ├── components/
    │   │   │   ├── voice-input-button.tsx  ← Web Speech API ベース録音
    │   │   │   ├── log-action-button.tsx
    │   │   │   ├── nav/sidebar.tsx
    │   │   │   └── ui/                    ← 共通 UI（form / dialog / toaster / badge 等）
    │   │   ├── lib/
    │   │   │   ├── ai/
    │   │   │   │   ├── client.ts          ← callText / callJson 標準ラッパー
    │   │   │   │   ├── cost.ts            ← model 別 cost 計算
    │   │   │   │   ├── chat-tools.ts      ← chat 用 tool 定義
    │   │   │   │   └── types.ts
    │   │   │   ├── deals/
    │   │   │   │   ├── stage-requirements.ts ← getStageRequirements()
    │   │   │   │   └── stage-advance.ts      ← maybeAdvanceDealStage() 自動進行
    │   │   │   ├── actions/               ← Server Actions
    │   │   │   │   ├── deals.ts            ← createDeal/updateDeal/updateDealStage
    │   │   │   │   ├── proposals.ts        ← updateProposalStatus: shared → proposing
    │   │   │   │   ├── estimates.ts        ← updateEstimateStatus: accepted → ordered
    │   │   │   │   ├── invoices.ts         ← issued/sent → invoiced、paid → paid
    │   │   │   │   ├── tasks.ts            ← 全 done → delivered
    │   │   │   │   ├── meetings.ts
    │   │   │   │   ├── customers.ts
    │   │   │   │   └── lost-deals.ts       ← stage='lost' 既存実装
    │   │   │   ├── db.ts                  ← drizzle client + logAudit + setTenantContext
    │   │   │   └── rbac.ts                ← requirePermission
    │   │   ├── db/
    │   │   │   ├── schema.ts              ← deals/proposals/estimates/invoices/meetings/tasks/...
    │   │   │   └── migrations/
    │   │   └── auth.ts                    ← NextAuth v5 設定 + Google OAuth
    │   ├── coaris.config.ts                ← TRIPOT_CONFIG（stages/roles/quotes/branding/features）
    │   ├── drizzle.config.ts
    │   ├── package.json                    ← name: "coaris-tripot-v2"
    │   └── .env.local                      ← AUTH/DATABASE/ANTHROPIC は Vercel env で管理
    ├── app/                                ← ★ 旧 v1、凍結・参照のみ ★
    └── docs/                               ← 設計書 (0010_*.md)
        └── archive/                        ← handoff ログ
```

## 技術スタック

- **Next.js 16** (App Router / Turbopack)
- **React 19** + TypeScript（strict）
- **Tailwind CSS v4**
- **NextAuth v5 beta**（Google OAuth、招待制 members table）
- **drizzle-orm** + **Neon PostgreSQL**（Postgres serverless）
- **Anthropic Claude**（model: claude-sonnet-4-6）
- **Web Speech API**（録音・文字起こし、ブラウザネイティブ、新規 env 不要）
- **Sentry**（エラー監視、PII redact 済）+ **PostHog**（分析）
- Vercel デプロイ（CLI 経由 or git push → 手動 `vercel deploy --prod`）

## 本番環境

- **URL**: `https://tripot-v2-coaris.vercel.app`
- **Vercel project**: `tripot-v2-coaris`（projectId: `prj_lxvTxedBXc85GFwUA8uA1IAim0Cr`）
- **GitHub**: `kimitaicyou-png/tripot-`
- **Vercel team**: `ktoki-2559s-projects`（teamId: `team_sDj8nJ8ej7K7ihU3PMJstpoy`）
- **deploy 運用**：`cd system/app-v2 && vercel deploy --prod --yes`（git push hook ではなく手動 deploy）

## 認証・権限

- **招待制**: members テーブル + `members.json`（移行中）に登録された Gmail のみログイン可
- **ロール**: `president` / `hq_member` / `member`（旧 owner/manager/member は撤回）
- **RBAC**: `src/lib/rbac.ts` の `requirePermission` で resource × action ベース判定
- メンバー追加は president が `/settings/members` から招待
- `auth.ts` の `authorized` callback で email から role を引く

## tripot 思想（隊長明示 2026-05-20）

> 「毎日の行動が、週次になり月次になる。コアリス全体の数字になる。
> 最終的に PL と CF 予実が見れる。初期設定さえしてあれば、あとは毎日の行動管理を
> すれば全部追える」

### 動線

```
（録音）
  ↓ Web Speech API
（文字起こし → 議事録テキスト）
  ↓ summarize-meeting
（要約 + ニーズ抽出 needs）
  ↓ generate-requirement
（要件定義）
  ↓ generate-proposal
（提案書）
  ↓ 提案書 status='shared' → 自動で deal.stage='proposing'
  ↓ generate-estimate（議事録 + needs から）
（見積 line_items）
  ↓ 見積 status='accepted' → 自動で deal.stage='ordered'
  ↓ generate-tasks
（タスク）
  ↓ 全タスク done → 自動で deal.stage='delivered'
  ↓ 検収議事録（手動進行）
（acceptance）
  ↓ 請求書発行（status='issued' or 'sent'）→ 自動で deal.stage='invoiced'
  ↓ 入金確認（status='paid'）→ 自動で deal.stage='paid'
（PL/CF 実績確定）
```

### ステージ自動進行（7 段、全自動経路完成）

`lib/deals/stage-advance.ts` の `maybeAdvanceDealStage()` で実装。
「後退しないルール」（TRIPOT_CONFIG.stages.order 比較）で安全。

| トリガー | 遷移先 | triggered_by |
|---|---|---|
| proposal.status='shared' | proposing | proposal.shared |
| estimate.status='accepted' | ordered | estimate.accepted |
| task.create（deal 紐づき） | in_production | task.created |
| tasks 全 done | delivered | tasks.all_completed |
| meeting マーク済 + delivered | acceptance | meeting.marked_acceptance |
| invoice.status='issued' or 'sent' | invoiced | invoice.issued/sent |
| invoice.status='paid' | paid | invoice.paid |
| lost_deal 記録 | lost | （recordLostDeal 別フロー） |

ステージ 9 段のうち、prospect → proposing のみ手動オーバーライド（商談だけで進める用）。
他は全て書類 / タスク / 議事録マークの「行動」で自動進行する。
営業メンバーがステージを手で動かす場面はほぼゼロ。

### 案件 stage 9 段

`TRIPOT_CONFIG.stages` で定義（key/label/badgeClass/order/cashflowWeight/guidance）。

| key | label | order | CF 確度 |
|---|---|---|---|
| prospect | 見込み | 10 | 10% |
| proposing | 提案中 | 20 | 30% |
| ordered | 受注 | 30 | 70% |
| in_production | 制作中 | 40 | 80% |
| delivered | 納品済 | 50 | 90% |
| acceptance | 検収 | 60 | 95% |
| invoiced | 請求済 | 70 | 95% |
| paid | 入金済 | 80 | 100% |
| lost | 失注 | 999 | 0% |

## AI 接続（Claude API）

全 AI ルートは `src/lib/ai/client.ts` の `callText` / `callJson` 経由（**chat のみ例外**：
tool use multi-turn loop のため `route.ts` 内で直接 `ai_jobs`/`ai_usage` を書く）。

| ルート | 用途 | 入力 |
|---|---|---|
| `chat` | 営業支援チャット（tool use: DB query） | message |
| `summarize-meeting` | 議事録 → 要約 + needs 抽出 | meeting_id |
| `generate-requirement` | 議事録 → 要件定義（機能/非機能/質問/次手） | meeting_id |
| `generate-proposal` | 議事録 → 提案書スライド | meeting_id |
| `generate-estimate` | 案件 + 議事録 → 見積明細（5〜10行） | deal_id |
| `generate-tasks` | 議事録 → タスク（5〜12個 + 工数） | meeting_id |
| `generate-email` | 案件 → メール下書き | deal_id |
| `morning-brief` | 朝の優先 3 件 + アラート | member_id |
| `next-action` | 案件 → 次の一手 | deal_id |
| `optimize-work` | 制作要件 → 工数最適化 | card_id |
| `recommend-assignee` | 制作要件 → 担当者推薦 | card_id |
| `risk-score` | 案件 → 失注リスクスコア | deal_id |

### コスト記録

全ルートが `ai_jobs` / `ai_usage` テーブルに記録（chat も含む）。
`/settings/ai-usage` で集計を確認可能。

## データレイヤ

- 全データは **Neon PostgreSQL**（drizzle-orm 経由）
- 旧 `tripot_deals_all` 等の localStorage キーは撲滅済
- マルチテナント：`setTenantContext(companyId)` で session 変数を設定、すべての
  query に `eq(table.company_id, session.user.company_id)` を必須

## 開発コマンド

```sh
cd system/app-v2

# 開発サーバー
npm run dev                # http://localhost:3100

# 検証
npm run type-check         # tsc --noEmit
npm run lint               # next lint
npm run lint:ui            # bash scripts/coaris-ui-lint.sh（コアリス UI 規約）
npm run verify             # 全部まとめ

# DB
npm run db:generate        # drizzle-kit generate
npm run db:migrate         # drizzle-kit migrate
npm run db:push            # drizzle-kit push（dev のみ）
npm run db:studio          # drizzle-kit studio（GUI）

# デプロイ（隊長承認必須）
vercel deploy --prod --yes
```

## デザイン規律（厳守）

- `font-bold` / `font-black` 禁止 → `font-semibold` が最大
- `shadow-md` 以上禁止 → `shadow-sm` まで
- `text-gray-400` を本文に使わない → `text-gray-500` 以上
- `alert()` 禁止 → `toast.success/error` を使う
- `focus:ring-blue-500` は禁止（ブランド整合違反）→ `focus:ring-gray-900/20`
- 全 UI 日本語
- タップ要素に `active:scale-[0.98]`
- コメントは「なぜ」を書く、「何を」じゃない
- `members.json` 直接編集禁止（API or 設定画面経由）

## 未実装・今後の課題

- MoneyForward クラウド API 接続（販管費実績の自動取得）
- Kanban ドラッグ&ドロップ（dnd-kit、現状は表示のみ）
- delivered → acceptance の自動進行（検収議事録 type 判定が必要）
- ordered → in_production の自動進行（production_card 作成時 or タスク追加時）
- iOS Safari 音声認識の精度確認・Whisper API への切替検討
- ページネーション（現状最新 200 件のみ表示）
- 1Password CLI 経由でローカル env 同期

## トラブルシューティング

- **「ANTHROPIC_API_KEY is not set」エラー**：Vercel env に `ANTHROPIC_API_KEY` が
  登録されているか確認（local の `.env.local` には入れない、prod は Vercel で管理）
- **「ステージが進まない」**：書類 status を上げてもステージが動かない場合、
  `lib/deals/stage-advance.ts` の「後退しないルール」で既に前方の stage に居る可能性、
  `audit_logs` テーブルで `deal.stage_auto_advance` を確認
- **音声認識が動かない**：Firefox は SpeechRecognition 未対応、Chrome/Safari/Edge を
  推奨。`navigator.mediaDevices` 権限を確認

## 関連ファイル

- `~/.claude/memory/shared/tripot-stage-philosophy-mapping-2026-05-20.md`
- `~/.claude/memory/shared/tripot-stage-implementation-plan-2026-05-20.md`
- `~/.claude/memory/shared/tripot-v2-誰でも使える評価-2026-05-20.md`
- `~/.claude/memory/shared/handoff/2026-05-14-tripot-release.md`

---

*最終更新: 2026-05-20 夏美（録音 + 要件定義 + ステージ自動進行 + Kanban 実装後）*
