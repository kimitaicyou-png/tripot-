# セッション引き継ぎ 2026-04-12

## 本番URL
- **Vercel:** https://app-sigma-seven-46.vercel.app
- **GitHub:** https://github.com/kimitaicyou-png/tripot-

## 今日やったこと（全量）

### 1. ハードコード修正
- scoring.ts: 固定日時3箇所 → Date.now()
- OrderedFlowSection.tsx: 固定日時3箇所 → new Date()
- InvoiceSection.tsx: 銀行口座 → COMPANY_BANK_ACCOUNT_TEXT 定数化
- サイレントcatch 6箇所 → console.error 追加

### 2. AI全機能をClaude API接続（7アクション）
- `/api/deals/ai` 新規作成
- 提案書・要件定義・タスク・見積書・予算・議事録・メール・月次報告会
- 全コンポーネント接続済み（ProposalEditor, OrderedFlowSection, EstimateEditor, ActionSection, MonthlyReportGenerator）
- フォールバック付き（API失敗時は旧テンプレート）
- ANTHROPIC_API_KEY: ローカル + Vercel Production + Development 設定済み

### 3. モックデータ永続化（15箇所 / 12ファイル）
- usePersistedState フック作成
- finance系4, personal系2, deals系4, pages系3
- モックデータはフォールバック初期値として維持（機能削除なし）

### 4. 動かないボタン修正
- Slackで通知 → Slack URLを開く
- MFクラウド連携 → MFクラウドを開く
- 提案書「表示→」→ onViewProposal コールバック

### 5. 月次ダッシュボード全面接続
- ProfitAnalysis: dealsStoreから自動集計
- InvoiceTracker: 案件ステージから自動生成
- MonthlyReportGenerator: Claude API + ライブデータ（全スライドハードコードゼロ）
- 翌月見通し: 事業計画の翌月予算と連動（予算比・差額表示）
- 詳細ページ: KPI_SNAPSHOTS廃止 → loadAllDeals()
- 予算: budget_plan（事業計画）と完全連動
- 販管費: 事業計画のlabor+adminから取得（予算列のみ、実績はMF待ち）

### 6. 招待制メンバー管理
- members.json: 動的メンバーリスト（auth.tsから読み込み）
- /api/members: CRUD API（GET/POST/PUT/DELETE）owner only
- 設定画面: 3タブ構成（アカウント/会社設定/メンバー管理）
- 招待フロー: Gmail招待メール自動生成
- サイドバー: 動的メンバーリスト（/api/members連携）
- kashiwagi フォールバック → toki に全て変更

### 7. ニーズ・議事録の永続化
- 議事録生成 → coaris_minutes_{dealId} に自動保存
- ニーズ抽出 → coaris_needs_{dealId} に蓄積
- gatherDealContext → 提案書生成時にニーズ+議事録を含める

### 8. 提案書生成の品質改善
- 表紙: 案件名がタイトル（起承転結にならない）
- 各スライド: 4-6 bullets、具体的データ必須
- ニーズ反映: 顧客ニーズに応える内容を生成

### 9. モバイルレスポンシブ修正
- grid-cols-4 → grid-cols-2 md:grid-cols-4（5ファイル）
- grid-cols-3 → grid-cols-1 sm:grid-cols-3（1ファイル）
- DealDetailModal/CardDetailModal: モバイルフル幅
- pb-12/16 → pb-24（3ファイル）

### 10. クイック入力修正
- coaris_deals_override → dealsStore.updateDeal() に変更
- 案件管理に即反映されるように

### 11. ランキング修正
- ハードコードmemberNames → /api/members から動的取得

## 現在のメンバー（members.json）
```
toki (k.toki@jtravel.group) → owner
ono (ono.dot.think@gmail.com) → owner
```
※ 柏樹・犬飼・和泉・市岡は隊長が設定画面から招待する

## 次セッションでやること

### 優先度高
- [ ] 柏樹・犬飼・和泉・市岡のGmail招待（隊長が設定画面から）
- [ ] MFクラウドAPI接続（販管費実績の自動取得）
- [ ] Kanbanのタッチドラッグ対応（モバイル）
- [ ] coaris_deals_override → tripot_deals_all 統合（旧ストア廃止）

### 優先度中
- [ ] Supabase移行設計（localStorage → DB）
- [ ] グループ全社ランキング（ブリッジAPI連携）
- [ ] iOS Fullscreen API対応（プレゼンモード）
- [ ] 6ヶ月トレンドチャートの過去データ

### 確認済み・動作OK
- [x] Google OAuthログイン（本番）
- [x] 権限制御（owner/manager/member）
- [x] AI生成全機能（Claude API接続済み）
- [x] 事業計画 ↔ 月次ダッシュボード連動
- [x] 翌月見通し（事業計画連動）
- [x] クイック入力 → 案件管理反映
- [x] 招待制メンバー管理
- [x] モバイルレスポンシブ

## 環境設定
### .env.local（Git管理外）
```
AUTH_SECRET=（設定済み）
AUTH_GOOGLE_ID=（設定済み）
AUTH_GOOGLE_SECRET=（設定済み）
ANTHROPIC_API_KEY=（設定済み）
```

### Vercel環境変数
```
AUTH_SECRET → Production + Development
AUTH_GOOGLE_ID → Production + Development
AUTH_GOOGLE_SECRET → Production + Development
ANTHROPIC_API_KEY → Production + Development
NEXTAUTH_URL → Production (https://app-sigma-seven-46.vercel.app)
```
