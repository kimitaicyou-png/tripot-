# コアリスUI — システムデザイン基準書 v1

> tripot v2 が基準値プロジェクト。ここで確立した設計判断が13社→100社への展開の土台になる。
> 参照先：Atlassian Design System（思想の芯）+ SAP Fiori（密度感のリファレンス）
> 最終更新：2026-04-26 by ❄️美冬 ＋ 🌸美桜
>
> **関連ドキュメント**：
> - [`design-patterns.md`](./design-patterns.md) — 業務画面のレイアウトパターン集（Dashboard/List/Detail/Edit の4形 + 操作パターン）

---

## 1. デザインプリンシプル（3原則）

### P1: 3秒判断
**「画面を開いた瞬間に"いい/やばい"が分かる」**

- ヒーロー数値は h1 相当の serif italic で最大化。ページの目的は1つ
- KPI色（up=緑/down=赤/accent=琥珀）はトークン固定。慣れれば色だけで状態が分かる
- テキストや装飾で補完しない。数字とトーンで語る

### P2: 行動の痕跡が見える
**「個人の行動が経営数字になる流れを画面で追える」**

- 行動ログ → weekly → monthly → budget の縦串を壊さない
- ドリルダウンは1タップ。詳細と一覧を行き来させる
- 空の状態（EmptyState）はネガティブじゃない。次のアクションを提示する

### P3: 業務の疲れを増やさない
**「情報密度を上げても、認知負荷を上げない」**

- eyebrow（小さいUppercase）→ 本文 の2層構造で文脈を先に渡す
- SectionHeading で画面を「意味のある塊」に分ける
- フォームは FormField ラッパーで label/error を統一。視線移動を減らす

---

## 2. デザイントークン

### カラー

| トークン | 値 | 用途 |
|---|---|---|
| `ink` | `#0F172A` | 本文・見出し・プライマリボタン背景 |
| `ink-mid` | `#1E293B` | hover state |
| `muted` | `#475569` | サブテキスト・副次情報 |
| `subtle` | `#64748B` | プレースホルダ・eyebrow（最小グレー） |
| `surface` | `#FAFAFA` | ページ背景 |
| `card` | `#FFFFFF` | カード背景 |
| `border` | `#E2E8F0` | ボーダー全般 |
| `kpi-up` | `#16A34A` | 達成・プラス（green-600） |
| `kpi-down` | `#DC2626` | 未達・マイナス（red-600） |
| accent（amber-700） | `#B45309` | 進行中・未確定（パイプライン・CF予測） |

**グレー最小ルール**：本文・補足テキストは `subtle`（slate-500）以上のみ。それ未満はアイコンや装飾専用。

### タイポグラフィ

| 用途 | フォント | クラス例 |
|---|---|---|
| ヒーロー数値 | Instrument Serif italic | `font-serif italic text-6xl md:text-8xl tabular-nums tracking-tight` |
| カード数値 | Instrument Serif italic | `font-serif italic text-3xl md:text-4xl tabular-nums` |
| 見出し h1 | Manrope semibold | `text-2xl md:text-3xl font-semibold tracking-tight` |
| 見出し h3 | Manrope semibold | `text-base font-semibold` |
| eyebrow | Manrope medium | `text-xs uppercase tracking-widest font-medium` |
| 本文 | Manrope regular | `text-sm` |
| 数値（モノ） | JetBrains Mono | `font-mono tabular-nums` |

**絶対ルール**：`font-bold` は使わない。最大は `font-semibold`。

### シャドウ・角丸

| 用途 | 値 |
|---|---|
| シャドウ | `shadow-sm`（0 1px 3px rgba 4%）のみ。`shadow-md` 以上禁止 |
| カード角丸 | `rounded-xl`（12px） |
| ボタン・入力 | `rounded-lg`（8px） |

---

## 3. コンポーネントカタログ

### データ表示系

