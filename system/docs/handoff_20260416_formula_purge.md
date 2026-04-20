# 数字化け撲滅戦 完了報告（2026-04-16）

## 背景
「柏樹・和泉の数字ヤバい」の指摘。深堀したら**全画面で数字が嘘**だった。

## 根本原因
1. **担当者マッチング欠陥**: `d.assignee === myName || !d.assignee` で「担当者なし案件が全員に重複計上」
2. **ハードコード粗利率の氾濫**: `0.457` `0.54` `0.543` などが10箇所超に散在
3. **案件別ハードコード粗利率**: `MOCK_GROSS_MARGIN_RATES = {d1: 46, d3: 38...}` など固定値
4. **予算デフォルト値**: `MONTHLY_TARGETS['2026-04']` に過去ダミーデータがハードコード
5. **string型汚染**: `monthlyAmount` が文字列で保存され reduce で連結 → `1.5e30` 爆発

## 実データ検証結果（本番DB）
```
柏樹 久美子 (manager): 15件, 受注4件, 売上 ¥585万
izumi      (member):   2件, 受注2件, 売上 ¥30.5万
土岐 公人   (owner):   0件
小野 隆士   (owner):   0件
担当者なし:             1件
```

## 修正した原則

### 1. 階層整合性
```
個人 → 週次（個人の集まり）→ 月次 → 全社
Σ 個人 = 週次 = 月次 （担当者割当済のみ）
担当者なし = unassignedRevenue 別枠
```

### 2. 担当者マッチング堅牢化
`src/lib/dealsStore.ts` に追加:
- `normalizeAssignee(s)`: 全角/半角空白正規化 + trim
- `matchesAssignee(a, b)`: 完全一致 → 姓一致 の順でマッチ

### 3. 粗利計算のルール
- **実原価（production_cards のタスク原価合計）**のみで計算
- 原価未登録なら **粗利は null** → UI「原価未登録」表示
- ハードコード率によるフォールバック**禁止**

### 4. 予算は budget_plan (localStorage) のみ
- デフォルト値（12000000 等）削除
- 未入力なら 0

## 修正ファイル一覧（19ファイル）

### コアロジック
- `src/lib/dealsStore.ts` — matchesAssignee 追加、calcDealKpi を unassignedRevenue 対応、fallbackCogsRate 注入式
- `src/lib/calc/dealCalc.ts` — 同上
- `src/lib/calc/plCalc.ts` — 0.54 fallback 撤去
- `src/lib/data/company.ts` — MONTHLY_TARGETS 固定値撤去、cogs/sga ハードコード全廃
- `src/lib/data/aggregation.ts` — sga×0.67, grossTarget×0.58 撤去

### 画面
- `src/app/(dashboard)/layout.tsx` — サイドバーKPI 0.457 撤去 + matchesAssignee
- `src/app/(dashboard)/home/[memberId]/layout.tsx` — ヘッダーKPI 0.457 撤去（**本バグの主犯**） + matchesAssignee + 原価未登録表示
- `src/app/(dashboard)/home/[memberId]/page.tsx` — 個人粗利 fallback 撤去 + matchesAssignee
- `src/app/(dashboard)/monthly/page.tsx` — SHOT_RUNNING按分 0.95/0.05 撲滅、CF按分撲滅、12M×0.15撲滅
- `src/app/(dashboard)/monthly/detail/page.tsx` — cogsRate=0.54 撲滅、prodCards連携
- `src/app/(dashboard)/weekly/page.tsx` — 予算を budget_plan から、営業利益式修正、CF按分を請求日ベースに
- `src/app/(dashboard)/budget/page.tsx` — INITIAL_SEGMENTS/COGS/LABOR/ADMIN/HEADCOUNT 全て0に、LAST_YEAR_* も撤去

### コンポーネント
- `src/components/dashboard/PersonalKpiBar.tsx` — GROSS_RATE 撲滅
- `src/components/dashboard/PersonalDashboard.tsx` — matchesAssignee 適用
- `src/components/dashboard/PersonalActionList.tsx` — matchesAssignee 適用
- `src/components/finance/ProfitAnalysis.tsx` — 分岐 costRate 撲滅
- `src/components/finance/InvoiceTracker.tsx` — MOCK_INVOICES 5件撲滅
- `src/components/finance/PaymentReconciliation.tsx` — MOCK_INVOICES 5件撲滅、TODAY固定日撲滅
- `src/components/personal/MonthlyTarget.tsx` — MOCK_TARGET/ACTUAL 全ゼロ化
- `src/components/personal/DealArtifacts.tsx` — MOCK_ARTIFACTS/GROSS_MARGIN_RATES 撲滅
- `src/components/personal/RunningEstimateSection.tsx` — MOCK_RUNNING_ITEMS 撲滅
- `src/components/personal/ProposalPresentation.tsx` — 3M fallback 撤去

### API
- `src/app/api/bridge/kpi/route.ts` — GROSS_MARGIN_RATE=0.457 撲滅、本部向けKPI実原価ベース化
- `src/app/api/bridge/debug/route.ts` — **新設**：メンバー別 assignee マッチ診断API（BRIDGE_API_KEY認証）

## 検証コマンド（本番DB直接確認）
```bash
cd ~/projects/coaris/companies/tripot/app
npx vercel env pull .env.pulled
export $(grep DATABASE_URL= .env.pulled | xargs)
node -e "..."  # 上記メンバー別実績確認
rm .env.pulled
```

## 残課題
- [ ] `production.referenceArtifacts.budget` の命名（計算は正しいが「budget」=原価の意味で誤解を招く）
- [ ] EstimateIntelligence のテンプレ値（業界相場として残置だが要検討）
- [ ] 未割当案件(1件)を誰に割り当てるか要確認（ UI で「要担当者設定」アラート出すべき ）
- [ ] tripot 以外の会社（deraforce, wise-assist）でも同種のハードコードが残ってる可能性 → 別タスクで

## 本番URL
https://tripot-system.vercel.app

## 数字の確認方法
1. https://tripot-system.vercel.app/login でログイン
2. 各メンバーの home に移動
3. 売上が実データに基づくか確認（柏樹=585万、izumi=30.5万、土岐/小野=0）
4. 粗利は「原価未登録」表示（production_cards にタスク原価入れるまで算出されない）
