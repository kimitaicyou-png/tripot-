# トライポット業務システム クリーンリビルド設計書 v1

最終更新: 2026-04-09
作成者: 美桜（統合）
ソース: システムアーキテクト / ビジネスデザイナー / リスク分析 / UI/UXデザイナー

---

## 0. リビルドの目的

現行システム（120回ロープレ完走・機能検証済み）のコード品質を本番級に引き上げる。
production/page.tsx 2000行超、DealsContent.tsx 4800行超のスパゲッティを、85ファイル・全300行以内に分割再構築。

**成功基準**: 5名全員が日常業務でシステムを迂回せず使っている状態

---

## 1. 設計思想（不変）

```
個人の行動入力 → 週次に自動集計 → 月次に自動集計
報告は書かない。行動データから勝手に上がる。
```

### 案件ライフサイクル
```
アタック → リード → 商談 → 提案 → 見積送付 → 交渉 → 受注
  → 制作中 → 納品 → 検収 → 請求 → 入金 → 完了
     ↓（中止: 選択式6択）
  [中止・振り返り]
```

### デザイン憲章
- font-semibold が最大
- shadow-sm が最大
- text-gray-500 以上
- active:scale-[0.98]
- 日本語UI / コメント禁止
- プライマリ: bg-blue-600

---

## 2. ディレクトリ構造（85ファイル）

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx                 # サイドバー + ヘッダー
│   │   ├── production/page.tsx        # 薄い (30行)
│   │   ├── weekly/page.tsx            # 薄い (30行)
│   │   ├── monthly/page.tsx           # 薄い (30行)
│   │   ├── home/[memberId]/
│   │   │   ├── layout.tsx             # タブ (ダッシュボード/アタック/案件/制作マイタスク)
│   │   │   ├── page.tsx               # 個人ダッシュボード
│   │   │   ├── attack/page.tsx
│   │   │   ├── deals/page.tsx
│   │   │   ├── deals/import/page.tsx
│   │   │   └── production/page.tsx
│   │   ├── customers/page.tsx
│   │   ├── budget/page.tsx
│   │   └── settings/page.tsx
│   └── api/production/ai/route.ts     # Claude API (6アクション)
│
├── components/
│   ├── ui/           # 汎用 (Card, KpiCard, EmptyState, StatusBadge, ProgressBar, AlertList...)
│   ├── production/   # カンバン + カード + モーダル + タブ4つ + アクションパネル
│   ├── deals/        # パイプライン + カード + モーダル + セクション群
│   ├── attack/       # リスト + フォーム
│   ├── home/         # ダッシュボード + マイタスク
│   ├── weekly/       # 営業タブ + 制作タブ + 行動タブ
│   ├── monthly/      # PL + CF + 年次 + 制作
│   └── layout/       # サイドバー + ヘッダー + メンバーパネル
│
├── lib/
│   ├── stores/       # CRUD (dealsStore / productionStore / attackStore / customerStore...)
│   │   └── types.ts  # 全型定義 (~200行)
│   ├── hooks/        # useDeals / useProductionCards / useDealKpi / useWeeklyData...
│   ├── calc/         # dealCalc / productionCalc / plCalc / cfCalc (純粋関数)
│   ├── constants/    # members / vendors / stages / phases / templates
│   ├── format.ts     # yen / percent / delta
│   └── safeMath.ts   # safeDiv / safePercent / safeAvg (0除算ガード)
```

---

## 3. データフロー（1本道）

```
[localStorage]
  tripot_deals_all ──────── /deals (R/W) → /weekly (R) → /monthly (R)
  tripot_production_cards ─ /production (R/W) → /weekly (R) → /monthly (R)
  coaris_attack_list ────── /attack (R/W)
  coaris_customers ──────── /customers (R/W)
