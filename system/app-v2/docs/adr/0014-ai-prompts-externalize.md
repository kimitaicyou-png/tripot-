# ADR-0014: AIプロンプトを src/lib/ai/prompts/ に外出し

**Status**: Proposed
**Date**: 2026-06-07
**Deciders**: 夏美（設計）

## Context

現状、全15本のAIルート（chat, generate-budget, generate-email 等）が `route.ts` 内に
プロンプト文字列をハードコードしている。

問題点：
1. プロンプトを変えるたびにコードデプロイが必要
2. 「tripot」「トライポット株式会社」等の会社固有文言が5本に混入しており、13社展開時に各社コピーを作るとプロンプト管理が破綻する
3. プロンプトのバージョン追跡ができない（git blame でコード変更と混在）

## Decision

プロンプトを `src/lib/ai/prompts/` に外出しし、`coaris.config.ts` との2層構造にする。

```
src/lib/ai/prompts/
├── _base/               ← 全社共通プロンプト（会社固有文言なし）
│   ├── chat.ts
│   ├── generate-budget.ts
│   ├── generate-email.ts
│   ├── generate-estimate.ts
│   ├── generate-proposal.ts
│   ├── generate-requirement.ts
│   ├── generate-sitemap.ts
│   ├── generate-tasks.ts
│   ├── import-reply.ts
│   ├── morning-brief.ts
│   ├── next-action.ts
│   ├── optimize-work.ts
│   ├── recommend-assignee.ts
│   ├── risk-score.ts
│   └── summarize-meeting.ts
├── _overrides/          ← 社別オーバーライド（任意）
│   └── tripot/
│       └── generate-budget.ts   ← tripot固有の粗利率設定などがある場合のみ
└── index.ts             ← getPrompt(routeName, config) を export
```

`index.ts` の責務：

```typescript
import { TRIPOT_CONFIG } from '@/coaris.config';

export function getPrompt(
  routeName: string,
  config: typeof TRIPOT_CONFIG
): string {
  const companyId = config.id;
  const overridePath = `./_overrides/${companyId}/${routeName}`;
  const override = tryImport(overridePath);
  if (override) return override.buildPrompt(config);

  const base = import(`./_base/${routeName}`);
  return base.buildPrompt(config);
}
```

各プロンプトファイルの形式：

```typescript
import type { CompanyConfig } from '@/coaris.config';

export function buildPrompt(config: CompanyConfig): string {
  return `あなたは ${config.name}（${config.industryFields?.type ?? 'IT'}）の営業支援AIです。
...
`;
}
```

## Rationale

- `coaris.config.ts` が「UIと機能フラグの会社別設定」を担当
- `src/lib/ai/prompts/` が「AIの振る舞いの会社別設定」を担当
- この2層が揃うと、コアロジックをコピーせずに会社別カスタマイズがconfig層で完結する
- 13社それぞれに `generate-budget.ts` を個別管理する必要がなくなる

## Consequences

### Positive
- プロンプト変更 = route.tsのデプロイ不要（将来的にDB管理にも移行しやすい）
- 会社固有文言（「tripot」「粗利率25-35%」等）を config 引数で注入できる
- プロンプトの変更をgit logで独立追跡できる
- 新社展開時：`_overrides/<新社名>/` に1ファイル追加するだけでカスタマイズ完結

### Negative
- 移行コスト：15本 × プロンプト抽出の作業（1本あたり30分、合計7〜8時間）
- `route.ts` がプロンプトをimportする形に変わるため、各ルートの修正が必要
- 動的import + 型整合の実装が必要（`getPrompt` の型安全な実装）

## Alternatives Considered

### A: プロンプト専用DBテーブル（`ai_prompts` テーブル）
- ホットフィックスが最速（デプロイ不要）
- ただしDB依存 = 開発環境構築の複雑化、gitによるバージョン管理が外れる
- MVP段階では過剰。13社展開フル運用時に再検討

### B: 現状維持（route.ts内ハードコード）
- 1社展開であれば問題なし
- 13社展開時にコピー管理が破綻する（tripot用修正を13ファイルに適用し忘れるリスク）

## 移行手順（4フェーズ）

### Phase 1：ディレクトリ作成 + index.ts（30分）
- `src/lib/ai/prompts/_base/` ディレクトリ作成
- `src/lib/ai/prompts/index.ts` に `getPrompt()` 関数実装

### Phase 2：会社固有文言あり5本を先行移行（2時間）
優先順：固有文言が多いものから。
1. `generate-budget`（tripot固有粗利率設定あり）
2. `generate-proposal`（「トライポット株式会社」直書き）
3. `generate-requirement`（tripot思想フロー言及）
4. `import-reply`（tripot直書き）
5. `chat`（tripot直書き）

各ルートで：
1. `_base/<routeName>.ts` に `buildPrompt(config)` として切り出し
2. `route.ts` で `import { getPrompt } from '@/lib/ai/prompts'` に差し替え
3. `npm run type-check && npm run test` で確認

### Phase 3：残り10本を移行（3時間）
会社固有文言なし（config引数はあるが即変数置換なし）。

### Phase 4：ADR更新 + 13社展開チェックリスト更新（30分）

## References

- ADR-0003 Vercel Multi-Zones（13社展開構造）
- `coaris.config.ts`（CompanyConfig型定義）
- `src/lib/ai/client.ts`（callText/callJson標準ラッパー）
- 議案1-C調査：council/topic1c-system-delivery-engineer.md
