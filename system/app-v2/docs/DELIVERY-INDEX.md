# 納品パッケージ索引 — coaris-tripot-v2

> バージョン：3.2.0 / 作成：2026-06-07 / 隊長GO待ち項目は末尾に明記

---

## 概要

tripot v2 は、コアリスHD が開発した AI 前提型営業管理 SaaS の参照実装です。
13社展開を前提に設計されており、会社別カスタマイズは `coaris.config.ts` 1ファイルで完結します。

| 項目 | 内容 |
|---|---|
| 本番URL | `https://tripot-v2-coaris.vercel.app` |
| 技術スタック | Next.js 16 / React 19 / TypeScript strict / Tailwind CSS v4 / Neon PostgreSQL / Anthropic Claude |
| テスト | vitest 86件全通過（純粋関数 + DBモック） |
| セキュリティ | RLS完備 / 監査ログimmutable / JWT即時無効化 / CSP・HSTS適用済 |

---

## 1. セットアップ・デプロイ

| ドキュメント | 場所 | 概要 |
|---|---|---|
| セットアップ手順（開発環境） | `README.md` | 5分で動く手順・ディレクトリ構造 |
| 本番デプロイガイド | `docs/deploy-guide.md` | Vercel新規作成・env投入・Google OAuth設定・動作確認 |
| 新社展開スクリプト | `scripts/init-company.sh` | 1コマンドで新社にコピー・config書き換え（rsync + python3） |
| 13社展開チェックリスト | `docs/13-company-rollout-checklist.md` | init-company.sh 実行後の手動作業一覧 |

---

## 2. 品質・セキュリティ

| ドキュメント | 場所 | 概要 |
|---|---|---|
| CI パイプライン | `.github/workflows/ci.yml` | PRマージ前に型チェック・Lint・テスト・ビルドを自動実行 |
| セキュリティヘッダ設定 | `next.config.ts`（headers()） | CSP / HSTS / Permissions-Policy（隊長deploy GO後に本番適用） |
| 脆弱性スキャン | `package.json`（audit / audit:report） | critical ゼロを verify の合格基準に設定 |
| バグ修正記録 | `docs/BUGFIX-2026-05-28.md` | 本番で発生した障害と修正内容 |
| 変更履歴 | `CHANGELOG.md` | バージョン別の追加・変更・修正一覧（v1.0.0〜v3.2.0） |

---

## 3. 契約・SLA

| ドキュメント | 場所 | 概要 |
|---|---|---|
| SLAテンプレート | `docs/SLA-template.md` | 稼働率・応答時間・障害対応時間・保守範囲の雛形。各社展開時は `SLA-<社名>-<YYYYMM>.md` にコピーして数値を入れる |

---

## 4. 設計決定記録（ADR）

| ADR | タイトル | 概要 |
|---|---|---|
| ADR-0001 | Drizzle ORM の採用 | ORMの選定理由 |
| ADR-0002 | NextAuth v5 採用 | 認証基盤の選定・Better Auth移行ロードマップ |
| ADR-0003 | Vercel Multi-Zones | 13社展開のURL構造 |
| ADR-0004 | RLSでテナント分離 | 13社データを物理分離するRLS設計 |
| ADR-0005 | 用語統一 | 「案件/deal」等の用語ブレを防ぐ規約 |
| ADR-0006 | メンバー識別色 | memberId hashによる決定論的色生成 |
| ADR-0007 | 売上モデル簡略化 | 請求期間モデルをPhase 2送りにした経緯 |
| ADR-0008 | basePath設計 | Next.js内部basePath不使用の理由 |
| ADR-0009 | 監査ログimmutable化 | DELETE/UPDATE/TRUNCATEを物理ブロックする設計 |
| ADR-0010 | 粗利カラム追加 | deals テーブルへの外注費・粗利・粗利率の追加 |
| ADR-0011 | RBAC DB参照型 | ロール定義をDBで管理する設計（13社展開対応） |
| ADR-0012 | JWT即時無効化 | 退職者セッションをDBステータス再確認で切断する設計 |
| ADR-0013 | 主観確度カラム | deals テーブルへのA〜E確度の追加 |
| ADR-0014 | AIプロンプト外出し | `src/lib/ai/prompts/` への移行設計（次フェーズ実装） |

全ADR一覧：`docs/adr/` ディレクトリ

---

## 5. 運用・保守

| ドキュメント | 場所 | 概要 |
|---|---|---|
| エラーアラートポリシー | `docs/error-alert-policy.md` | Sentryアラート条件・エスカレーションフロー |
| RLSロールアウト | `docs/rls-rollout.md` | RLS適用の手順書 |
| デザインシステム | `docs/design-system.md` | UIコンポーネント規約・コアリスデザイン原則 |
| MoneyForward統合設計 | `docs/MONEYFORWARD_INTEGRATION.md` | 販管費実績の自動取得（env投入待ち） |
| 用語集 | `docs/adr/0005-glossary-strict.md` | 開発・業務で使う用語の統一定義 |

