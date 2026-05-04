# エラーアラートポリシー（tripot v2 公開リリース対応）

> 起案: 2026-05-05 02:46 美桜（Phase 公開準備フェーズ）
> 監視基盤: Sentry + PostHog（commit `9a64a09` で導入）
> 通知先: 隊長 LINE（Coaris LINE Official Account 経由）+ メール `k.toki@jtravel.group`

---

## 1. 設計思想

**「過剰通知 = 麻痺」ルール**：

- CRITICAL のみ即時通知（電話相当）
- HIGH は日次サマリ
- MEDIUM/LOW は週次サマリ or ダッシュボード参照のみ
- 隊長が深夜に飛び起きるのは **システムが完全停止 or データ消失リスクのみ**

---

## 2. 重要度マトリクス

### 🚨 CRITICAL（即時通知、5分以内に隊長到達必須）

| 条件 | 検知元 | 通知 |
|------|--------|------|
| `/api/auth/*` 5xx error 連続3回（5分窓） | Sentry | LINE Push + メール |
| DATABASE_URL 接続失敗（Neon ダウン） | Sentry | LINE Push |
| 本番 deploy 失敗（Vercel） | Vercel webhook | LINE Push |
| audit_logs テーブル UPDATE/DELETE 検知（G-3 immutable 違反） | DB trigger | LINE Push |
| 本番 production-cards / deals テーブルの mass DELETE（>50行） | Sentry custom | LINE Push + メール |
| シークレット漏洩疑い（PII / API key in logs） | Sentry beforeSend hook | LINE Push |

### ⚠️ HIGH（日次サマリ、朝の morning-briefing で集約）

| 条件 | 検知元 |
|------|--------|
| 5xx error rate > 0.5% / 24h | Sentry |
| API レイテンシ p95 > 3s（30分連続） | Sentry Performance |
| 認証失敗（domain_not_allowed / not_invited / inactive）> 10件 / 24h | audit_logs |
| 月次レポート生成失敗 | Sentry |
| budget_actuals import 失敗 | Sentry |

### 📊 MEDIUM（週次サマリ、月曜 mio-noon-patrol で集約）

| 条件 | 検知元 |
|------|--------|
| 4xx error rate > 5% / 7d | Sentry |
| 平均セッション長 < 30s（離脱率高） | PostHog |
| 特定 Action の error rate > 1% / 7d | Sentry |

### 📝 LOW（ダッシュボード参照のみ、自動通知なし）

- 個別エラー
- console warning
- 軽微な PostHog アノマリー

---

## 3. Sentry 設定

### 3-1. プロジェクト初期設定

```yaml
# Sentry Dashboard で設定
project: tripot-v2-coaris
environment: production
release: <git sha>  # vercel auto inject
```

### 3-2. Alert Rules（CRITICAL 6件）

Sentry Dashboard → Alerts → Create Alert で以下を作成：

1. **Auth API 5xx 連続検知**
   - Condition: event.request.url contains `/api/auth/` AND event.level == 'error'
   - Frequency: more than 3 times in 5 minutes
   - Action: Slack/Email/LINE Webhook → 隊長 LINE

2. **DB 接続失敗**
   - Condition: event.exception.value contains 'connect ECONNREFUSED' OR 'Neon'
   - Frequency: any 1 occurrence
   - Action: 同上

3. **Mass Delete 検知**
   - Condition: event.tags.action == 'mass_delete'
   - Implementation: Action 内で意図的に `Sentry.captureMessage('mass_delete detected', 'fatal')` 呼出
   - Action: 同上

### 3-3. beforeSend hook（PII 漏洩防止）

`sentry.client.config.ts` / `sentry.server.config.ts` に以下を追加：

```typescript
beforeSend(event) {
  // PII / シークレット疑いの key を redact
  const sensitiveKeys = ['email', 'phone', 'auth_token', 'api_key', 'password'];
  if (event.request?.data) {
    for (const key of sensitiveKeys) {
      if (key in event.request.data) {
        event.request.data[key] = '[REDACTED]';
      }
    }
  }
  return event;
},
```

---

## 4. PostHog 設定

### 4-1. Funnel 監視（オンボーディング離脱検知）