| コンポーネント | ファイル | 用途 |
|---|---|---|
| `HeroValue` | `ui/stat-card.tsx` | ページ最上位のKPI数値（h1相当） |
| `StatCard` | `ui/stat-card.tsx` | グリッド内のKPIカード（4枚セット想定） |
| `PageHeader` | `ui/page-header.tsx` | 全ページ共通ヘッダー（eyebrow/title/subtitle/back/actions） |
| `SectionHeading` | `ui/section-heading.tsx` | セクション区切り（eyebrow/title/count/action） |
| `EmptyState` | `ui/empty-state.tsx` | データゼロ時（icon/title/description/CTA） |
| `Badge` | `ui/badge.tsx` | ステータス・ラベル（tone: up/down/accent/info/neutral） |
| `DataTable` | `ui/data-table.tsx` | 汎用テーブル（カラム定義 + rows） |

### フォーム系

| コンポーネント | ファイル | 用途 |
|---|---|---|
| `Button` | `ui/form.tsx` | アクションボタン（primary/secondary/ghost/danger × sm/md/lg） |
| `LinkButton` | `ui/button.tsx` | Next.js Link をボタンスタイルで使う場合 |
| `TextInput` | `ui/form.tsx` | テキスト入力 |
| `Select` | `ui/form.tsx` | セレクトボックス（options prop） |
| `TextArea` | `ui/form.tsx` | テキストエリア |
| `FormField` | `ui/form.tsx` | label + input + error のラッパー |
| `FormActions` | `ui/form.tsx` | フォーム末尾のボタン配置（右寄せ） |

### オーバーレイ・ナビ系

| コンポーネント | ファイル | 用途 |
|---|---|---|
| `Dialog` | `ui/dialog.tsx` | モーダル（DialogHeader/DialogBody/DialogFooter サブコンポ付き、ESC + 背景タップで閉じる） |
| `Tabs` | `ui/tabs.tsx` | タブナビ（pathname 駆動、weekly のサブナビ等） |
| `Toaster` | `ui/toaster.tsx` | トースト通知（ProviderとuseToasterフック） |

---

## 4. 参照システム・判断根拠

### Atlassian Design System（思想の芯）

「チームの仕事が回るUI」の思想が tripot v2 の「個人の行動が経営数字になる」と一致する。
参考にした点：情報密度の高い状態でも認知負荷を上げない構造、ステータスバッジのトーン設計。

### SAP Fiori（密度感のリファレンス）

業務システムとして「開けた瞬間に状態が分かる」の実装例として参照。
参考にした点：eyebrow ラベル + 本文の2層、フォームの統一スタイル。

### Carbon Design System（将来のデータ可視化）

weekly/cf や monthly の棒グラフを本格化する際に参照予定。今のバーチャートは自前実装、5月以降の拡張フェーズで Carbon の「data visualization」セクションを参照する。

---

## 5. やらないこと（アンチパターン）

- `font-bold` → `font-semibold` が最大
- `shadow-md` 以上 → `shadow-sm` まで
- `text-gray-400` 以下を本文に → `subtle`（slate-500）以上
- コード内コメント
- 英語UI
- ボタンに直接 className でスタイルを書く → 必ず `Button` か `LinkButton` を使う
- フォーム入力に直接 className を書く → `TextInput`/`Select`/`FormField` を通す

---

## 6. 5月以降の拡張候補

- `Spinner` / `Skeleton`（loading.tsx は簡易実装、Atlassian 参照で本格化）
- データ可視化コンポーネント（Carbon 参照、棒グラフ/折れ線グラフ）
- 既存 `DataTable` の拡張（ソート・絞り込み・行選択）
- `Combobox` / 検索付き Select（顧客選択など）
- `DatePicker`（現在は `<input type="date">` 直）
- ダークモード（6月以降、トークンは既に対応可能な構造）

### 既に v1 で完成済み（移植せず）

- `Dialog`（log-action-button からも今後この共通版に移行）
- `Toaster`（FormField error と併用、操作完了通知に使う）
- `Tabs`（weekly の行動量/CF予測タブで稼働中）
- `DataTable`（5/2 D-day で必要な汎用テーブルとして実装済）

