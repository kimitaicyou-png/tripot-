# コアリスUI — 業務画面デザインパターン集 v1

> `design-system.md`（プリンシプル / トークン / コンポーネント）の補完。
> こちらは「コンポーネントを **業務画面** にどう組み立てるか」の典型集。
> tripot v2 の 25 routes から逆引きで抽出した、実在するパターンだけを記載。
>
> 参照：Atlassian Design System Patterns / SAP Fiori Floorplans
> 最終更新：2026-04-26 by 🌸美桜 ＋ ❄️美冬

---

## 0. このドキュメントの位置づけ

3層構造の真ん中。

```
プリンシプル（design-system.md §1）   ← なぜそうするか
   ↓
トークン・コンポーネント（design-system.md §2-3）   ← 部品
   ↓
★ パターン（このファイル）   ← 部品を画面にする組み立て規則
   ↓
画面実装（src/app/.../page.tsx）   ← 個別画面
```

**派生時の使い方**：他社（deraforce / wise-assist 等）に展開する時、まず「これは何パターンの画面か」を判定 → このファイルの構成を骨にする → 業務固有の差分だけ調整。**毎回ゼロから設計しない**。

---

## 1. ページレイアウトの4形

すべてのダッシュボード配下は、この4形のどれかに収まる。

### 形A：**Dashboard**（俯瞰 → KPI → 内訳）

**用途**：ページを開いた瞬間に「いい/やばい」を判定させる。3秒判断の主役。

**構成**：
```
PageHeader（eyebrow + 大見出し + back）
 ↓
HeroValue（h1相当の serif italic 数値、ページの主役KPI 1つ）
 ↓
StatCard × 4（補助KPI、grid-cols-2 md:grid-cols-4、tone で状態表現）
 ↓
SectionHeading（次セクションへの橋渡し、count や action 付き）
 ↓
内訳・ドリルダウン要素（バーチャート / カードグリッド / Link 行）
```

**使われている画面**：
- [home/[memberId]](src/app/(dashboard)/home/[memberId]/page.tsx)（個人ダッシュ）
- [weekly](src/app/(dashboard)/weekly/page.tsx)（会社全体売上 + メンバー別）
- [weekly/cf](src/app/(dashboard)/weekly/cf/page.tsx)（6週CF予測）
- [monthly](src/app/(dashboard)/monthly/page.tsx)（月次P/L）
- [monthly/detail/[yearMonth]](src/app/(dashboard)/monthly/detail/[yearMonth]/page.tsx)（月ドリルダウン）
- [budget](src/app/(dashboard)/budget/page.tsx)（年予算 → 12月）

**必須ルール**：
- HeroValue は **1ページ1つだけ**。複数置くと焦点がぼける
- StatCard は 3〜4個が黄金。5個以上なら SectionHeading で区切る
- 数値はすべて `tabular-nums` + Instrument Serif italic（見出しは Manrope semibold）

### 形B：**List**（サマリ → 一覧）

**用途**：複数アイテムを「サマリ → 個別行」の順で見せる。

**構成**：
```
PageHeader（actions に「+ 新規」ボタン）
 ↓
StatCard × 3（合計・残・期限切れ等のサマリ）
 ↓
SectionHeading × N（カテゴリ分け、例：TODO / DONE / 期限切れ）
 ↓
アイテム行（DataTable rowHref or 個別 Link カード）
 ↓
EmptyState（0件時、次のアクションを CTA で提示）
```

**使われている画面**：
- [customers](src/app/(dashboard)/customers/page.tsx)
- [tasks](src/app/(dashboard)/tasks/page.tsx)
- [team](src/app/(dashboard)/team/page.tsx)
- [deals](src/app/(dashboard)/deals/page.tsx)（ステージ別セクション分け）
- [approval](src/app/(dashboard)/approval/page.tsx)（pending / 自分申請 / 履歴）

**必須ルール**：
- 1セクション 0件なら **必ず EmptyState**（スカスカは認知負荷を上げる）
- 行クリックで詳細遷移 → DataTable の `rowHref` か Link で
- フィルター UI は当面不要（業務件数が増えたら 5月以降に Combobox 追加）

### 形C：**Detail**（メタ → 関連リスト → アクション）

