# セッション引き継ぎ 2026-04-10

## 現在の状態

### ビルド: OK
- 全26ページ ビルド成功（`05d2034`）
- 旧ページ・旧コンポーネント全て生存
- 認証機能（NextAuth + Google OAuth）追加済み

### Git状態
```
05d2034 Restore all pages to working state + add auth (no page replacement)
5639ae9 Phase 5-10: All remaining components (clean rebuild)
5937c93 Phase 5: TaskTab with budget bar, member load, external review flow
```

### やったこと（成功）
- Phase 5-10 の新コンポーネント21ファイル作成（components/production/, attack/, customers/, dashboard/, weekly/, monthly/, layout/, settings/）
- Google OAuth 認証（NextAuth v5 + proxy.ts）
- ロール設計: owner / manager / member
- ページ保護（proxy.ts middleware）
- オンボーディングモーダル
- 認証設計書: `docs/auth-design.md`

### やったこと（失敗→復元済み）
- 旧ページを新コンポーネントに差し替え → **機能消失** → **全復元済み**
- 旧ファイル30個削除 → **全復元済み**
- 消失した機能: DealsContent(4,792行)全機能、AttackContent AIスコアリング、MonthlyReportGeneratorスライド生成、finance/全7ファイル

## 新コンポーネント（作成済み・未接続）

以下のファイルはページに接続されていない。旧ページが稼働中。

```
components/production/CustomerActionPanel.tsx  ← Phase 5
components/production/TemplateSelector.tsx     ← Phase 5
components/attack/AttackForm.tsx               ← Phase 6
components/attack/AttackCard.tsx               ← Phase 6
components/attack/AttackList.tsx               ← Phase 6
components/attack/AttackDetailModal.tsx        ← Phase 6
components/customers/CustomerForm.tsx          ← Phase 6
components/customers/CustomerCard.tsx          ← Phase 6
components/customers/CustomerList.tsx          ← Phase 6
components/customers/CustomerDetailModal.tsx   ← Phase 6
components/dashboard/PersonalDashboard.tsx     ← Phase 7
components/dashboard/PersonalKpiBar.tsx        ← Phase 7
components/dashboard/PersonalActionList.tsx    ← Phase 7
components/weekly/WeeklySummary.tsx            ← Phase 8
components/monthly/MonthlyPl.tsx              ← Phase 9
components/monthly/MonthlyCashFlow.tsx        ← Phase 9
components/monthly/MonthlyProduction.tsx      ← Phase 9
components/monthly/MonthlySummary.tsx         ← Phase 9
components/layout/Sidebar.tsx                 ← Phase 10
components/layout/MemberSwitcher.tsx          ← Phase 10
components/settings/SettingsPanel.tsx         ← Phase 10
```

## 次セッションでやること

### 1. 旧→新の正しい移植手順
旧ファイルを**全行読んで**、機能一覧を作り、新コンポーネントに**1機能ずつ移植**。旧と新を**見比べながら**作業。

### 2. 移植対象（優先順）

| 対象 | 旧ファイル | 行数 | 消失した機能 |
|---|---|---|---|
| **deals** | DealsContent.tsx | 4,792 | 提案書エディタ、見積書、カンバンビュー、請求管理、入金トラッキング、クレーム管理、プロセスタブ、添付ファイル、タイムライン、音声入力、メール送信、制作カード発行 |
| **monthly** | MonthlyReportGenerator.tsx | 904 | 月次報告スライド自動生成、アニメーション、フルスクリーン |
| **monthly** | MonthlyTarget.tsx | 236 | 月次目標管理、達成率ビジュアライズ |
| **attack** | AttackContent.tsx | 598 | AIスコアリング、トラッキング、EightCardインポート、メール送信 |
| **finance** | 7ファイル | 1,994 | 固定費、請求トラッカー、入金照合、支払予定、利益分析、見積精度、最終利益レポート |

### 3. 移植手順（厳守）
1. 旧ファイルを**全行読む**
2. 全機能リストを**書き出す**
3. 新コンポーネントに**全機能が入っているか**確認
4. 足りない機能を**新ストアベースで**追加実装
5. ページのimportを切り替えて**ビルド+動作確認**
6. 隊長に**確認を取ってから**旧ファイルを消す

### 4. 認証のUI統合（移植完了後）
- layout.tsx を認証対応に書き換え（SessionProvider、ロール制御サイドバー）
- home/page.tsx のリダイレクトをセッションベースに
- メンバー切替UI → ログインで確定に変更
- 設定画面にアカウント管理追加（ownerのみ）

## 環境設定

### .env.local（Git管理外）
```
AUTH_SECRET=（設定済み）
AUTH_GOOGLE_ID=（設定済み）
AUTH_GOOGLE_SECRET=（設定済み）
```

### auth.ts のユーザー
```
toki (k.toki@jtravel.group) → owner
ono → owner
kashiwagi → manager
inukai → manager
izumi → member
ichioka → member
```

## 反省
旧ファイルの中身を読まずに差し替え、機能を消失させた。メモリ `feedback_rebuild_lessons.md` と `feedback_never_delete_features.md` に詳細記録済み。二度と同じことはしない。
