# 連動マップ（移植前の全体設計図）

## 1. コアデータフロー

```
[ユーザー操作]
     │
     ▼
[localStorage] ──── 19個のキーで全データを永続化
     │
     ▼
[lib層] ──── Store / Calc / Constants / Hooks
     │
     ▼
[Components] ──── 旧コンポーネント（稼働中）+ 新コンポーネント（未接続）
     │
     ▼
[Pages] ──── App Router ページ
```

---

## 2. localStorage キー一覧（全19キー）

| キー | 管理元 | 使用コンポーネント |
|---|---|---|
| `tripot_deals_all` | lib/dealsStore.ts | DealsContent, AttackContent, layout, weekly, monthly, customers, home/[memberId], import |
| `coaris_deals_override` | DealsContent.tsx内 | DealsContent（履歴・添付・プロセス保存） |
| `coaris_attack_to_deals` | lib/dealsStore.ts | AttackContent → DealsContent（商談化連携） |
| `coaris_attack_list` | AttackContent.tsx内 | AttackContent（アタックリスト永続化） |
| `tripot_production_cards` | lib/stores/productionStore.ts | production/page, my-production, weekly, monthly, DealsContent（引き渡し） |
| `coaris_current_member` | lib/currentMember.ts | layout, 全ページ, Sidebar, MemberSwitcher |
| `coaris_customers` | lib/stores/customerStore.ts | customers/page, DealsContent（メール宛先取得） |
| `coaris_email_logs` | lib/emailLog.ts | DealsContent（メール送信）, RecentContactsStrip, customers |
| `coaris_external_partners` | lib/externalPartners.ts | DealsContent（ProcessTab: 外部パートナーアサイン） |
| `coaris_notifications` | lib/notifications.ts | NotificationCenter, DealsContent（引き渡し通知） |
| `coaris_notifications_seeded_v1` | lib/notifications.ts | NotificationCenter（初期データ投入フラグ） |
| `tripot_committed_tasks` | lib/committedTasks.ts | weekly/page |
| `tripot_production_status` | production/page.tsx内 | production/page |
| `coaris_fiscal_start_month` | settings/page.tsx内 | settings, monthly |
| `budget_plan` | budget/page.tsx内 | budget/page |
| `coaris_needs_{dealId}` | DealsContent.tsx内 | DealsContent（ニーズ→提案書連携） |
| `PROD_TASK_ASSIGNEES_KEY` | production/page.tsx内 | production/page |
| `PROD_TASK_STATUS_KEY` | production/page.tsx内 | production/page |
| `tripot_data_reset` | lib/resetFlag.ts | layout（リセットフラグ） |

---

## 3. ファイル間連動マップ（★ = 移植対象）

### 3-A. DealsContent.tsx ★ の全連動

```
DealsContent.tsx (4,792行)
├── imports from lib/
│   ├── dealsStore.ts ─────── loadAllDeals, saveAllDeals
│   ├── productionCards.ts ── addProductionCard, buildProductionCard, updateProductionCard
│   ├── emailLog.ts ───────── logEmailSent, getEmailLogsByContext
│   ├── externalPartners.ts ─ getPartners, addPartner
│   ├── currentMember.ts ──── MEMBERS
│   └── notifications.ts ──── sendNotification
│
├── imports from components/personal/
│   ├── DealArtifacts.tsx ──── MOCK_ARTIFACTS, MOCK_GROSS_MARGIN_RATES
│   ├── NextAction.tsx ─────── NextActionData
│   ├── RunningEstimateSection ─ MOCK_RUNNING_ITEMS, RunningItem
│   ├── ContractManager.tsx
│   ├── LostDealRecord.tsx ── LostReason, REASON_LABEL
│   ├── ProposalVersions.tsx
│   ├── ProposalPresentation.tsx
│   └── InternalComments.tsx ─ MOCK_COMMENTS
│
├── imports from components/ui/
│   └── KanbanBoard.tsx ───── KanbanColumn, KanbanCard
│
├── imported BY (= これを使ってるページ/コンポ)
│   ├── app/(dashboard)/home/[memberId]/deals/page.tsx ← メインページ
│   ├── components/personal/TodayProgressCTA.tsx ← Deal型, MOCK_DEALS_INIT
│   ├── components/personal/PhotoDealCapture.tsx ← Deal型
│   ├── app/(dashboard)/customers/page.tsx ← Deal型
│   ├── app/(dashboard)/home/[memberId]/deals/import/page.tsx ← Deal型
│   └── lib/dealsStore.ts ← MOCK_DEALS_INIT, Deal型
│
└── localStorage 操作
    ├── tripot_deals_all（読み書き: saveAllDeals経由）
    ├── coaris_deals_override（直接読み書き: 履歴・添付・プロセス）
    ├── coaris_needs_{dealId}（直接読み書き: ニーズ保存）
    ├── coaris_customers（読み取り: メール宛先検索）
    └── coaris_email_logs（書き込み: logEmailSent経由）
```

### 3-B. AttackContent.tsx ★ の全連動

```
AttackContent.tsx (598行)
├── imports from lib/
│   └── dealsStore.ts ── loadAllDeals, addDeal, updateDeal
│
├── imported BY
│   └── app/(dashboard)/home/[memberId]/attack/page.tsx
│
├── localStorage 操作
│   ├── coaris_attack_list（直接読み書き: アタックリスト）
│   └── tripot_deals_all（dealsStore経由: 商談化・案件化時に追加）
│
└── データ連動
    └── AttackTarget → status='meeting'/'dealt' → dealsStoreにDeal追加
        → DealsContent側で見える（案件一覧に出る）
```