**用途**：1アイテムの全情報と、紐づくアクションを集約。

**構成**：
```
PageHeader（back link 必須、actions に「編集」「削除」）
 ↓
StatCard × 2-3（金額・ステージ・期限などの主要メタ）
 ↓
SectionHeading + 関連リスト 1（紐づくタスク等）
 ↓
SectionHeading + 関連リスト 2（行動履歴等、action prop に inline Quick Action）
```

**使われている画面**：
- [deals/[dealId]](src/app/(dashboard)/deals/[dealId]/page.tsx)
- [customers/[customerId]](src/app/(dashboard)/customers/[customerId]/page.tsx)
- [tasks/[taskId]](src/app/(dashboard)/tasks/[taskId]/page.tsx)
- [team/[memberId]](src/app/(dashboard)/team/[memberId]/page.tsx)

**必須ルール**：
- back link は **常に左上**（`PageHeader` の `back` prop）
- 「編集」「削除」は **PageHeader actions**（本文中に置かない）
- 関連リストの SectionHeading に **inline Quick Action**（例：行動履歴に LogActionButton variant="inline"）

### 形D：**Edit**（フォーム → 確認 → 戻る）

**用途**：作成・編集・削除のフォーム。

**構成**：
```
PageHeader（back link 必須、subtitle で対象アイテム名）
 ↓
form（Server Action 直結、useActionState）
  └─ FormField × N（label + 入力 + error）
  └─ FormActions（右寄せ：「キャンセル」secondary + 「保存」primary）
```

**使われている画面**：
- [deals/new](src/app/(dashboard)/deals/new/page.tsx) / [deals/[dealId]/edit](src/app/(dashboard)/deals/[dealId]/edit/page.tsx)
- [customers/new](src/app/(dashboard)/customers/new/page.tsx) / [customers/[customerId]/edit](src/app/(dashboard)/customers/[customerId]/edit/page.tsx)
- [tasks/new](src/app/(dashboard)/tasks/new/page.tsx) / [tasks/[taskId]/edit](src/app/(dashboard)/tasks/[taskId]/edit/page.tsx)

**必須ルール**：
- フォーム要素は **必ず `FormField` ラッパー**（直に `<input>` 書かない）
- 入力は **必ず `TextInput` / `Select` / `TextArea`**（Tailwind class を直書きしない）
- ボタンは **必ず `Button`**（`variant="primary"` / `variant="secondary"`）
- 削除は **`variant="danger"` + 確認 Dialog**（次節 §3-D）

---

## 2. データ表示の6パターン

### 2-1. **Hero Value**（ページ主役の単一KPI）

```tsx
<HeroValue
  label="今週の会社全体売上"
  value={formatYen(totalRevenue)}
  sub="先週比 +12%"
  tone="up"
/>
```

- ページに1つだけ
- 単位（¥/万/件）は label か value に明示
- tone：default / up（緑）/ down（赤）/ accent（琥珀＝未確定・進行中）

### 2-2. **Stat Card グリッド**（補助KPI 4枚）

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <StatCard label="進行中案件" value="12件" tone="default" />
  <StatCard label="今月入金" value={formatYen(paid)} sub="vs計画 102%" tone="up" />
  <StatCard label="残営業日" value="3日" tone="down" />
  <StatCard label="承認待ち" value="2件" tone="accent" />
</div>
```

- グリッドは 2x2 (mobile) → 1x4 (desktop)
- tone は **状態のある時だけ**（達成率 / 期限 / フラグ等）。装飾目的の tone は禁止

### 2-3. **Bar Comparison**（横棒比較）

CF予測・メンバー別売上などで使う「実績 vs 上限」の横棒。

```tsx
<div className="flex items-center gap-3">
  <span className="w-24 text-sm text-muted">{member.name}</span>
  <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
    <div
      className="h-full bg-ink"
      style={{ width: `${(member.value / max) * 100}%` }}
    />
  </div>
  <span className="font-mono tabular-nums text-sm">{formatYen(member.value)}</span>
