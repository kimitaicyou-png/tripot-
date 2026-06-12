# CHANGELOG — coaris-tripot-v2

> フォーマット: [Keep a Changelog](https://keepachangelog.com/ja/) 準拠  
> バージョン管理: [Semantic Versioning](https://semver.org/lang/ja/)

---

## [Unreleased]

### 追加予定
- G2: 月別週グリッド view（案件×週マトリクス）
- G7: 1画面で全案件編集モード
- MoneyForward Cloud 接続（販管費実績の自動取得）

---

## [3.2.0] - 2026-06-07

### 追加
- セキュリティヘッダ 3 本（CSP / HSTS / Permissions-Policy）を next.config.ts の headers() に追加
- npm audit スクリプト 2 本追加（`audit` / `audit:report`）、`verify` コマンドに組込み
- docs/SLA-template.md 新規作成（稼働率・応答時間・障害対応時間・保守範囲の雛形）
- docs/adr/0014-ai-prompts-externalize.md 新規作成（プロンプト外出し設計・移行4フェーズ定義）
- scripts/init-company.sh 新規作成（新社展開 rsync + config 書き換えの自動化）
- .github/workflows/ci.yml 新規作成（型チェック・Lint・テスト・ビルドの CI パイプライン）
- CHANGELOG.md 新規作成（本ファイル）

### 変更
- npm audit で critical ゼロを verify の合格基準に設定（high 2 本は breaking change のため audit:report で別管理）

---

## [3.1.0] - 2026-05-28

### 追加
- 案件一覧に削除ボタン（president 限定・soft delete）
- エラー画面に詳細表示＋コピーボタン
- /settings/members 画面：招待・一覧・役割変更・無効化
- 案件詳細に「送る」ボタン（URL コピー / メーラー起動）
- ヨミ予測売上 実測キャリブレーション UI

### 修正
- 行動量集計に メール/訪問/その他 を反映（weekly/monthly/home）
- morning-brief 旧 output 形式で focus.length TypeError 修正
- AI 出力に「生成時点スナップショット／確度の正は主観確度」注記
- 通知 確認後ラグ + サイドバー未読バッジ更新
- 招待済メンバーは ALLOWED_DOMAINS 制限を skip（石田アクセスブロック修正）
- 503リトライ + 確度ズレ revalidate 統一 + 必須バリデーション
- 日付統一 helper 正本確立（formatDate/formatDateTime、JST固定）

---

## [3.0.0] - 2026-05-27

### 追加
- 案件詳細：週グリッド view + inline 編集 + 週セル click popover
- 見積に「メールで送る」ボタン（mailto: prefill）
- 「次やること」pin + 担当 inline 編集
- ヨミ予測売上 ハイブリッド化
- inline action 4 種に edge case テスト 16 件追加

### 修正
- 案件詳細ページ「スクロール深い」改善（補助3セクションを折りたたみ）
- 議事録ページ集約感改善 + アクション順序整理

---

## [2.5.0] - 2026-05-26

### 追加
- G3: 主観確度（A〜E ＋ 想定/継続）— migration 適用済（Neon prod）
- ページネーション 3 ページ（/deals + /customers + /tasks、各 50 件）
- /search 9 種拡張（案件/顧客/タスク/議事録/メンバー/行動/提案/見積/請求）
- /customers 検索 + /tasks フィルタ SQL 化

---

## [2.0.0] - 2026-05-20

### 追加
- AI 結果の自動再表示（risk-score / next-action / morning-brief）
- WelcomeFirstSteps + 経験者用切替トグル（`?welcome=1`）
- 録音＋文字起こし（Web Speech API、Chrome/Safari/Edge）
- 議事録 → 検収マーク UI（delivered → acceptance 連動）
- generate-estimate / generate-requirement / generate-budget / generate-sitemap 復活
- Kanban ドラッグ&ドロップ（@dnd-kit、楽観的更新＋後退しないルール）

### 変更
- 全 AI ルートを callText / callJson 標準ラッパーに統一
- format helpers 全面集約（formatYen/Man/ShortYen/YenOrDash、旧31ファイルの重複ゼロ）
- ロール体系統一（president / hq_member / member）
- ステージ自動進行 7 段完成（prospect→proposing のみ手動）

---

## [1.5.0] - 2026-05-05

### 追加
- 本番 deploy 完了（tripot-v2-coaris.vercel.app）
- Google OAuth v2 稼働（Vercel env 投入済）
- Neon tripot-v2 branch：migrations 0000-0003 全適用
- 36 Action ファイル全件 requirePermission 適用（Phase 11-B）
- RLS 57 policies 適用（setup-rls.sql）
- audit_logs immutable 化（setup-audit-immutable.sql）
- rbac seed 必須化（seed-rbac.ts / test-rbac.ts 9/9）
- vitest 基盤 86 テスト全通過

### 修正
- role_permissions seed 漏れ（本番で hq_member/member が全権限なしになる問題）→ 13社展開チェックリスト Step 4-3 に必須化

---

## [1.0.0] - 2026-04-25

### 追加
- Next.js 16 App Router + React 19 + TypeScript strict + Tailwind CSS v4
- NextAuth v5 beta（Google OAuth、招待制 members table）
- drizzle-orm + Neon PostgreSQL
- coaris.config.ts（13社展開テンプレ基盤）
- /api/bridge/kpi（本部 KPI 集約 API）
- 案件管理 Kanban + List 切替
- /home/[memberId] 個人ダッシュボード
- /monthly + /weekly + /budget 財務画面（粗利→営業利益→売上 哲学）

---

*coaris-tripot-v2 / 13社展開リファレンス実装 / コアリス HD*