---

## 6. 隊長GO待ち項目（家族では触らない）

| 項目 | 内容 | 作業詳細 |
|---|---|---|
| 本番deploy | `vercel deploy --prod` の実行 | セキュリティヘッダ（CSP/HSTS）を本番に反映する |
| GitHub Secrets設定 | CI用のsecret 3本投入 | `DATABASE_URL_CI` / `AUTH_SECRET_CI` / `ANTHROPIC_API_KEY_CI` を GitHub repo Settings → Secrets に登録 |
| drizzle-orm アップデート | `0.45.2` へのバージョンアップ | SQL injection脆弱性（GHSA-gpj5-g38j-94v9）の根本修正。breaking changeのため36 Server Actionsで動作確認が必要 |
| プロンプト外出し実装 | ADR-0014 Phase 2〜3 | 詳細は `docs/adr/0014-ai-prompts-externalize.md` の移行手順を参照。7〜8時間。6/8営業開始後で可 |

---

## 7. プロンプト外出し 着手手順（ADR-0014 具体化）

**隊長GOが出たら即着手できる状態。現在は設計のみ完了・コード未着手。**

### Phase 1：ディレクトリ作成（30分）

```bash
mkdir -p src/lib/ai/prompts/_base
mkdir -p src/lib/ai/prompts/_overrides/tripot
```

`src/lib/ai/prompts/index.ts` を新規作成：

```typescript
import type { CompanyConfig } from '@/coaris.config';
import { TRIPOT_CONFIG } from '@/coaris.config';

type PromptModule = {
  buildPrompt: (config: CompanyConfig) => string;
};

export async function getPrompt(
  routeName: string,
  config: CompanyConfig
): Promise<string> {
  const companyId = config.id;
  try {
    const override = await import(`./_overrides/${companyId}/${routeName}`) as PromptModule;
    return override.buildPrompt(config);
  } catch {
    const base = await import(`./_base/${routeName}`) as PromptModule;
    return base.buildPrompt(config);
  }
}
```

### Phase 2：固有文言あり6本を先行移行（優先順）

| 順番 | ファイル | 固有文言の場所 | 置き換え変数 |
|---|---|---|---|
| 1 | `generate-budget/route.ts` L62〜L73、L187 | `IT受託開発（tripot）` / `粗利率25-35%` / `Tripot経営方針` | `config.name`（会社名）/ 粗利率は `CompanyConfig` に `grossProfitRange` フィールドを追加して渡す（Phase 1 で型拡張が必要） |
| 2 | `generate-proposal/route.ts` L133 | `トライポット株式会社のシニアセールスエンジニア` | `config.name` |
| 3 | `generate-requirement/route.ts` L65 | `IT受託開発（tripot）のシニア要件定義者` | `config.name` / `config.industryFields?.type` |
| 4 | `import-reply/route.ts` L54 | `tripot（IT受託開発会社）` | `config.name` / `config.industryFields?.type` |
| 5 | `chat/route.ts` L15 | `tripot（IT受託開発会社）` | `config.name` / `config.industryFields?.type` |
| 6 | `generate-estimate/route.ts` L51 | `IT受託開発（tripot）` | `config.name` / `config.industryFields?.type` |

各ルートの移行ステップ：

1. `_base/<routeName>.ts` を新規作成し `buildPrompt(config)` として移植
2. `route.ts` の `const SYSTEM_PROMPT = ...` を `const SYSTEM_PROMPT = await getPrompt('<routeName>', TRIPOT_CONFIG)` に差し替え
3. `npm run type-check && npm run test` で確認（1本ごとに実行）

### Phase 3：残り9本の移行（3〜4時間）

`generate-email`, `generate-sitemap`, `generate-tasks`, `morning-brief`, `next-action`, `optimize-work`, `recommend-assignee`, `risk-score`, `summarize-meeting`

固有文言は少ないが、`buildPrompt(config)` 形式に統一するために移行する。
config引数を受け取っても使わないプロンプトは `(_config: CompanyConfig) => string` で型を通す。

### Phase 4：ADR更新 + 展開チェックリスト更新（30分）

- `docs/adr/0014-ai-prompts-externalize.md` の Status を `Accepted` に変更
- `docs/13-company-rollout-checklist.md` に「prompts/_overrides/<会社ID>/ の確認」を追加

---

*納品索引 v1.0 / 2026-06-07 / 戻しルールv0.1準拠（本番deploy未実行・backup取得済）*
