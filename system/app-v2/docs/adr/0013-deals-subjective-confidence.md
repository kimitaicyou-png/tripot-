# ADR-0013: deals テーブル 主観確度（subjective_confidence）column 追加

**Status**: Proposed (2026-05-25)
**Date**: 2026-05-25
**Deciders**: 隊長 / 指揮官（夏美） / 柏樹（ノリスケ反証ペルソナ）

## Context

現行スプレッドシート運用（2026-05-25 抽出、案件 90 件、4 タブ）で営業が**毎日触る**カラム「確度」が tripot v2 に欠落していた。

現行シートの確度ラベル：
- **A**: 見積段階以降、受注確度高
- **B**: ヒアリング / 補助金申請待ち、根拠あり
- **C**: 提案段階、検討中
- **D**: アポ段階、初期
- **E**: 見込み顧客、温度感低
- **想定**: 構築中等の計画段階、未確定の希望観測
- **継続**: 既存顧客の追加受注、リピート
- **中止**: 案件取り下げ（tripot では `stage='lost'` で表現）

tripot v2 既存の `deals.stage`（9 段 enum）+ `TRIPOT_CONFIG.stages.cashflowWeight`（10/30/70/80/95%）は **客観事実**（書類 status とタスク完了状態から自動進行）。営業の **主観温度感**（A〜E）は別軸で、stage では表現できない。

### 柏樹ペルソナ反証（2026-05-25 ノリスケ）

> 「一番ズレてるのは秋美の数字。固定ステージ確度 10/30/70/80/95% は綺麗だけど、営業の A〜E 手感を潰してる。数字が整って見えるだけで、柏樹の判断材料は減ってる」

家族 3 体（秋美・美冬・セバス）の「合格」票は コード/UI/整合性 の合格、**現場運用の合格ではなかった**。主観確度欠落が「90 件運用で死ぬ」「シートが恋しい」の主因。

## Decision

`deals` テーブルに以下 3 列を追加：

| 列名 | 型 | 説明 |
|---|---|---|
| `subjective_confidence` | enum (a/b/c/d/e/expected/continuing) | 営業主観の温度感ラベル、nullable |
| `confidence_updated_at` | timestamptz | 最終更新時刻 |
| `confidence_updated_by` | uuid (members.id) | 最終更新者 |

enum 値は現行シートと 1:1 対応：a, b, c, d, e は A〜E、expected = 想定、continuing = 継続。**中止は `stage='lost'` で表現**するため確度には含めない（DRY 原則）。

加えて index `deals_subjective_confidence_idx (company_id, subjective_confidence)` で「確度別パイプライン金額」「A 案件だけリストアップ」等のクエリを高速化。

## Rationale

### なぜ enum を採用したか
- 現行運用が 7 値の固定集合（A〜E + 想定 + 継続）、自由文字列で破綻リスクを増やす必要なし
- TypeScript strict 環境で union type への変換が容易
- index 効率も高い

### なぜ stage と統合せずに別軸を残したか
- stage は **書類とタスクの状態**（事実）、cashflow weight も会計予測の数字
- 確度は **営業の判断と直感**（主観）
- 同じ stage='proposing' でも A（見積段階以降で確度高）と E（提案後音沙汰なし）が混在する
- 1 軸に潰すと柏樹が言う「判断材料が消える」

### なぜ updated_at / updated_by を別カラムで持つか
- 確度更新は `audit_logs` にも記録するが、最新状態を deals 単体で即取得したい
- KPI 計算で「30 日以上確度更新なし」案件のフラグ立てに使う

## Consequences

### Positive
- 現行シート運用との互換性（移行時に A〜E ラベルがそのまま生きる）
- 営業主観のパイプライン優先順位（A 案件だけ、E 案件はフォロー対象 等）が画面で出せる
- monthly_summaries / weekly_summaries に「確度別パイプライン金額」を追加可能
- 13 社展開時も「営業組織を持つ事業会社」で共通需要

### Negative
- 営業に「stage と確度の 2 つを設定する」負担（運用ガイドラインで軽減）
- 確度が長期更新されないリスク（自動アラート機能を別 ADR で検討）
- ADR-0011 RBAC で `deals.update` 権限が `subjective_confidence` 更新にも適用される（追加権限なし）

### トレードオフ
- tripot 思想「行動が結晶」を厳密に取るなら主観確度は不要論あり。今回は**現行シート運用との互換性 + 営業の判断材料温存** を優先

## Alternatives Considered

### A. `deals.metadata` jsonb に格納（schema 拡張なし）
- メリット：migration ゼロ
- 却下理由：index 不能、enum 制約不能、確度別集計クエリが書きにくい

### B. `deals.stage` enum 拡張で表現
- メリット：1 軸に統合
- 却下理由：stage の客観事実性が崩れる（自動進行ロジックが主観で誤動作）

### C. 別テーブル `deal_confidence_history` 履歴専用
- メリット：時系列追跡完全
- 却下理由：現時点で必要性低（updated_at + audit_logs で十分）、YAGNI

## References

- 現行シート分析：`~/.claude/memory/shared/(指揮官 2026-05-25 18:00 分析)`
- 柏樹ペルソナ反証：`~/.claude/memory/relatives/norisuke/(2026-05-25 23:14 ノリスケ output)`
- 設計案：`/tmp/tripot-v2-G3-subjective-confidence-design-2026-05-25.md`
- 朝判定シート：`/tmp/tripot-v2-5-26-morning-decision-sheet.md`（隊長 GO 受領 2026-05-25 23:26）
- migration SQL：`scripts/setup-subjective-confidence.sql`
- teardown SQL：`scripts/teardown-subjective-confidence.sql`
- 類似 ADR：ADR-0010（deals 粗利関連 column 追加、同型）