```yaml
# PostHog Dashboard で設定
funnel: 'Onboarding Drop-off'
steps:
  - 1. /login 訪問
  - 2. Google OAuth callback 成功
  - 3. /home/[memberId] 到達
  - 4. 初回 Action（deal/customer/task いずれか create）
threshold: 各 step の離脱率 > 30% / 7d → MEDIUM アラート
```

### 4-2. Session Recording（CRITICAL バグ調査用）

- enabled: true
- mask sensitive: form input（email / amount / external_cost）
- retention: 30日

### 4-3. Custom Events（業務 KPI）

```typescript
// 重要業務イベントを posthog.capture で記録
posthog.capture('deal.created', { stage, amount });
posthog.capture('estimate.approved', { dealId });
posthog.capture('invoice.marked_paid', { invoiceId, amount });
posthog.capture('member.deactivated', { reason });  // ADR-0012
```

→ 月次レポートに集約、経営者ダッシュボードで可視化。

---

## 5. LINE Push 連携

### 5-1. Sentry → LINE Webhook

```yaml
# Sentry Dashboard → Settings → Integrations → Webhooks
url: https://api.line.me/v2/bot/message/push
method: POST
headers:
  Authorization: Bearer <LINE_CHANNEL_ACCESS_TOKEN>
  Content-Type: application/json
body:
  to: <隊長 LINE userId>
  messages:
    - type: text
      text: |
        🚨 [CRITICAL] tripot v2
        {{ event.title }}
        {{ event.url }}
```

LINE_CHANNEL_ACCESS_TOKEN は 1Password から取得し、Sentry secrets に投入。

### 5-2. ノイズ抑制ルール

- 同一 issue は 1時間以内に再通知しない（Sentry Issue alert grouping）
- 23:00-07:00 は CRITICAL のみ通知（HIGH 以下は朝まで保留）
- 隊長が deploy 中（最新 commit から 30分以内）は CRITICAL のみ通知

---

## 6. Runbook（事故時対応）

### 6-1. CRITICAL 受領時

1. LINE 通知で「🚨」マーク確認
2. Sentry Issue URL 開く
3. Issue 内容を 30秒で判断：
   - データ消失リスク → 即時隊長判断
   - 機能停止 → 美桜が原因調査開始
   - 過去事例あり → Sentry の resolved 履歴から類似ケース確認
4. 30分以内に hot-fix or rollback 判断

### 6-2. Rollback 手順

```bash
cd /Users/tokikimito/projects/coaris/companies/tripot/system/app-v2
vercel rollback  # 直前の deploy に戻す
```

### 6-3. インシデント記録

`memory/sebastian/incidents/YYYY-MM-DD-<title>.md` に記録：
- 検知時刻 / 初動時刻 / 復旧時刻
- 影響範囲（ユーザー数 / データ量）
- 根本原因
- 再発防止策

---

## 7. 公開リリース後の見直しサイクル

| サイクル | 内容 |
|---------|------|
| **公開後 1週間** | アラート閾値見直し（誤報 / 取りこぼし） |
| **公開後 1ヶ月** | 重要度マトリクス再評価 |
| **公開後 3ヶ月** | LINE 通知疲労度測定、ノイズルール見直し |

---

## 8. 隊長次手チェックリスト

公開前に隊長が必ず実施する設定：

- [ ] Sentry Dashboard で Alert Rules 6件作成（CRITICAL）
- [ ] Sentry → LINE Webhook 接続
- [ ] PostHog で Onboarding Funnel 設定
- [ ] PostHog Session Recording 有効化
- [ ] beforeSend hook の PII redact 動作確認（test エラー1件発生 → Sentry で `[REDACTED]` 確認）
- [ ] LINE_CHANNEL_ACCESS_TOKEN を Sentry secrets に投入
- [ ] 1時間以内グルーピング設定確認
- [ ] 23:00-07:00 ノイズ抑制ルール設定

→ 全部完了したら HANDOFF.md に「アラート設定完了 YYYY-MM-DD」と記録。

---

*このポリシーは「過剰通知=麻痺」を回避する設計。
重要度マトリクスは公開後も継続改善。
3ヶ月後の見直しで麻痺している項目があれば即座に降格。*
