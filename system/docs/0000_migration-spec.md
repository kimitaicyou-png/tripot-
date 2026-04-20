# tripot フォルダ構造マイグレーション SPEC

**作成**: 2026-04-20 / 美桜
**Phase**: 1（標準フロー フル版）
**目的**: tripot を wise-assist/deraforce と同じ「system/ 配下集約」新式に揃える

---

## 1. マイグレ範囲

### Before（現状）

```
tripot/
├── .claude/
├── .git/
├── .gitignore         ← 中身「.vercel」のみ
├── .next/             ← ゴミ（ルートビルド跡、app/.next と別物）
├── .vercel/           ← project.json: { projectName: "tripot" }
├── CLAUDE.md          ← 7655バイト
├── README.md
├── app/               ← Next.js本体、package.json name="tripot"
│   ├── .next/
│   ├── scripts/safe-deploy.js
│   └── ...
└── docs/              ← handoff_*.md が5つ散乱、命名バラバラ
```

### After（目標）

```
tripot/
├── .claude/              ← 現状維持（wise-assist準拠なら無くてもよい）
├── .git/
├── .gitignore            ← 更新（後述）
├── README.md             ← 現状維持
└── system/
    ├── CLAUDE.md
    ├── .vercel/          ← ここに移す（※選択肢A）
    ├── app/
    │   └── package.json  ← name: "tripot-system"
    └── docs/
        ├── 0010_*.md     ← 10刻み番号付けし直し
        ├── 0020_*.md
        └── archive/
            └── handoff_*.md  ← 古いhandoffは退避
```

---

## 2. 影響範囲

### 2.1 Vercel（最重要リスク）

**現状**:
- `.vercel/project.json` は **ルート** にある
- projectName: `tripot`（※隊長指示の `tripot-system.vercel.app` と不一致）
- projectId: `prj_asu5uPTygLv8KTMnEaJ5tZZwPmrd`

**問題**:
- `app/` を `system/app/` に動かすと、デプロイコマンドの実行ディレクトリが変わる
- Vercel CLI は `cwd/.vercel/project.json` を見るので、`.vercel/` も一緒に動かさないと参照できない
- Vercel Dashboard の **Root Directory 設定**（おそらく `app`）を `system/app` に変える必要

**選択肢**（**要・隊長判断**）:

| 案 | `.vercel`位置 | Dashboard変更 | vercel.json | 安全性 |
|---|---|---|---|---|
| **A** | `system/.vercel/` へ移動 | Root Dir を `system/app` に変更 | 不要 | △（Dashboard触る） |
| **B** | ルート据え置き | Root Dir 変更不要 | ルートに新設（buildCommand等） | ◎（.vercel不動） |
| **C** | 新規プロジェクト作り直し | 新規 | - | ×（URL変わる、リスク高） |

**美桜の推奨**: **案B**。過去の本番上書き事件の教訓 → `.vercel/project.json` は動かさないのが最安全。

### 2.2 URL 命名の確認（要・隊長回答）

- 現状 `.vercel/project.json` の projectName は `tripot`
- 隊長指示の「既存URL `https://tripot-system.vercel.app` 維持」と不一致
- **確認**: 現行の本番URL は `tripot.vercel.app` or 独自ドメイン？

### 2.3 package.json name 変更

- `"tripot"` → `"tripot-system"`
- Vercel は `.vercel/project.json` で判断するので **Vercel 側に影響なし**
- npm publish しないのでラベルのみ

### 2.4 CLAUDE.md 参照先

- tripot/CLAUDE.md 内の相対パス（`./app/`, `./docs/` 等）を `./system/app/`, `./system/docs/` に置換

### 2.5 .gitignore

- 現状 `.vercel` のみ → **.vercel を git 追跡対象にする好機**（Failed Attempts A-1 対策）
- 新 `.gitignore`: `node_modules`, `.next`, `.env*.local`, `!.vercel/`, `!.vercel/project.json` 明示

---

## 3. 手順（実行順）

