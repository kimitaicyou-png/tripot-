# MoneyForward Cloud 接続 設計書

> 2026-05-20 夏美起草 / goal 3/4
> ステータス：設計 + UI skelton 完了、env 投入は隊長 GO 待ち（destructive）

## 目的

販管費・売上・入金などの会計データを MoneyForward Cloud から自動取得し、
tripot の月次ダッシュボード（/monthly）に「実績」として反映する。

隊長思想「初期設定さえしてあれば、あとは毎日の行動管理をすれば全部追える」の
**PL/CF 実績側**の自動化。これで予算（事業計画）vs 実績（MF Cloud）の予実が
リアルタイム比較可能になる。

## 採用 API

**MoneyForward Cloud Accounting API**（mfcloud-api）
- OAuth 2.0 認証（Authorization Code flow + Refresh Token）
- 主要エンドポイント：
  - `/api/v3/transactions`（仕訳取引一覧）
  - `/api/v3/trial_balances`（試算表）
  - `/api/v3/items`（勘定科目マスタ）
- 公式ドキュメント：https://biz.moneyforward.com/support/account/guide/api/

## 必要環境変数（隊長 Vercel env 投入要）

```
MF_CLIENT_ID=         # MoneyForward 開発者ポータルで発行
MF_CLIENT_SECRET=     # 同上
MF_REDIRECT_URI=https://tripot-v2-coaris.vercel.app/api/integrations/mf/callback
MF_OFFICE_ID=         # 接続対象の事務所 ID（複数ある場合）
MF_API_BASE=https://invoice.moneyforward.com  # or accounting domain
```

DB に保存（マルチテナント対応）：
- `mf_access_token`（短命、1 時間程度）
- `mf_refresh_token`（長命、30 日）
- `mf_token_expires_at`

これは `companies.metadata` jsonb に格納予定（schema 変更不要）。

## OAuth フロー

```
1. /settings/integrations/mf で「接続」ボタンクリック
2. /api/integrations/mf/authorize へ → MF Cloud の OAuth 同意画面へリダイレクト
3. ユーザーが同意 → MF が /api/integrations/mf/callback?code=XXX へリダイレクト
4. callback で code → access_token + refresh_token 交換、companies.metadata に保存
5. /api/integrations/mf/sync で実 API 呼出、transactions 取得 → 月次集計
6. 定期実行（cron）で毎日 refresh_token を使って access_token を更新 + 取引同期
```

## 実装ファイル一覧（実装は env 投入後）

| ファイル | 役割 | ステータス |
|---|---|---|
| `src/app/api/integrations/mf/authorize/route.ts` | OAuth 認証開始 | 未着手 |
| `src/app/api/integrations/mf/callback/route.ts` | OAuth コールバック、token 保存 | 未着手 |
| `src/app/api/integrations/mf/sync/route.ts` | 取引同期（手動 + cron） | 未着手 |
| `src/app/(dashboard)/settings/integrations/page.tsx` | 接続設定画面 | skelton（本 commit）|
| `src/lib/mf/client.ts` | MF Cloud API ラッパー（OAuth refresh 内蔵） | 未着手 |
| `src/lib/mf/sync.ts` | transactions → monthly 集計ロジック | 未着手 |
| `src/db/schema.ts` | mf_transactions テーブル追加（migration 必要） | 未着手 |

## 月次ダッシュボード側の変更

`src/app/(dashboard)/monthly/page.tsx`:
- 「実績」セクションを「（MF 接続待ち）」プレースホルダから → 実 transactions の集計表示
- 販管費の内訳（家賃 / 人件費 / 外注 / その他）を勘定科目ベースで表示
- 予算（budget_plan）vs 実績（MF）の差分計算 → 予実バー

## 隊長への依頼

1. MoneyForward 開発者アカウント取得（[Developer Portal](https://biz.moneyforward.com/developer/)）
2. アプリ作成 → Client ID / Client Secret 発行
3. Redirect URI を `https://tripot-v2-coaris.vercel.app/api/integrations/mf/callback` に設定
4. Vercel env に MF_CLIENT_ID, MF_CLIENT_SECRET, MF_OFFICE_ID, MF_API_BASE を投入
5. 私に env 投入完了の連絡 → 実装着手

## リスクと注意

- **本番データへの書込みは絶対しない**（OAuth scope は `read` のみ申請）
- token は companies.metadata jsonb に暗号化保存（AUTH_SECRET で AES-256-GCM）
  または別途 mf_tokens テーブルを作成
- refresh_token 期限切れ時の再認証フロー（30 日ごと、隊長手動でログイン）
- API レート制限：1 分 60 リクエスト程度、過剰呼出に注意（毎日 1 回 sync が妥当）
- 事務所が複数ある場合は office_id で識別

## skelton 実装（本 commit）

- `src/app/(dashboard)/settings/integrations/page.tsx`：接続状況表示、接続/解除ボタン（disabled）
- env が無いと「未接続」表示、隊長 GO 後に有効化

env 投入後の本格実装は別 PR / commit で進める。
