# トライポット業務システム

コアリスHD 事業会社「トライポット株式会社」（IT・システム開発）の経営管理システム。

## プロジェクト構造

```
tripot/
├── .vercel/                      ← Vercel プロジェクトID（ルート据え置き）
├── vercel.json                   ← system/app を Next.js root として指定
├── README.md
└── system/                       ← 新構造（wise-assist/deraforce と同じ）
    ├── CLAUDE.md                 ← このファイル
    ├── app/                      ← Next.js アプリ本体
    │   ├── src/
    │   │   ├── app/
    │   │   │   ├── (auth)/login/         ← ログインページ（Google OAuth）
    │   │   │   ├── (dashboard)/          ← 認証後の全ページ
    │   │   │   │   ├── home/[memberId]/  ← 個人ダッシュボード
    │   │   │   │   ├── monthly/          ← 月次ダッシュボード
    │   │   │   │   ├── weekly/           ← 週次ダッシュボード
    │   │   │   │   ├── production/       ← 制作ダッシュボード
    │   │   │   │   ├── budget/           ← 事業計画
    │   │   │   │   ├── settings/         ← 設定（3タブ: アカウント/会社/メンバー）
    │   │   │   │   └── ...
    │   │   │   └── api/
    │   │   │       ├── auth/         ← NextAuth（Google OAuth）
    │   │   │       ├── deals/ai/     ← AI生成（提案書・要件定義・見積書・議事録・メール等 7アクション）
    │   │   │       ├── deals/extract/← 名刺画像→案件情報抽出（Claude Vision）
    │   │   │       ├── members/      ← メンバーCRUD + 招待メール
    │   │   │       ├── production/ai/← 制作AI（要件整形・タスク生成等 6アクション）
    │   │   │       └── bridge/kpi/   ← 本部向けKPI API
    │   │   ├── components/
    │   │   │   ├── deals/            ← 案件管理UI（14ファイル）
    │   │   │   ├── attack/           ← アタックリスト
    │   │   │   ├── production/       ← 制作管理
    │   │   │   ├── monthly/          ← 月次報告会生成
    │   │   │   ├── finance/          ← 財務（支払・請求・原価・利益分析等）
    │   │   │   ├── personal/         ← 個人系（クイック入力・契約・提案書等）
    │   │   │   ├── weekly/           ← 週次（TODO・PL）
    │   │   │   └── ui/               ← 共通UI
    │   │   ├── lib/
    │   │   │   ├── deals/            ← 案件データ層（types, constants, dealOverrides等）
    │   │   │   ├── attack/           ← アタックデータ層
    │   │   │   ├── hooks/            ← usePersistedState, useDeals, useProductionCards等
    │   │   │   ├── dealsStore.ts     ← 案件ストア（localStorage: tripot_deals_all）
    │   │   │   └── productionCards.ts← 制作カードストア
    │   │   ├── data/
    │   │   │   └── members.json      ← メンバーマスター（認証+権限の正）
    │   │   └── auth.ts               ← NextAuth設定 + 権限制御
    │   ├── .env.local                ← AUTH_SECRET, AUTH_GOOGLE_*, ANTHROPIC_API_KEY
    │   └── package.json              ← name: "tripot-system"
    └── docs/                         ← 設計書・仕様書（0010_*.md 10刻み）
        └── archive/                  ← 過去の handoff ログ
```

## 技術スタック

- Next.js 16 (App Router / Turbopack)
- React 19 + TypeScript
- Tailwind CSS v4
- NextAuth v5 beta（Google OAuth）
- Anthropic Claude API（claude-sonnet-4-6）
- Recharts
- Vercel デプロイ

## 本番環境

- URL: https://tripot-system.vercel.app
- GitHub: https://github.com/kimitaicyou-png/tripot-
- Vercel project: `tripot-system`（ktoki-2559s-projects）

## 認証・権限