```

### 読取フロー
```
page → useDeals() → loadDeals() → localStorage → JSON.parse → 空なら [] → calcKpi() → render
```

### 書込フロー
```
ユーザー操作 → updateDeal() → localStorage.setItem() → setState(loadDeals()) → 再render
```

### 鉄則
- 全localStorage操作は stores/*.ts 経由。コンポーネントから直接 `localStorage.getItem` しない
- 旧キー (`coaris_attack_to_deals`, `coaris_deals_override`) は廃止
- 初回起動時にマイグレーション関数で旧→新キーに移行

---

## 4. 0除算・NaN防止（safeMath.ts）

```typescript
export function safeDiv(n: number, d: number, fallback = 0): number {
  if (d === 0 || !Number.isFinite(d)) return fallback;
  const r = n / d;
  return Number.isFinite(r) ? r : fallback;
}
export function safePercent(part: number, total: number): number {
  return Math.round(safeDiv(part, total) * 100);
}
export function safeAvg(values: number[]): number {
  return values.length === 0 ? 0 : safeDiv(values.reduce((a, b) => a + b, 0), values.length);
}
```

**ルール: 直接 `/` 演算子を使わない。全割り算は safeMath 経由。**

---

## 5. 移植順序（10フェーズ）

| Phase | 内容 | 依存 | 並行可否 |
|-------|------|------|---------|
| 1 | 基盤: types + safeMath + format + constants + UI部品 | なし | Phase 2と並行可 |
| 2 | データストア: stores 8つ | Phase 1 | Phase 1と並行可 |
| 3 | 計算関数 + フック | Phase 2 | — |
| 4 | 案件管理 | Phase 3 | Phase 6と並行可 |
| 5 | 制作管理 | Phase 4 | — |
| 6 | アタック + 顧客 | Phase 3 | Phase 4と並行可 |
| 7 | 個人ダッシュボード | Phase 4,5 | — |
| 8 | 週次 | Phase 4,5 | — |
| 9 | 月次 | Phase 4,5,8 | — |
| 10 | レイアウト + 設定 | Phase 7-9 | — |

**各Phase完了時の確認**: 空状態→データ入力→反映→他ページで表示

---

## 6. 業務フロー（確定）

### 案件ステージ遷移

| ステージ | 入力責任者 | 次への条件 | 必須入力 |
|---------|----------|----------|---------|
| アタック→リード | 営業 | 商談アポ取得 | 企業名, 担当者名, 接触経路, 日付 |
| 商談 | 営業 | ニーズ確認完了 | 商談日, ニーズメモ, 次アクション日 |
| 提案 | 営業 | 顧客が見積依頼 | 提案書ファイル |
| 見積送付 | 営業 | 顧客検討中 | 見積金額, 見積書, 送付日 |
| 受注 | 営業 | 制作引渡し準備 | 受注金額, 受注日, 売上種別 |
| 制作中→リリース | PM | 各フェーズ条件 | フェーズ更新, 進捗% |
| 請求 | 営業 | 入金確認 | 請求日, 請求金額, 支払期日 |
| 入金 | 営業 | アーカイブ | 入金確認日 |
| 中止 | 営業/PM | 振返り入力 | 中止理由(選択式6択) |

### 中止理由（固定6択・フリーテキスト不可）
1. 価格・費用
2. 競合他社に負けた
3. 顧客の予算凍結
4. 仕様が合意できなかった
5. 顧客都合（事業方針変更等）
6. その他

### 外注管理フロー
```
PM: タスク作成(外部) → Gmail/Slack送信 → doing → review
  → 承認 → done (コスト集計対象)
  → 差し戻し → doing (再作業)
```

### 受注額改定フロー
```
顧客追加要件 → アクションログ記録 → 改定フォーム(金額+理由)
  → 10万以内: PM単独確定
  → 10万超: 営業確認後にPMが入力
  → amendments に追記（amount直接上書き禁止）