</div>
```

- 5月以降の Carbon 参照拡張で `<HorizontalBar />` コンポにする予定（v1 では各画面に手書きOK）

### 2-4. **Stage Color Mapping**（ステージカラー帯）

deals / weekly/cf / monthly/detail で「案件ステージを色帯で示す」パターン。

```tsx
const STAGE_TONE: Record<string, BadgeTone> = {
  prospect: 'neutral',
  proposing: 'info',
  ordered: 'accent',
  in_production: 'accent',
  delivered: 'up',
  acceptance: 'up',
  invoiced: 'up',
  paid: 'up',
  lost: 'down',
};

<Badge tone={STAGE_TONE[deal.stage]}>{STAGE_LABEL[deal.stage]}</Badge>
```

- ステージ → tone の Record を **画面ごとに手書きしない**（共通化候補、次の commit で `lib/stage.ts` に集約予定）

### 2-5. **DataTable**（汎用テーブル）

```tsx
<DataTable
  columns={[
    { key: 'name', header: '顧客名', cell: (r) => r.name },
    { key: 'count', header: '案件数', cell: (r) => r.count, align: 'right' },
    { key: 'amount', header: '入金累計', cell: (r) => formatYen(r.amount), align: 'right' },
  ]}
  rows={customers}
  keyOf={(r) => r.id}
  rowHref={(r) => `/customers/${r.id}`}
  empty="顧客がまだ登録されていません"
/>
```

- 数値カラムは `align: 'right'`（自動で `tabular-nums` 適用）
- 行クリックで遷移するなら `rowHref` を必ず指定（hover state が出る）
- 件数 50 件以下まで。それ以上はページネーション or 検索 UI（v2 後）

### 2-6. **Empty State**

```tsx
<EmptyState
  icon="📋"
  title="まだタスクがありません"
  description="案件詳細から「+ タスク追加」で起票できます"
  action={<LinkButton href="/deals">案件一覧へ</LinkButton>}
/>
```

- 必ず **次のアクション**を CTA で提示する（停止画面にしない）
- icon は絵文字1つ。SVG アイコンは v1 では使わない

---

## 3. アクション・操作の5パターン

### 3-A. **Floating Quick Action**（FAB）

ホームの行動入力ボタン。常時画面右下固定。

```tsx
<LogActionButton variant="fixed" />
```

- 1画面1個まで
- ホーム以外では基本使わない（List / Detail では inline 推奨）

### 3-B. **Inline Quick Action**

SectionHeading の action prop に置く、文脈付き Quick Action。

```tsx
<SectionHeading
  title="行動履歴"
  count={actions.length}
  action={<LogActionButton dealId={dealId} variant="inline" label="＋ この案件で記録" />}
/>
```

- Detail ページの関連リストに最適
- ボタン label に **どの文脈かを明示**（「＋ この案件で記録」/「＋ タスク追加」等）

### 3-C. **Modal Form**

Dialog + Form + Server Action の組み合わせ。

```tsx
<Dialog open={open} onClose={() => setOpen(false)} size="md">
  <DialogHeader title="行動を記録" onClose={() => setOpen(false)} />
  <form action={formAction}>
    <DialogBody>
      <FormField label="種別" required><Select name="type" options={ACTION_TYPES} /></FormField>
      <FormField label="メモ"><TextArea name="memo" /></FormField>
    </DialogBody>
    <DialogFooter>
      <Button variant="secondary" onClick={() => setOpen(false)}>キャンセル</Button>
      <Button type="submit" disabled={isPending}>記録</Button>
    </DialogFooter>
  </form>
</Dialog>
```

- ESC + 背景タップで close（Dialog コンポが面倒見る）
- Server Action は `useActionState` で type-safe に
- submit 完了後は `router.refresh()` or `revalidatePath()`

### 3-D. **Destructive Confirm**（削除）

```tsx
<Button variant="danger" onClick={() => setConfirmOpen(true)}>削除</Button>

<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} size="sm">
  <DialogHeader title="本当に削除しますか？" onClose={...} />
  <DialogBody>
    <p className="text-sm text-muted">「{name}」を削除します。この操作は元に戻せません。</p>
  </DialogBody>
  <DialogFooter>
    <Button variant="secondary" onClick={() => setConfirmOpen(false)}>キャンセル</Button>
    <Button variant="danger" onClick={handleDelete}>削除する</Button>
  </DialogFooter>