---

## 7. 実装スタイル詳細仕様（v1.1 / 2026-04-27）

> `docs/mockups/minimal.html` で 1画面通して詰めた **「コアリスUI v1 実装値の確定版」**。
> 隊長 ＋ 🌸美桜 ＋ ❄️美冬 の合議で4時間掛けて 1px 単位まで詰めた仕様。tripot v2 / 13社派生時はこの数値をそのまま流用。

### 7.1 フォント（最重要・統一）

```css
font-family: 'IBM Plex Sans JP', 'IBM Plex Sans', 'Hiragino Sans', sans-serif;
font-feature-settings: "palt" 1, "tnum" 1, "ss01" 1, "zero" 1;
html { font-size: 16px; }
```

**選定理由**：欧文 IBM Plex Sans と日本語 IBM Plex Sans JP は同じ IBM 設計、ウェイト感が完全揃う。Inter+Noto 混在で起きる「日本語だけ骨格が浮く」問題を根本解決。`palt: 1` で日本語の詰め組み、`tnum/ss01/zero` で数字を slashed-zero + tabular で締める。

### 7.2 フォントサイズ階層（8段階固定・rem ベース）

| size | rem | 用途 | 実例 |
|---|---|---|---|
| **12px** | 0.75rem | ラベル・eyebrow（最小） | "MEMBER · 土岐 公人" / "入金累計" / "進行中案件" / "経営" "運用" / count "12" |
| **14px** | 0.875rem | 副情報 | "2026年4月20日 — 4月26日" / "先週 11 件" / "提案中・担当 谷藤" / "↑ 先週比 +12%" |
| **15px** | 0.9375rem | 数字強調（row-value 専用） | row 末尾の金額 ¥1,200,000 |
| **16px** | 1rem | 本文・row-name | 株式会社マロニエ |
| **20px** | 1.25rem | section-title (H3) | "直近の案件" |
| **28-32px** | clamp(1.75rem, 2.5vw, 2rem) | h1 大見出し | "今週のあなたの数字" |
| **32px** | 2rem | stat-value | "12" / "¥9.2M" / "3" / "2" |
| **48-80px** | clamp(2.875rem, 5.5vw, 5rem) | HeroValue（特大） | "¥3,820,000" |

**禁則**：11px / 13px / 17px などこの表外のサイズは作らない。例外は HeroValue（特大）だけ。

### 7.3 line-height（黄金 1.5-1.9）

```css
body { line-height: 1.6; }       /* 黄金中央 */
h1, .section-title { line-height: 1.3-1.4; }   /* 見出し引き締め */
.hero-value, .stat-value { line-height: 1.0; } /* 巨大数字は詰める */
.row-name, .row-meta { line-height: 1.6; }
```

### 7.4 8の倍数余白（padding / margin / gap）

| 用途 | 値 |
|---|---|
| main padding | 48px (3rem) |
| section margin-bottom | 48px (3rem) |
| page-header margin-bottom | 40px (2.5rem) |
| card padding（StatCard等） | 24px (1.5rem) |
| HeroValue card padding | 32px / 40px (2rem / 2.5rem) |
| row padding | 16px / 20px (1rem / 1.25rem) |
| stat grid gap | 10px (0.625rem) — 例外、密度感 |

**ルール**：8 / 16 / 24 / 32 / 40 / 48 / 56 / 64 のいずれかから選ぶ。

### 7.5 カラートークン（coaris.co.jp 寄せ）

```css
:root {
  /* テキスト */
  --ink: #1A1A1A;          /* 本文・見出し・主役テキスト */
  --ink-mid: #1E293B;      /* hover state */
  --muted: #333333;        /* サブテキスト */
  --subtle: #666666;       /* プレースホルダ・eyebrow（最小グレー） */

  /* 背景 */
  --surface: #F8F8F8;      /* ページ背景 */
  --card: #FFFFFF;         /* カード背景 */

  /* ボーダー（hairline 階層化） */
  --border: #DDDDDD;
  --border-hairline: rgba(0,0,0,0.04);
  --border-mid: rgba(0,0,0,0.07);

  /* プライマリ（coaris 紺青） */
  --primary: #0066CC;
  --primary-hover: #1E40AF;
  --primary-subtle: #E8F0FA;

  /* KPI / tone */
  --kpi-up: #16A34A;       --kpi-up-bg: #F0FDF4;
  --kpi-down: #DC2626;     --kpi-down-bg: #FEF2F2;
  --accent: #B45309;       --accent-bg: #FFFBEB;
}
```

