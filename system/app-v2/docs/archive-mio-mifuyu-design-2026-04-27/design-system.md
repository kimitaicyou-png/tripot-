# コアリスUI — システムデザイン基準書 v1

> tripot v2 が基準値プロジェクト。ここで確立した設計判断が13社→100社への展開の土台になる。
> 参照先：Atlassian Design System（思想の芯）+ SAP Fiori（密度感のリファレンス）
> 最終更新：2026-04-27 by ❄️美冬（§7.10 v2 全面改訂）＋ 🌸美桜
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

/* hover 状態（translateX 廃止 → 左バー scaleY 出現） */
.nav-item:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.75);
  transition: color 120ms ease-out, background 120ms ease-out;
}
.nav-item:hover::before {
  transform: translateY(-50%) scaleY(1);
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

### 7.10 microinteraction（hover state 全面設計）

> **2026-04-27 v2 更新**：リファレンス調査（Linear / Stripe Dashboard / shadcn/ui / Josh W. Comeau CSS Transitions / Apple HIG HoverEffect WWDC25 / SaaSUI 2026 Trend Map / Tubik UI Trends 2026）をもとに全面改訂。2026 Trend Map と Hover 3層哲学を新設、Asymmetric transition の根拠を Josh W. Comeau 原文引用で強化。

---

#### A. 基本原則（不変の核）

1. **「触れる前と後で何が変わったか即分かる」** — 業務 SaaS の中心価値。3秒判断と連動
2. **Asymmetric transition** — enter: 125-150ms（snappy）、exit: 250-450ms（relaxed）
3. **階層がある** — カード（強）> 行（中）> ボタン（中）> nav（弱中）> チャート要素（弱）
4. **コアリスUI絶対ルール厳守** — `shadow-sm` まで、`font-semibold` 最大

---

#### B. 2026 Trend Map（採用 / 棄却 / 部分採用）

> 調査先：SaaSUI Blog「7 SaaS UI Design Trends 2026」/ Tubik Studio「What's Next 2026」/ Apple WWDC25 "Design hover interactions for visionOS"

| トレンド軸 | コアリス判定 | 理由 |
|---|---|---|
| **Spatial UI / 触感的 hover（depth-based）** | ❌ 棄却 | visionOS の eye-tracking 前提の depth-based highlight は 2D 業務 SaaS では過剰。コンテキストが違う |
| **Glassmorphism（blur + 透過）** | ❌ 棄却 | Linear 公式「データ密度の高い UI では可読性を損なう」。業務 SaaS での採用は逆行 |
| **触感的 microinteraction（Purpose Motion）** | ✅ 採用 | 装飾ではなく状態通知。行動の確認・フィードバックとして hover を使う。コアリス P1〜P3 と完全一致 |
| **Calm Design / Progressive Disclosure** | ✅ 採用 | Tooltips は hover 時のみ。複雑さを初期状態で出さない。hover が「情報の扉」として機能 |
| **Adaptive UI / Role-Based Interface** | 部分採用 | hover 強度を admin ロールで少し強めにするなど、将来の拡張余地として保留 |

**コアリスが hover に求めること**：
- 「反応を感じる」（生きているインターフェース感）
- 「どこが押せるか分かる」（操作可能性の提示）
- 「気づかないくらい自然」（業務の邪魔をしない）

---

#### C. Hover の 3層哲学（Linear / Stripe / Apple 比較）

> 「どの哲学に立つか」を決めないと、画面ごとに hover がバラバラになる。

| プロダクト | 哲学 | 特徴 | コアリスとの整合 |
|---|---|---|---|
| **Linear** | 即時性 + 静けさ | 「もし誰もすぐ気づかなければ、それはおそらく良いサイン」。nav は薄い左バー、translateX 禁止。コンテンツエリアを主役にするために nav を意図的に暗くする | ✅ 最も近い。業務に集中させるために hover は控えめに |
| **Stripe** | 繊細な浮上（subtle elevation） | card が `translateY(-2〜-4px)` + shadow で「浮く」感覚。数値を強調するため card の存在感を hover で高める | ✅ StatCard / Hero card の設計に採用済 |
| **Apple visionOS** | depth-based（目線に反応） | 「最良のカスタム効果は繊細。小さなビューで機能する」（WWDC25）。2D 画面では HoverEffect を `automatic` + `highlight` が推奨 | ⚠️ 原則は参照するが visionOS 固有の depth は棄却。「subtle but clear」の言葉は採用 |

**コアリスの立場**：**Linear の静けさ + Stripe の浮上感**の組み合わせ。
- nav / row → Linear 流（静かな左バー、コンテンツ主役）
- カード → Stripe 流（translateY + shadow で浮く）

---

#### D. Asymmetric transition — Josh W. Comeau の根拠

> 出典：Josh W. Comeau "An Interactive Guide to CSS Transitions" (joshwcomeau.com/animation/css-transitions/)

原文：
> "For hover animations, I like to make the enter animation quick and snappy, while the exit animation can be a bit more relaxed and lethargic"

Josh の実際の推奨値：enter 125ms / exit 450ms。
コアリス実装値：enter 120-150ms / exit 200-250ms（業務密度が高いため exit を Josh より短めに設定。450ms は業務 SaaS では少し長い）。

**なぜ asymmetric か**：
- enter が速い → ユーザーのマウス動作に即座に応答している感覚（レスポンシブ感）
- exit がゆっくり → 誤ってマウスが外れた時の「跳ね返り感」を消す。滑らかに戻る
- 均等時間（symmetric）だと、hover 解除時にも同じ速さで動いて「目がチカチカする」感覚になる

```css
.element {
  transition: transform 250ms ease-out, box-shadow 250ms ease-out;
}
.element:hover {
  transition: transform 125ms ease-out, box-shadow 125ms ease-out;
  transform: translateY(-2px);
}
```

---

#### E. 要素別仕様（確定版）

| 要素 | hover transform | shadow変化 | border変化 | enter ms / exit ms |
|---|---|---|---|---|
| **StatCard**（`.stat`） | `translateY(-3px)` | `0 6px 20px 0.09, 0 2px 6px 0.05` | tone 別 border accent color | 150 / 250 |
| **Hero card**（`.hero`） | `translateY(-2px)` | `0 4px 16px 0.08` | `rgba(0,0,0,0.13)` | 150 / 250 |
| **row**（行リスト） | なし | `0 1px 6px 0.06` | `rgba(37,99,235,0.14)` + 左 3px primary bar | 120 / 200 |
| **btn-primary** | `translateY(-1px)` | `0 4px 12px rgba(37,99,235,0.30)` glow | — | 120 / 200 |
| **btn-secondary** | `translateY(-1px)` | `0 2px 8px rgba(0,0,0,0.07)` | `rgba(0,0,0,0.20)` | 120 / 200 |
| **btn-ghost** | なし | なし | `rgba(37,99,235,0.12)` bg変化 | 120 / 200 |
| **btn-danger** | `translateY(-1px)` | `0 2px 8px rgba(220,50,50,0.12)` | danger-border強化 | 120 / 200 |
| **nav-item** | なし（translateX 永久廃止） | なし | なし / 左 2.5px bar scaleY | 120 / — |
| **mini bar** | `scaleY(1.08)` from bottom | なし | なし | 100 / — |
| **btn active / click** | `scale(0.97)` | — | — | 即時 |

---

#### F. CSS パターン集（コピペ用）

```css
.card {
  transition: box-shadow 250ms ease-out, border-color 250ms ease-out, transform 250ms ease-out;
}
.card:hover {
  transition: box-shadow 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out;
}

.stat:hover {
  border-color: rgba(0,0,0,0.13);
  box-shadow: 0 6px 20px rgba(0,0,0,0.09), 0 2px 6px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.92);
  transform: translateY(-3px);
}

.row::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--primary);
  opacity: 0;
  transition: opacity 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.row:hover::before { opacity: 1; }

.nav-item::before {
  content: ''; position: absolute; left: 0; top: 50%;
  transform: translateY(-50%) scaleY(0);
  transform-origin: center;
  width: 2.5px; height: 18px;
  background: rgba(255,255,255,0.35);
  transition: transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.nav-item:hover::before { transform: translateY(-50%) scaleY(1); }

.mini-bar:hover {
  filter: brightness(1.12) saturate(1.2);
  transform: scaleY(1.08);
  transform-origin: bottom;
}
```

---

#### G. Easing 選定理由

| Easing | 用途 | 理由 |
|---|---|---|
| `ease-out` | hover enter / exit 全般 | 自然な減速感。SaaS 標準。Linear / Stripe ともこれ |
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | bar 出現 / scaleY 出現 | わずかなオーバーシュートで「パチン」と出る感覚。左バーの「確認感」を演出 |

---

#### H. やらない hover（禁則リスト）

> 業務 SaaS の hover は「気づかないくらい自然」が正解。以下は全部 NG。

| 禁則 | 理由 |
|---|---|
| `transition: all` | 不要なプロパティまで transition。パフォーマンス劣化 |
| `translateX` で横揺れ | 「間違えた」感。縦方向（translateY）のみ使用 |
| `shadow-md` 以上（blur 8px超） | コアリスUI絶対ルール違反。shadow-sm 相当（alpha 0.09 以下）まで |
| color flash（背景色が瞬間変化） | 目が跳ぶ。bg 変化は bg-subtle に留める |
| bounce / spring（overshooting 大） | 子供っぽい。bar 出現の cubic-bezier だけ微オーバーシュートを許可 |
| Glassmorphism blur on hover | データ密度の高い業務 UI で可読性を損なう（Linear 公式が批判済） |
| hover で色反転 / 白黒反転 | コントラスト崩壊リスク。border-color 強化と translateY の組み合わせで十分 |
| opacity を 1→0.75 で「暗くする」 | mini bar の旧設計で発生した逆向き。hover は必ず「明るく・強く」する方向 |

### 7.11 グラフ実装方針（データ駆動 SVG inline）

> **2026-04-27 更新**：隊長指摘「美しいグラフを参考にして作ればいいのにな」を受け、リファレンス調査（shadcn/ui, Mantine Sparkline, Stripe, Vercel Analytics, Linear, artofstyleframe.com）をもとに全面改訂。

#### A. Hero sparkline（12週折れ線）― 設計仕様

**基本寸法**
- viewBox: `0 0 400 64`（高さ 64px。52px から拡張、呼吸が生まれる）
- padding: 上下左右 `6px`

**曲線スタイル**（2026年 SaaS スタンダード）
- カーブタイプ：**monotone cubic**（自然な曲線、Mantine/shadcn の標準。linear は 2020年代前半）
- 線の太さ：`stroke-width: 1.5`（1px は細すぎ、2px は太すぎ。1.5px が業務 SaaS の最適解）
- `stroke-linecap: round; stroke-linejoin: round`（エッジを柔らかく）
- `vector-effect: non-scaling-stroke`（レスポンシブ時に線幅が変わらない）

**グラデーション fill**
```css
linearGradient: 上端 opacity 0.16 → 55% で 0.05 → 下端 0.00
```
（Mantine 推奨の 0.6 は濃すぎ。shadcn 推奨の 0.2 を上端基準に 0.16 に微調整）

**比較軸（前年同期）**
- 破線で重ねる：`stroke-dasharray: 3 4; stroke-width: 1; opacity: 0.45`
- 凡例：今期（実線）/ 前年同期（破線）を右上に legend ドットで表示

**グリッドライン**
- 水平に 2 本（`stroke-dasharray: 3 4; opacity: 0.045`）
- 軸ラベルは **使わない**（Stripe / Linear スタイル。余白が呼吸する）

**ドット**
- 最新点（current）：radius 3.5、fill: kpi-up、stroke: card 2px
- 最小点（min）：radius 2.5、fill: subtle-plus、opacity: 0.6
- max は最新点と同じ場合が多いので最新点のみ

**ツールチップ**
- mousemove で最近傍点を計算し、`position: absolute` の tooltip を表示
- background: `var(--ink)` / color: `rgba(255,255,255,0.92)` / border-radius: `var(--radius-sm)`
- `transition: opacity 100ms` で滑らかに出入り

**週ラベル（下軸）**
- `font-size: 0.625rem; opacity: 0.7`（少し引いた色で存在感を抑える）
- ラベル：-11w / -9w / -7w / -5w / -3w / -1w / 今週

```html
<svg viewBox="0 0 400 64" class="sparkline-svg">
  <defs>
    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--kpi-up)" stop-opacity="0.16"/>
      <stop offset="55%"  stop-color="var(--kpi-up)" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="var(--kpi-up)" stop-opacity="0.00"/>
    </linearGradient>
  </defs>
  <line class="spark-grid-line" x1="0" y1="21" x2="400" y2="21"/>
  <line class="spark-grid-line" x1="0" y1="42" x2="400" y2="42"/>
  <path class="spark-area-prev" d="[monotone cubic 前年データ]"/>
  <path class="spark-fill" fill="url(#sparkGrad)" d="[monotone cubic 今期 + close]"/>
  <path class="spark-area" stroke="var(--kpi-up)" d="[monotone cubic 今期]"/>
  <circle class="spark-dot-min" cx="..." cy="..." r="2.5"/>
  <circle class="spark-dot" fill="var(--kpi-up)" cx="..." cy="..." r="3.5"/>
</svg>
```

#### B. StatCard mini bar（4週推移）― 設計仕様

**基本寸法**
- 高さ: `28px`（24px から拡張。視認性アップ）
- gap: `3px`（2px から変更。息が詰まらない）
- border-radius: `2px 2px 0 0`

**色**
- neutral: `rgba(0,0,0,0.07)` / current: `rgba(0,0,0,0.32)`
- up（緑）: `oklch(91% 0.07 152)` / current: `var(--kpi-up)`
- down（赤）: `oklch(92% 0.07 25)` / current: `var(--kpi-down)`
- accent（琥珀）: `oklch(92% 0.06 68)` / current: `var(--accent)`

**hover**
- `opacity: 0.75; filter: brightness(0.92)`（元の 0.7 にプラス brightness で自然な押し込み感）

**フッターラベル**
- `font-size: 0.625rem; opacity: 0.7`（今週値 eyebrow と統一感）

#### C. データ駆動の保証（本番 React 組み込み）
```typescript
const weekData = await db.select({...}).from(actions).where(weekStart >= 12週前);
const pts = computePoints(weekData.map(w => w.total), 400, 64, 6, 6);
const path = monotoneCubic(pts);
return (
  <svg viewBox="0 0 400 64">
    <defs>...</defs>
    <path d={generateFillPath(pts)} fill="url(#sparkGrad)"/>
    <path d={path} stroke="var(--kpi-up)" strokeWidth={1.5} fill="none"/>
    <circle cx={pts[pts.length-1].x} cy={pts[pts.length-1].y} r={3.5} fill="var(--kpi-up)"/>
  </svg>
);
```

**禁則**
- ❌ `linear` curve（2020年代前半、古い）
- ❌ `stroke-width: 2` 以上（重い）
- ❌ グラデーション fill の上端 opacity > 0.25（煩い）
- ❌ ドットを全点に付ける（last/min/max のみ）
- ❌ 軸ラベルに `text-gray-400`（`subtle-plus` 相当 = #888888 以上を使うこと）
- ❌ mini bar の gap < 3px（詰まる）

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
