# Tripot Design System v1.0

> **正典：秋美+隊長で作成（2026-04-10、coaris-ai リビルド時）**。
> tripot v2 / 13社展開・全プロダクトの基準値。コードレビュー・実装着手前は本書を必ず参照。
> ミラー：`coaris-ai/docs/design-system.md` / `tripot/system/docs/0010_design-system.md`（同内容3箇所）。
>
> ⚠️ **過去の逸脱履歴（2026-04-26〜04-28）**：私（美桜）+美冬で別系統のデザイン体系（IBM Plex Sans JP / coaris 紺青 / 深海ネイビー gradient sidebar / カスタム microinteraction CSS）を作ってしまっていた。隊長指摘「全然違う。秋美と俺で MD 作ったのだけど」を受けて 2026-04-28 23:00 commit `28d41ba`/`0fd4b57` で全面 revert。逸脱版は `archive-mio-mifuyu-design-2026-04-27/` に退避。

IT制作会社 5名体制の業務システム。Next.js 16 + React 19 + Tailwind CSS v4 + recharts + lucide-react。

---

## 1. カラーパレット

### プライマリ
| 用途 | Tailwind | 使い所 |
|------|---------|--------|
| プライマリ | `bg-blue-600` / `text-blue-600` | ボタン、リンク、アクティブタブ |
| プライマリホバー | `bg-blue-700` | ボタンホバー |
| プライマリ薄 | `bg-blue-50` | 選択行、アクティブカード背景 |
| プライマリボーダー | `border-blue-200` | 選択中のカード枠 |

### ニュートラル
| 用途 | Tailwind | 使い所 |
|------|---------|--------|
| 見出し | `text-gray-900` | h1, h2, KPI数値 |
| 本文 | `text-gray-700` | カード説明文 |
| 補足 | `text-gray-500` | ラベル、タイムスタンプ |
| ページ背景 | `bg-gray-50` | 全画面背景 |
| カード背景 | `bg-white` | カード、モーダル |
| ボーダー | `border-gray-200` | カード境界、テーブル罫線 |

**禁止:** `text-gray-400` 以下を本文に使わない（プレースホルダーのみ可）

### ステータス色
| ステータス | バッジ |
|-----------|--------|
| 完了 | `bg-emerald-50 text-emerald-700` |
| 進行中 | `bg-blue-50 text-blue-700` |
| 注意 | `bg-amber-50 text-amber-700` |
| 危険 | `bg-red-50 text-red-700` |
| 未着手 | `bg-gray-100 text-gray-600` |
| 保留 | `bg-purple-50 text-purple-700` |

### フェーズ色（制作カンバン列）
| フェーズ | 左線 | バッジ |
|---------|------|--------|
| キックオフ前 | `border-l-gray-400` | `bg-gray-100 text-gray-600` |
| 要件整理 | `border-l-blue-400` | `bg-blue-50 text-blue-700` |
| 設計中 | `border-l-indigo-400` | `bg-indigo-50 text-indigo-700` |
| 開発中 | `border-l-amber-400` | `bg-amber-50 text-amber-700` |
| テスト中 | `border-l-orange-400` | `bg-orange-50 text-orange-700` |
| リリース | `border-l-emerald-400` | `bg-emerald-50 text-emerald-700` |
| 運用 | `border-l-teal-400` | `bg-teal-50 text-teal-700` |

### リスク色
| リスク | カード左線 |
|--------|----------|
| なし | なし |
| 低 | `border-l-2 border-l-blue-400` |
| 中 | `border-l-2 border-l-amber-400` |
| 高 | `border-l-2 border-l-red-400` |

---

## 2. タイポグラフィ

フォント: Geist Sans (`font-sans`)

| 用途 | Tailwind |
|------|---------|
| ページタイトル | `text-xl font-semibold text-gray-900` |
| セクション見出し | `text-base font-semibold text-gray-900` |
| カード見出し | `text-sm font-medium text-gray-900` |
| 本文 | `text-sm text-gray-700` |
| 補足 | `text-xs text-gray-500` |
| KPI数値(大) | `text-[28px] font-semibold text-gray-900 tabular-nums` |
| KPI数値(中) | `text-xl font-semibold text-gray-900 tabular-nums` |
| テーブルヘッダー | `text-xs font-medium text-gray-500 uppercase tracking-wider` |
| テーブル数値 | `text-sm font-medium text-gray-900 tabular-nums text-right` |
| バッジ | `text-xs font-medium` |
| ボタン | `text-sm font-medium` |

**禁止:** `font-bold`, `font-black`, `font-extrabold`。最大 `font-semibold`。
**数値:** 金額・数量・%には必ず `tabular-nums` を付ける。

---

## 3. スペーシング

