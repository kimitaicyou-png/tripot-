# 引き継ぎメモ（別タブ美桜 → トライポット担当美桜）

最終更新: 2026-04-09 / VSCode拡張側の美桜から

## 今の状態

- Next.js 16.2.2 + React 19 + Supabase + Anthropic SDK
- ポート: **3100**（`npm run dev` で起動）
- package名: `tripot`（Vercel事故対策OK）
- 起動: `cd app && npm install && npm run dev`

## ディレクトリ

```
tripot/
├ README.md
├ app/            ← Next.js 本体
│  └ src/{app,components,lib,types}
└ docs/
   ├ deal_to_production_flow.md
   └ handoff.md  ← これ
```

## 主要ルート

| パス | 役割 |
|---|---|
| `/login` | 事業会社独立認証 |
| `/monthly` | 月次ダッシュボード |
| `/weekly` | 週次ダッシュボード |
| `/home?member=xxx` | メンバー個人 |
| `/production` | 制作 |
| `/approval` | 承認（申請側。承認は本部） |
| `/deals` | 案件管理（データ連鎖の中核） |
| `/api/bridge/kpi` | **未実装** 本部からの集計取得エンドポイント |

## 思想リマインド

- 本部とはブリッジAI経由で接続（直結しない）
- 承認は本部の仕事、ここは**申請**まで
- 個人 → 週次 → 月次 → 会社 の順に積み上げ
- 行動ベース入力、報告は書かせない

## デザイン憲章（守る）

- font-semibold が最大（font-bold/black NG）
- shadow-sm が最大
- text-gray-500 以上（gray-400以下を本文に使わない）
- active:scale-[0.98] をタップ要素に
- 日本語UI、コメント禁止
- alert() 禁止

## 次にやること候補

- `/api/bridge/kpi` の実装（本部側との契約確認が先）
- 隊長の直近指示に従う（これが最優先）

---

別タブで作業する時は、隊長に「続きどこから？」と確認してから動いてください。