### 3-C. MonthlyReportGenerator.tsx ★ の全連動

```
MonthlyReportGenerator.tsx (904行)
├── imports: React のみ（外部依存なし）
│   ※ 引き継ぎ書では calc/ を参照とあるが、実際のコードは
│     データをハードコードでスライド生成している（計算ライブラリ未接続）
│
├── imported BY
│   └── app/(dashboard)/monthly/page.tsx
│
└── localStorage 操作
    └── なし（props で monthLabel を受け取るのみ）
```

### 3-D. MonthlyTarget.tsx ★ の全連動

```
MonthlyTarget.tsx (236行)
├── imports: React のみ
│
├── exports（型とモックデータ）
│   ├── MonthlyTarget型, MonthlyActual型
│   ├── MOCK_TARGET, MOCK_ACTUAL
│   └── MonthlyTarget コンポーネント
│
├── imported BY
│   └── app/(dashboard)/monthly/page.tsx
│
└── localStorage 操作: なし
```

### 3-E. finance/ 7ファイル ★ の全連動

```
finance/ (計1,994行)
├── 各ファイルの imports: React のみ（外部依存なし、自己完結型）
│
├── imported BY
│   └── app/(dashboard)/layout.tsx（一部タブ切替で表示）
│   └── 各ページから直接 import される可能性あり
│
└── localStorage 操作
    └── なし（props でデータを受け取る設計、一部はMOCKデータ内蔵）
```

---

## 4. 新コンポーネント（未接続）の対応関係

| 新コンポーネント | 対応する旧機能 | 旧ファイル |
|---|---|---|
| components/attack/AttackForm.tsx | Eight取込 + カード入力 | AttackContent.tsx |
| components/attack/AttackCard.tsx | スコアカード表示 | AttackContent.tsx |
| components/attack/AttackList.tsx | リスト + フィルタ | AttackContent.tsx |
| components/attack/AttackDetailModal.tsx | 詳細モーダル | AttackContent.tsx |
| components/customers/CustomerForm.tsx | 顧客入力 | customers/page.tsx |
| components/customers/CustomerCard.tsx | 顧客カード | customers/page.tsx |
| components/customers/CustomerList.tsx | 顧客リスト | customers/page.tsx |
| components/customers/CustomerDetailModal.tsx | 顧客詳細 | customers/page.tsx |
| components/dashboard/PersonalDashboard.tsx | 個人ダッシュ | home/[memberId]/page.tsx |
| components/dashboard/PersonalKpiBar.tsx | KPIバー | home/[memberId]/page.tsx |
| components/dashboard/PersonalActionList.tsx | アクション一覧 | home/[memberId]/page.tsx |
| components/weekly/WeeklySummary.tsx | 週次サマリ | weekly/page.tsx |
| components/monthly/MonthlyPl.tsx | 月次P/L | monthly/page.tsx |
| components/monthly/MonthlyCashFlow.tsx | 月次C/F | monthly/page.tsx |
| components/monthly/MonthlyProduction.tsx | 月次制作 | monthly/page.tsx |
| components/monthly/MonthlySummary.tsx | 月次サマリ | monthly/page.tsx |
| components/layout/Sidebar.tsx | サイドバー | layout.tsx |
| components/layout/MemberSwitcher.tsx | メンバー切替 | layout.tsx |
| components/settings/SettingsPanel.tsx | 設定 | settings/page.tsx |
| components/production/CustomerActionPanel.tsx | 顧客アクション | production/page.tsx |
| components/production/TemplateSelector.tsx | テンプレート選択 | production/page.tsx |

---

## 5. クリティカルパス（壊すと全体が死ぬ）

### 絶対に触ってはいけないファイル
1. **lib/dealsStore.ts** — 全ページが依存。型もここから export
2. **lib/productionCards.ts** — production系全体 + DealsContent
3. **lib/currentMember.ts** — 全ページのメンバー判定
4. **lib/constants/stages.ts** — ステージ表示の全元ネタ
5. **lib/safeMath.ts** — 計算系全体

### 移植時に必ず維持する接続
1. DealsContent → dealsStore.loadAllDeals/saveAllDeals（案件永続化）
2. DealsContent → productionCards.addProductionCard（制作引き渡し）
3. DealsContent → notifications.sendNotification（引き渡し通知）
4. AttackContent → dealsStore.addDeal（商談化・案件化）
5. MonthlyReportGenerator → monthly/page.tsx（onClose, monthLabel props）

---

## 6. 移植方針

### 原則
- 旧ファイルは**消さない**（新ファイルに全機能移植完了し、隊長確認後に初めて消す）
- lib/ 層は**一切変更しない**（旧コンポーネントと同じ接続を新でも使う）
- localStorage キーは**一切変更しない**（データ互換性維持）
- 新コンポーネントが旧と同じ機能を持つまで、ページのimportは切り替えない

### 移植順序
1. **DealsContent** — 最大・最多連動。これが動けば残りは楽
2. **AttackContent** — DealsStoreとの連動が必須
3. **MonthlyReportGenerator** — 独立性高い（外部依存なし）
4. **MonthlyTarget** — 独立性最高
5. **finance/ 7ファイル** — 独立性最高（自己完結型）