### 7.6 サイドナビ実装値（深黒・collapse・Lucide アイコン）

```css
nav.sidebar {
  width: 208px;            /* expanded */
  background: linear-gradient(180deg, #0F2030 0%, #0A1620 100%);
  /* 黒すぎず、ほんのり奥行きの出る深海ネイビー */
}
nav.sidebar.collapsed { width: 64px; }

/* 字間調整（隊長指摘で詰めた）*/
.nav-item       { letter-spacing: 0.06em; }    /* 日本語2文字をふっくら */
.nav-group-label { letter-spacing: 0.22em; text-transform: uppercase; }
.brand-mark     { letter-spacing: -0.01em; }   /* 欧文 "coaris" は詰める */
.brand-sub      { letter-spacing: 0.2em; text-transform: uppercase; }

/* active 状態 */
.nav-item.active {
  background: #1E3A5F;
  color: #FFFFFF;
  box-shadow: inset 0 0 0 1px rgba(59,143,232,0.18);
}
.nav-item.active::before {  /* 左端アクセントバー */
  width: 2.5px;
  background: #3B8FE8;
}

/* hover 状態 */
.nav-item:hover {
  background: #162336;
  transform: translateX(1px);
  transition: all 80ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 右境界 */
nav.sidebar {
  box-shadow: inset -1px 0 0 rgba(255,255,255,0.06),
              1px 0 0 rgba(0,0,0,0.18);
}
```

**アイコン**：Lucide系 inline SVG、16px、stroke-width 1.8。home / briefcase / users / check-square / activity / calendar / bar-chart-2 / check-circle / user-circle。

**collapse**：左下「< 閉じる」トグル、localStorage で状態保持、collapsed 時 count バッジは ● ドットに縮小。

### 7.7 カード hairline 階層（主従関係）

| カード | border | inset highlight | 用途 |
|---|---|---|---|
| **HeroValue（主役）** | rgba(0,0,0,0.09) | rgba(255,255,255,0.92) | ページ最重要 |
| **StatCard（副）** | rgba(0,0,0,0.07) | rgba(255,255,255,0.88) | KPI 4枚 |
| **row（弱）** | rgba(0,0,0,0.055) | rgba(255,255,255,0.7) | 行アイテム |

**ルール**：rgba 2桁目を `09 → 07 → 055` で階層化、視覚の主従を作る。`#E5E5E5` のような単色 hex は使わず、必ず半透明黒で背景に馴染ませる。

**StatCard 上端カラーバー**：3px、tone に応じた色（neutral グレー / up 緑 / down 赤 / accent 琥珀）。

### 7.8 影（shadow-sm のみ・コアリスUI絶対ルール）

```css
box-shadow: 0 1px 2px rgba(0,0,0,0.04);  /* card 標準 */
```

`shadow-md` 以上は **物理的に Tailwind 設定で封印**（DEFAULT を sm 相当に上書き）。

**Primary ボタンの立体感**：

```css
.btn-primary {
  background: var(--primary);
  box-shadow: 0 1px 3px rgba(0,102,204,0.18),
              inset 0 1px 0 rgba(255,255,255,0.16);  /* 上端 inset highlight */
}
```

### 7.9 角丸（rounded）

| 用途 | 値 |
|---|---|
| Card（HeroValue / StatCard） | 12px |
| Button / Input | 6-8px |
| nav-item | 6px |
| Hero card | 12px |

**禁則**：rounded-2xl 以上（16px超）は使わない、業務感が崩れる。