</Dialog>
```

- 削除は **必ず確認 Dialog**（直リンクで即削除しない）
- 削除後は親ページに戻る（`router.push(parentHref)`）

### 3-E. **Tabs サブナビ**

ページ内で同じ主題を別視点で切り替える。

```tsx
<Tabs defaultValue="actions">
  <TabsList>
    <TabsTrigger value="actions" count={3}>行動量</TabsTrigger>
    <TabsTrigger value="cf">CF予測</TabsTrigger>
  </TabsList>
  <TabsContent value="actions">{/* 行動量画面 */}</TabsContent>
  <TabsContent value="cf">{/* CF予測画面 */}</TabsContent>
</Tabs>
```

- 1画面に1つまで
- weekly のように **URL も切り替える**場合は、Tabs を usePathname 駆動の薄ラッパーで包む（`weekly/_components/tabs.tsx` 参照）

---

## 4. ステータスとカラーの規約（最重要）

業務システムは色で判断させるので、**色の意味は絶対固定**。

| 状態 | tone | カラー | 使用例 |
|---|---|---|---|
| 確定・達成 | `up` | green-600 / green-50 | 入金済 / 達成率 ≥100% / 完了 |
| 未達・期限超過・失注 | `down` | red-600 / red-50 | 残営業日 ≤3 / 達成率 <80% / 期限切れ / 失注 |
| 進行中・未確定・要注意 | `accent` | amber-700 / amber-50 | パイプライン / CF予測 / 承認待ち / 制作中 |
| 情報・標準 | `info` | blue-700 / blue-50 | 提案中 / 案内ラベル |
| 中性・カウント | `neutral` | slate-100 / muted | 件数バッジ / 見込み |

**禁則**：
- ❌ `up` を「進行中」に使う（達成感の誤発信）
- ❌ `down` を「終了」に使う（失敗と混同）
- ❌ accent を装飾目的に使う（金色は「重要だが未確定」専用）

---

## 5. 派生時の再現順序

新しい会社（deraforce / wise-assist 等）に派生する時、この順序で組み立てる。**飛ばさない**。

```
Step 1：会社固有のステージ Record / カラーマップを定義（lib/stage.ts）
Step 2：home（形A：個人ダッシュ）を作る ← 3秒判断の核を最初に固める
Step 3：deals（形B：List）と deals/[id]（形C：Detail）を作る ← 業務の主動線
Step 4：tasks / customers（形B + 形C）を deals に習って複製
Step 5：weekly / monthly（形A：会社俯瞰）を組む
Step 6：approval / budget は会社運用が固まってから（最後でいい）
```

**派生時の判断**：
- 業界で必須のメタ項目（建設業の協力業者・製造業の工程など）は、形C（Detail）の StatCard セクションに追加する。形そのものは変えない
- 業界固有の集計（建設業のCF6週など）は、形A の HeroValue + StatCard で表現する。新コンポは作らない（v1 では）

---

## 6. やらないこと（パターン編アンチパターン）

- ❌ ページに HeroValue を2つ置く（焦点がぼける）
- ❌ List ページに HeroValue（ダッシュボードと役割が衝突）
- ❌ Edit ページに大きな数値表示（フォームに集中させる）
- ❌ Detail ページの本文中に「編集」ボタン（PageHeader actions に集約）
- ❌ 確認 Dialog なしの削除（事故の元）
- ❌ Tabs で URL を変えない実装（戻るで戻れない）
- ❌ EmptyState なしの 0件表示（次のアクションを失う）
- ❌ tone を装飾目的で使う（色の意味が壊れる）

---

## 7. v2 後の拡張候補

- **Multi-step Form**（案件登録ウィザード）
- **Bulk Action**（複数選択 + 一括承認等）
- **Saved View**（フィルター状態を URL に持つ）
- **Comments / Activity Stream**（案件の議論履歴）
- **Notification Center**（Toaster の上位、永続化通知）

これらは「業務件数が増えたら必要になる」もの。今は実装しない。

---

*このパターン集は tripot v2 から逆引きで起こした。100社展開時はここを写経すれば「コアリスらしい画面」が作れる。書き換える時は、まず実装を1つ作ってから書き換える（パターンが先行すると現実とズレる）。*