- **招待制**: members.json に登録されたGmailのみログイン可能
- **owner**: 全画面アクセス + メンバー管理 + 設定
- **manager**: 個人 + 週次 + 月次
- **member**: 個人ダッシュボードのみ
- メンバー追加は owner が設定画面から招待（Gmailで招待メール送信）
- auth.ts の `authorized` コールバックで権限チェック（emailからfindUserでロール取得）

## データフロー

```
事業計画（/budget）
  ↓ localStorage: budget_plan
  ↓ 当月の列を読み取り
月次ダッシュボード（/monthly）
  ├─ 予算: 売上・原価・販管費 ← 事業計画の当月分
  ├─ 実績: 売上・原価 ← dealsStore（tripot_deals_all）
  ├─ 販管費実績: 未取得（MFクラウド接続待ち）
  ├─ 翌月見通し: 受注残 + パイプライン確度加重 + ランニング vs 事業計画翌月予算
  └─ 月次報告会: 同じライブ値でClaude APIが生成

案件データ
  ├─ tripot_deals_all（localStorage）← メインストア
  ├─ coaris_deals_override ← 旧ストア（一部の上書き用、移行途中）
  └─ coaris_attack_to_deals ← アタックリストから商談化した案件

クイック入力（個人ダッシュボード）
  → dealsStore.updateDeal() → tripot_deals_all に書き込み
  → 案件管理に即反映
```

## AI接続（Claude API）

全て `/api/deals/ai` と `/api/production/ai` 経由。フォールバック付き（API失敗時は旧テンプレート）。

| 機能 | アクション | 入力 |
|---|---|---|
| 提案書生成 | generate-proposal | 顧客コンテキスト + ニーズ + 議事録 |
| 要件定義生成 | generate-requirement | 案件情報 + コンテキスト |
| タスク生成 | generate-tasks | 要件定義テキスト + メンバー |
| 見積書生成 | generate-estimate | 案件情報 + 提案書サマリー |
| 予算生成 | generate-budget | 見積項目 + 業種 |
| 議事録整形 | generate-minutes | 音声/テキスト入力 |
| メール生成 | generate-email | 案件情報 + やり取り履歴 + ニーズ |
| 月次報告会 | generate-monthly-report | ライブKPI + アンケート |

## localStorage キー一覧

| キー | 用途 |
|---|---|
| `tripot_deals_all` | 案件マスター |
| `coaris_deals_override` | 案件上書き（旧） |
| `coaris_attack_to_deals` | アタック→案件化 |
| `coaris-attack-list` | アタックリスト |
| `tripot_production_cards` | 制作カード |
| `budget_plan` | 事業計画（年間P/L） |
| `tripot_settings_target` | 月間目標（旧、budget_planに移行中） |
| `tripot_fiscal_start_month` | 期首月 |
| `coaris_needs_{dealId}` | 案件別ニーズ（議事録から抽出） |
| `coaris_minutes_{dealId}` | 案件別議事録 |
| `coaris_customers` | 顧客マスター |
| `coaris_email_logs` | メール送信ログ |
| `tripot_members_cache` | メンバーAPIキャッシュ |
| `tripot_*` | usePersistedState で永続化されたデータ |

## 開発ルール

- `cd system/app && npm run dev` で起動（ポート3100）
- ビルド: `cd system/app && npm run build`
- デプロイ: `cd system/app && npm run deploy`（safe-deploy.js 経由）
- font-bold 禁止 → font-semibold が最大
- shadow-md 以上禁止 → shadow-sm が最大
- text-gray-400 を本文に使わない → text-gray-500 以上
- 全て日本語UI
- active:scale-[0.98] をタップ要素に付ける
- メンバーの追加は隊長（owner）が設定画面から行う。コードで勝手に追加しない
- members.json を直接編集しない（APIまたは設定画面経由で管理）

## 未実装・今後の課題

- MFクラウドAPI接続（販管費実績・会計データの自動取得）
- Supabase移行（localStorage → DB）
- グループ全社ランキング（ブリッジAPI経由で他社データ連携）
- Kanbanのタッチドラッグ（モバイル対応）
- iOS Fullscreen API対応（プレゼンモード）
