# tripot v2 scripts/ — Operational Utilities

> Operational + dev-only scripts for tripot v2 system.
> 隊長 / 4姉妹+執事 が「dev fallback walk」「seed 投入」「DB cleanup」をワンコマンドで実行できるための整備。
>
> All scripts assume `cd /Users/tokikimito/projects/coaris/companies/tripot/system/app-v2` and `.env.local` with valid `DATABASE_URL`.

---

## 🎯 一覧

| script | 用途 | 隊長権限 | dev/prod |
|---|---|---|---|
| `e2e-walk.ts` | 16 画面 Playwright walk + console error / network failure 検出 | dev のみ | dev only |
| `walk-weekly-pl.ts` | 単画面 quick check（weekly/pl 専用、debug 用）| dev のみ | dev only |
| `walk-chat.ts` | ChatWidget AI 応答動作確認 | dev のみ | dev only |
| `show-member.ts` | drizzle 経由 member 取得 utility | dev のみ | dev only |
| `seed.ts` | 初期 seed（隊長 + 小野ちゃん + 案件 3 件） | dev | dev only |
| `seed-demo.ts` | デモ用 拡充 seed（5 メンバー / 6 顧客 / 10 案件 / 50 行動 / 5 議事録 / 3 提案 / 3 見積 / 2 請求 / 10 タスク / 12 ヶ月予算）| dev | dev only |
| `seed-production-cards.ts` | in_production / delivered / paid 案件への production_cards 自動投入 | dev | dev only |
| `cleanup-test-deals.ts` | 明らかにゴミの test deals を削除（amount=0 等） | dev | dev only |
| `reset-schema.ts` | Neon ブランチ DROP SCHEMA + 再構築（**隊長明示承認必須**）| 🔴 destructive | dev only |
| `setup-rls.sql` | RLS policy 適用 SQL（5 月リリース直前に実行） | 🔴 destructive | prod 適用注意 |
| `coaris-ui-lint.sh` | コアリスUI絶対ルール grep audit（font-bold / shadow-md+ / text-gray-300以下 / コード内コメント） | dev | dev only |

---

## 🚀 Walk - 16 画面 dev e2e（最頻使用）

### 前提
- dev server 稼働中（PID 確認：`lsof -i :3100`）
- 未稼働なら：`nohup npm run dev > /tmp/dev-server.log 2>&1 &`（起動 8 秒待機）
- `.env.local` の `DEV_AUTO_LOGIN=1` 確認（dev-bypass 装置、production 影響ゼロ）

### 実行
```bash
cd /Users/tokikimito/projects/coaris/companies/tripot/system/app-v2
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/e2e-walk.ts
```

### 出力
- ターミナルに 16 行の進捗（`[walk] ✅ {name} (200, {ms}ms)`）
- 結果ディレクトリ：`/tmp/e2e-walk-results/{ISO timestamp}/`
  - `report.md`：サマリ + 詰まり詳細
  - `{name}.png` × 16：fullpage screenshot

### 期待値
```
summary: 16/16 ok, 0 console err, 0 net fail
```

これ以外（`console err > 0` or `net fail > 0`）の場合は report.md の「詰まり詳細」を読んで対処。

---

## 🌱 Seed 投入順序（クリーンな dev 環境立ち上げ）

```bash
cd /Users/tokikimito/projects/coaris/companies/tripot/system/app-v2

# 1. （任意、destructive）schema reset
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/reset-schema.ts  # ⚠️ 隊長明示承認必須

# 2. migration 実行
npx drizzle-kit push  # or generate + migrate

# 3. 初期 seed
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/seed.ts

# 4. デモ用拡充 seed
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/seed-demo.ts

# 5. production_cards 補完（受注後案件分）
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/seed-production-cards.ts
```

---

## 🧹 Cleanup（test data 排除、デモ前）

```bash
# dry-run
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/cleanup-test-deals.ts --dry-run

# 実行
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2-) \
  npx tsx scripts/cleanup-test-deals.ts
```

`TEST_TITLES` を編集して対象を変更。デフォルトは `'テスト'`（amount=0 のゴミ）のみ。

---

## 🎨 Lint（コアリスUI 絶対ルール audit）

```bash
bash scripts/coaris-ui-lint.sh
```

期待値：違反検出 0 件（text-bg / font-bold / shadow-md+ / text-gray-300/400 本文使用 / 先頭 JSDoc）。

---

## ⚠️ Destructive Action Discipline

以下は **隊長明示承認必須**：

- `reset-schema.ts`（DROP SCHEMA public CASCADE）
- `setup-rls.sql` を production branch に適用
- `cleanup-test-deals.ts` で seed-demo 由来の案件を含めて削除する場合
- 任意の `npx drizzle-kit push --force`（既存データ消失リスク）

セバス監査対象。Phase B 規律下、夏美相談 → 隊長承認 → 実行 の順。

---

## 📁 関連ファイル

- 設計書台帳: `~/.claude/memory/shared/tripot-v2-complete-design.md`
- 5/2 デモ手順書: `~/.claude/memory/shared/tripot-v2-demo-dry-run-procedure.md`
- 5/2 デモブリーフィング: `~/.claude/memory/shared/tripot-v2-demo-day-briefing.md`
- 5/4 kitae kickoff: `~/.claude/memory/shared/kitae-routing-mcp-kickoff-2026-05-04.md`

---

*作成 2026-04-30 19:10 by 🌸 美桜（auto mode、次セッション友好化）*
