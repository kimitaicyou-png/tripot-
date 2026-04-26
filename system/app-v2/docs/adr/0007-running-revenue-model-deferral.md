# ADR-0007: running 売上モデルの簡略化と billing_periods Phase 2 送り

**Status**: Accepted
**Date**: 2026-04-26
**Deciders**: 🍁秋美・🌸美桜（朝合議）

## Context

tripot v2 の deals テーブルは `revenue_type enum('spot', 'running', 'both')` を持ち、サブスク型（保守・月額契約）の売上を表現する必要がある。

正確なモデルは以下のような期間管理が必要：

```
billing_periods
  id, deal_id, company_id
  started_at DATE, ended_at DATE  (null = 継続中)
  monthly_amount BIGINT
  billing_day INTEGER  (毎月何日締め)
```

しかし 5月2日 D-day まで残り6日。billing_periods を追加すると：
- schema 追加と relations 配線
- 月次集計ロジックが deals.monthly_amount 単純加算 → billing_periods の期間チェックに変更
- 週次・月次ダッシュボードのクエリ全書き直し

これは現時点で着手できる工数ではない。

## Decision

**5/2 デモまでは deals テーブル単体で running を表現する。billing_periods は Phase 2（5月リリース後）に追加する。**

### 5/2 デモ時の運用ルール

- `revenue_type = 'running'` の案件は `monthly_amount` に月額を入れる
- `amount` には総受注金額（既知なら）または 0 を入れる
- 月次売上集計は以下で計算：
  ```sql
  SUM(amount) FILTER (WHERE paid_at BETWEEN month_start AND month_end)
  + SUM(monthly_amount) FILTER (WHERE revenue_type = 'running' AND ordered_at <= month_end)
  ```
- 解約・期間終了は当面 `deleted_at` で擬似的に表現

### 受け入れる代償

- 「2026年1月から24ヶ月の保守契約」のような期間情報が表現できない
- 解約日の正確な記録ができない（deleted_at で代用）
- billing_day の表現ができない（月末締め一律前提）

これらは tripot 単体の 5/2 デモでは実害なし。実運用に入る前に Phase 2 で本実装。

## Consequences

### Positive

- 5/2 デモまでの工数を schema 1テーブルに圧縮
- 月次・週次集計ロジックがシンプル
- deals 単テーブルで全案件の表現が完結

### Negative

- Phase 2 移行時に running 案件のデータ移行スクリプトが必要
- 既存の monthly_amount 値を billing_periods.monthly_amount に複製
- ordered_at と現在日付から billing_periods.started_at を推論（不確定要素あり）

### Phase 2 での移行計画（5月リリース後）

1. `billing_periods` テーブル追加（migration）
2. 既存 `deals.revenue_type='running'` の案件から billing_periods を生成するスクリプト
3. 月次集計ロジックを billing_periods 経由に書き換え
4. deals.monthly_amount は互換性のため残す（一定期間後に削除）

## Alternatives Considered

- **5/2 までに billing_periods を作り切る**：工数1.5日、他のブロッカーが噴出するリスク高
- **monthly_amount のみで永続運用**：解約・期間管理が将来的に表現できず、データ集計事故の温床

## References

- `~/.claude/memory/shared/tripot-v2-db-design.md`（秋美 V1 設計、合議事項3）
- 朝合議：4姉妹レビュー結果（2026-04-26 10:00-10:30）
