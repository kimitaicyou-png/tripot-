# セッション引き継ぎ 2026-04-10（最終版）

## 本番URL
- **Vercel:** https://app-sigma-seven-46.vercel.app
- **GitHub:** https://github.com/kimitaicyou-png/tripot-
- **ログイン:** /login → Google OAuth（k.toki@jtravel.group = owner）

## Google OAuth 設定
- Console: https://console.cloud.google.com/apis/credentials
- リダイレクトURI: `https://app-sigma-seven-46.vercel.app/api/auth/callback/google`
- JavaScript生成元: `https://app-sigma-seven-46.vercel.app`

## 今日やったこと（全量）

### 1. DealsContent リファクタ（4,792行 → 21ファイル）
```
lib/deals/       → types, constants, mockData, dealOverrides, dealContext, attachmentUtils, index
components/deals/ → DealsList, DealDetail, ActionSection, ProposalEditor, SlideRenderer,
                    PresentationView, EstimateEditor, OrderedFlowSection, ProcessTab,
                    InvoiceSection, DealSections, NewDealModal, DealsContent, icons, index
```

### 2. AttackContent リファクタ（598行 → 6ファイル）
```
lib/attack/          → types, scoring, store, constants, index
components/attack/   → AttackContent
```

### 3. 認証UI統合
- SessionProvider をroot layoutに追加
- サイドバー: セッションベースのユーザー表示 + ログアウトボタン
- home/page.tsx: セッションのmemberIdでリダイレクト

### 4. デプロイ
- Vercel環境変数: AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET 設定済み
- GitHub push済み（Git履歴からシークレット除去済み）

## 次セッション: バグ潰し

### 隊長から「まぁまぁある」と報告あり。以下を確認:

**認証まわり**
- [ ] Google OAuthログインが動くか（リダイレクトURI設定確認）
- [ ] ログイン後のダッシュボードリダイレクト
- [ ] ロール制御（member は /budget, /monthly, /weekly にアクセス不可）
- [ ] ログアウト動作

**DealsContent（分割後）**
- [ ] 案件一覧の表示（リスト/カンバン切替）
- [ ] 案件詳細の全タブ（案件詳細/履歴/添付/工程）
- [ ] 提案書エディタ（起承転結 → スライド生成 → プレゼン表示）
- [ ] 見積書エディタ（単価計算 → 予算タブ）
- [ ] 受注後フロー（要件定義 → アサイン → スケジュール → 制作引き渡し）
- [ ] 請求セクション（生成 → Gmail送信 → 入金確認）
- [ ] アクション4タブ（打合せ音声入力 / メールAI生成 / Meet / 電話）

**AttackContent（分割後）**
- [ ] Eightインポート → AIスコアリング
- [ ] ステータス更新 → DealsStoreへの自動追加（商談化/案件化）
- [ ] メール作成モーダル

**データ連動**
- [ ] localStorage の全キーが正しく読み書きされるか
- [ ] ブリッジAPI（/api/bridge/kpi）がDeals/ProductionCardsを正しく集計するか

## 技術的負債（監査で検出済み）
- scoring.ts / OrderedFlowSection.tsx の固定日時 → Date.now() に修正
- InvoiceSection.tsx の銀行口座番号 → 定数化
- サイレント catch → エラーログ追加

## ファイル構成
```
lib/deals/    (7)  ← データ層（サーバー移行時に差替）
lib/attack/   (5)  ← データ層（サーバー移行時に差替）
components/deals/  (14) ← 案件管理UI
components/attack/ (1)  ← アタックリストUI
```