### 7.10 microinteraction（80ms）

```css
transition: all 80ms cubic-bezier(0.4, 0, 0.2, 1);
```

- nav-item hover：`translateX(1px)`
- StatCard hover：`translateY(-1px)`
- row hover：inset highlight `0.7 → 0.9`、`translateX(1px)`
- ボタン active：`scale(0.98)`

### 7.11 グラフ実装方針（データ駆動 SVG inline）

#### A. Hero sparkline（12週折れ線）
```html
<svg viewBox="0 0 400 40" class="sparkline">
  <path d="M0,20 L8,18 L16,15 ..." stroke="var(--ink)" stroke-width="1.5" fill="none"/>
  <circle cx="392" cy="7" r="3" fill="var(--kpi-up)"/>  <!-- 最新週 dot -->
</svg>
```
- 高さ 32-40px
- min/max ラベル右上（最大値は kpi-up 緑強調）
- 下軸週ラベル -11w / -9w / -7w / -5w / -3w / -1w / 今週

#### B. StatCard mini bar（4週推移）
```html
<div class="mini-bars">
  <div class="bar" style="height: 60%"></div>
  <div class="bar" style="height: 75%"></div>
  <div class="bar" style="height: 80%"></div>
  <div class="bar bar-current" style="height: 100%"></div>
</div>
```
- 高さ 16-20px
- 今週分（current）のみカード tone 色（neutral / up緑 / down赤 / accent琥珀）
- 過去 3 週は border 色（薄）

#### C. データ駆動の保証
本番 React 組み込み時：
```typescript
// DB から引いた数字をそのまま流せる構造
const weekData = await db.select({...}).from(actions).where(weekStart >= 12週前);
const path = generateSparklinePath(weekData.map(w => w.total), 400, 40);
return <svg viewBox="0 0 400 40"><path d={path} /></svg>;
```

**禁則**：CSS-only の `width: percent%` 棒は、響かない（伸び縮み計算ができない）。必ず SVG inline か React の `.map()` で `<rect height={ratio}/>` 生成。

### 7.12 リファレンス（美冬+美桜が参考にした業務SaaS）

| 項目 | 参考 |
|---|---|
| sidebar 思想 | Linear / Cursor / Vercel Dashboard |
| カード hairline | Stripe Dashboard / Linear |
| sparkline | Apple Stocks / Bloomberg / Vercel Insights |
| StatCard 階層 | shadcn/ui / Tremor |
| タイポ階層 | Apple HIG / Stripe Dashboard |
| 色（紺青系） | coaris.co.jp 公式サイト |
| フォント | IBM Plex Sans JP（IBM Carbon 系） |

**運用ルール（2026-04-27 隊長指摘で恒常化）**：
> **デザイン着手前に、美しいリファレンスを 3-5 件 WebSearch / WebFetch で必ず集めてから設計に入る。** 自分の頭の中で作らず、世の中の到達点をまず見る。これは美冬の learnings.md にも記録済の恒常ルール。

### 7.13 アンチパターン（このセクション独自）

- ❌ フォントサイズの種類が 6 段階を超える
- ❌ rem 単位を使わず px 直書き
- ❌ 行間が詰まりすぎ（lh < 1.5）
- ❌ shadow-md / shadow-lg を導入
- ❌ サイドナビ背景を白（明るすぎ、隊長 NG 判定済）
- ❌ サイドナビにアイコンなしでテキストだけ
- ❌ HeroValue を複数置く
- ❌ グラフを「自分の感性で」作る（参考事例調査必須）
- ❌ font-style: italic で数字を見せる（明朝体やめた、隊長 NG 判定済）
- ❌ Inter / DM Sans を日本語混在で使う（潰れる、IBM Plex Sans JP 一本化）

---

*v1.1 確定 2026-04-27 / `docs/mockups/minimal.html` の 1px 細部まで詰めた状態を仕様化。*

---

*この文書は tripot v2 の実装から逆引きして書いた。100社展開時はここを起点に派生コストを下げる。*
