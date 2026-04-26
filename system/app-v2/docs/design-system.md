# コアリスUI — システムデザイン基準書 v1

> tripot v2 が基準値プロジェクト。ここで確立した設計判断が13社→100社への展開の土台になる。
> 参照先：Atlassian Design System（思想の芯）+ SAP Fiori（密度感のリファレンス）
> 最終更新：2026-04-26 by ❄️美冬

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

*この文書は tripot v2 の実装から逆引きして書いた。100社展開時はここを起点に派生コストを下げる。*