| コンポーネント | Tailwind |
|--------------|---------|
| ページ全体 | `p-6` |
| カード | `p-4` |
| モーダル | `p-6` |
| テーブルセル | `px-4 py-3` |
| ボタン(通常) | `px-4 py-2` |
| ボタン(小) | `px-3 py-1.5` |
| バッジ | `px-2 py-0.5` |
| セクション間 | `space-y-6` |
| カード間 | `gap-4` |
| カード内 | `space-y-3` |
| カンバン列間 | `gap-4` |
| カンバン列内カード間 | `space-y-2` |

---

## 4. ボーダー・角丸・シャドウ

| 要素 | 角丸 | ボーダー | シャドウ |
|------|------|---------|---------|
| カード | `rounded-lg` | `border border-gray-200` | `shadow-sm` |
| モーダル | `rounded-xl` | `border border-gray-200` | `shadow-sm` |
| ボタン | `rounded-lg` | なし or `border border-gray-200` | なし |
| バッジ | `rounded-full` | なし | なし |
| 入力 | `rounded-lg` | `border border-gray-200` | なし |
| プログレスバー | `rounded-full` | なし | なし |

**禁止:** `shadow-md` 以上。`rounded-2xl` 以上はモーダルのみ。

---

## 5. アイコン体系

**lucide-react** (`npm install lucide-react`)

| サイズ用途 | Tailwind |
|---------|---------|
| ナビゲーション | `w-5 h-5` |
| ボタン内 | `w-4 h-4` |
| カード内 | `w-3.5 h-3.5` |
| 空状態 | `w-6 h-6` |
| ステータスドット | `w-2 h-2 rounded-full` |

### アイコンマッピング
| 概念 | lucide名 |
|------|----------|
| ダッシュボード | `LayoutDashboard` |
| 案件 | `Briefcase` |
| 制作 | `Kanban` |
| 週次 | `CalendarDays` |
| 月次 | `BarChart3` |
| アタック | `Target` |
| 設定 | `Settings` |
| 追加 | `Plus` |
| 編集 | `Pencil` |
| 削除 | `Trash2` |
| 閉じる | `X` |
| 送信 | `Send` |
| 添付 | `Paperclip` |
| 警告 | `AlertTriangle` |
| ドラッグ | `GripVertical` |
| 金額 | `Banknote` |
| 上昇 | `TrendingUp` |
| 下降 | `TrendingDown` |
| AI | `Sparkles` |
| マイルストーン | `Flag` |

**絵文字:** タブラベル前のみ。ボタン/テーブル/バッジ/ナビには使わない。

---

## 6. ボタン4種

```
プライマリ: bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98]
ゴースト:   border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 active:scale-[0.98]
デンジャー: bg-red-600 text-white rounded-lg hover:bg-red-700 active:scale-[0.98]
アイコン:   p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:scale-[0.98]

disabled: opacity-50 cursor-not-allowed
全ボタン: transition-all duration-150
```

---

## 7. モーダル（スライドイン）

```
オーバーレイ: fixed inset-0 bg-black/40 z-40 animate-[fade-in_200ms]
パネル: fixed inset-y-0 right-0 w-[640px] bg-white shadow-sm z-50
        animate-[slide-in-right_250ms_ease-out]

ヘッダー: px-6 py-4 border-b border-gray-200
タブバー: px-6 border-b border-gray-200
コンテンツ: flex-1 overflow-y-auto px-6 py-4 space-y-4
```

---

## 8. 空状態

```
flex flex-col items-center justify-center py-16
  w-12 h-12 rounded-full bg-gray-100 → {icon} w-6 h-6 text-gray-400
  text-sm font-medium text-gray-900 mb-1  "〇〇がありません"
  text-xs text-gray-500 mb-4              "〇〇してください"
  (オプション) プライマリボタン
```

---

## 9. トースト通知

```
位置: fixed top-4 right-4 z-50
成功: bg-white border border-gray-200 rounded-lg p-4 shadow-sm
      Check(emerald) + テキスト
エラー: 同構造 X(red)
自動消去: 3000ms
```

---

## 10. アクセシビリティ

- フォーカスリング: `focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`
- 色だけで情報を伝えない（テキストラベル・アイコン併用）
- モーダル: フォーカストラップ必須
- Escape: モーダル/ドロップダウン閉じる

---

## 11. 実装チェックリスト

- [ ] font-semibold が最大ウェイトか
- [ ] shadow-sm が最大シャドウか
- [ ] text-gray-400 以下を本文に使っていないか
- [ ] active:scale-[0.98] が全タップ要素に付いているか
- [ ] 数値に tabular-nums が付いているか
- [ ] 色だけで情報を伝えていないか
- [ ] focus-visible:ring-2 がインタラクティブ要素に付いているか
- [ ] 日本語UIか
- [ ] コメントを入れていないか
- [ ] 空状態のデザインがあるか
- [ ] ローディング状態（スケルトン）があるか