```

---

## 7. データ連鎖（個人→週次→月次）

### 個人が入力するデータ（これだけ）
- **営業**: 案件ステージ変更, 受注金額, 次アクション, 失注理由
- **PM**: フェーズ変更, 進捗%, タスクステータス, 外注レビュー, アクションログ

### 週次自動集計
- 営業: 商談件数/提案件数/受注件数/受注金額/パイプライン加重/失注数
- 制作: 進行中案件/完了タスク/リスク案件/マイルストーン遅延/外注コスト/予算消化率

### 月次自動集計
- PL: 売上(単発+月額)/外注費/粗利/粗利率
- ファネル: 各ステージ数+転換率+失注理由別
- 制作: 完了案件/外注費実績/メンバーランキング/外注先評価

---

## 8. リスクと対策

| リスク | スコア | 対策 |
|--------|--------|------|
| 🔴 mockデータ再混入 | 48/100 | pre-commitフックで `MOCK_` ブロック |
| 🔴 localStorageキー分散 | 48/100 | stores経由を強制。直叩きをpre-commitで検知 |
| 🔴 テストゼロ | 36/100 | vitest + stores/calc のUnit Test |
| 🟡 localStorage 5MB制限 | 30/100 | catch{}廃止→エラー通知。3MB超で警告 |
| 🟡 機能漏れ | 18/100 | 機能チェックリスト作成 |

### リビルド前の必須アクション
1. pre-commitフック: `MOCK_` / `localStorage.getItem('coaris_')` 検知
2. localStorageキーマップ確定（`tripot_` 統一）
3. `catch {}` 全廃止 → エラー通知に
4. 機能チェックリスト作成

---

## 9. リビルドルール（破ったら結婚）

1. **mockデータ入れない** — 最初からリアルデータ接続
2. **空状態から作る** — データゼロで正しく表示
3. **遷移は最初から繋ぐ** — リンク先が動くことを確認してから次へ
4. **0除算ガードは初手** — safeMath.ts 経由
5. **1ファイル300行以内** — 超えたら分割
6. **`/` 演算子直接使用禁止** — safeDiv 経由
7. **stores経由でlocalStorage操作** — 直叩き禁止
8. **各Phase完了時に空→入力→反映の確認**

---

## 10. 未確定事項（ダーリン確認待ち）

1. 月額案件の売上計上: 毎月自動？毎月手動確認？
2. 新入社員（市岡）のKPI設定: 何ヶ月目から？
3. 外注先の支払いサイト管理: キャッシュフローに反映？
4. assignee複数対応: 代理担当者を設定できるようにする？
5. revenueTarget / grossTarget の管理場所: settingsページ？budgetページ？

---

## 11. UI/UXデザイン

詳細は `docs/design-system.md` に記載。以下はキーポイント。

### アイコン
- **lucide-react** を導入（`npm install lucide-react`）
- 絵文字はタブラベル前のみ。ボタン/テーブル/バッジ/ナビにはlucideアイコン

### カラー
- プライマリ: `bg-blue-600`
- ステータス: emerald(完了) / blue(進行中) / amber(注意) / red(危険) / gray(未着手) / purple(保留)
- フェーズ: 各列に左ボーダー色（gray→blue→indigo→amber→orange→emerald→teal）
- リスク: 左ボーダー2px（blue/amber/red）

### モーダル
- **スライドイン方式**（右からスライド、幅640px）
- フォーカストラップ必須
- animate-[slide-in-right_250ms_ease-out]

### ボタン4種
- プライマリ / ゴースト / デンジャー / アイコン
- 全て `active:scale-[0.98]` + `transition-all duration-150`

### 空状態
- 全画面に専用EmptyStateコンポーネント
- lucideアイコン + 見出し + 説明 + オプションCTAボタン

### トースト通知
- 右上固定、自動消去3000ms
- 成功(emerald) / エラー(red)

### アクセシビリティ
- `focus-visible:ring-2 ring-blue-500 ring-offset-2`
- 色だけで情報を伝えない（ラベル+アイコン併用）
- WCAG AA クリア（全コントラスト比4.5:1以上）

---

## 参照ドキュメント

- 現行コード: `~/projects/coaris/companies/tripot/app/`
- 引き継ぎ: `docs/handoff_v2.md`
- グローバル憲章: `~/.claude/CLAUDE.md`
- メモリ: `~/.claude/projects/-Users-tokikimito-projects-coaris-companies-tripot/memory/`