### Step 0: 事前バックアップ（即実行可）
- [ ] 現状コミット（未コミットあれば）
- [ ] ブランチ切る: `feat/migrate-to-system-structure`
- [ ] tripotルートの `.next/`（ゴミ）を削除

### Step 1: system/ 作成と git mv
- [ ] `mkdir -p system/`
- [ ] `git mv app system/app`
- [ ] `git mv docs system/docs`
- [ ] `git mv CLAUDE.md system/CLAUDE.md`

### Step 2: docs 整理
- [ ] `system/docs/archive/` 作成
- [ ] `handoff_*.md` を archive へ退避
- [ ] 残す文書を `0010_` 〜 `0050_` 番号付け:
  - `0010_design-system.md` ← design-system.md
  - `0020_deal_to_production_flow.md`
  - `0030_dependency_map.md`
  - `0040_rebuild_design_v1.md`
- [ ] `system/docs/0000_migration-spec.md` ← この SPEC をリネーム配置

### Step 3: Vercel対応（選択肢B採用時）
- [ ] ルートに `vercel.json` 新設:
  ```json
  {
    "buildCommand": "cd system/app && npm run build",
    "outputDirectory": "system/app/.next",
    "installCommand": "cd system/app && npm install",
    "devCommand": "cd system/app && npm run dev",
    "framework": "nextjs"
  }
  ```
- [ ] `.vercel/` はルートに据え置き

### Step 4: package.json 更新
- [ ] `system/app/package.json` の name: `"tripot-system"`

### Step 5: CLAUDE.md 内パス置換
- [ ] `./app/` → `./system/app/` など相対参照更新

### Step 6: .gitignore 更新（別案件として検討）
- 保留: Vercel 追跡開始は別タスク（影響大）

### Step 7: ローカル検証
- [ ] `cd system/app && npm install`（念のため）
- [ ] `cd system/app && npm run build` → 成功確認
- [ ] `cd system/app && npm run dev` → localhost:3100 動作確認

### Step 8: 本番デプロイ（**隊長明示許可必須**）
- [ ] `npm run deploy` (system/app配下から safe-deploy.js 経由)
- [ ] 本番URL動作確認

---

## 4. ロールバック手順

各ステップで問題発覚時の戻し方:

### Step 1 失敗時
```bash
git reset --hard HEAD  # コミット前なら
# or
git checkout main && git branch -D feat/migrate-to-system-structure
```

### Step 3 (Vercel) 失敗時
- `vercel.json` を削除して元に戻す
- .vercel/project.json は動かしていないので Vercel 側は無傷

### Step 7 ビルド失敗時
- パス参照エラー → CLAUDE.md、next.config.js、tsconfig.json のパス確認
- 最悪: `git revert` で mv コミット戻す

### Step 8 デプロイ失敗時
- Vercel Dashboard で前回デプロイに Promote
- ブランチを main に merge しない

---

## 5. 要・隊長判断事項（★先に回答必要）

1. **Vercel 対応は案A・B・C どれ？**（推奨B）
2. **現行本番URLは何？**（`tripot.vercel.app` or 独自ドメイン or `tripot-system.vercel.app`?）
3. **package.json name 変更 必須？**（Vercel影響ないが、念のため確認）
4. **`.gitignore` の `.vercel` 追跡開始はこの機会にやる？別タスク？**
5. **`.claude/` は現状通りルート据え置きでOK？**（wise-assistには無いがtripotにはある）

---

## 6. Tier 判定

- Tier 1（単発マイグレ）
- 実装 2-3h 想定（検証含む）
- フル版 Phase 0〜4 回す（隊長指示）
- destructive: Step 8 のみ（明示許可必須）

---

## 7. Failed Attempts チェック

参照: `~/.claude/skills/隊長と作る標準フロー/Failed_Attempts.md` セクションA

- ✅ A-1「tripot 本番上書き事件」: 案B採用で `.vercel` 不動、リスク回避
- ✅ `rsync` 使わない（git mv のみ）
- ✅ `Link to existing project? → No` 場面は発生しない（リンク変更なし）
