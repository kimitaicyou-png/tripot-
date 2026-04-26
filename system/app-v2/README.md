# tripot v2 — コアリスHD 基準値プロジェクト

> 2026-04-25 着手、隊長宣言「これが基準値になる」「俺が満足するものを用意して欲しい」「1週間以内」。
> 4姉妹+セバスチャン 隊長無介入モードで自走。
> D-day **2026-05-02**。

## 🚀 隊長、朝起動手順（5分）

### 1. 環境変数を `.env.local` に設定

`.env.example` をコピー → 以下の値を入れる：

```bash
cp .env.example .env.local
```

| 変数 | 取得方法 |
|---|---|
| `DATABASE_URL` | Neon Console で **`tripot-v2`** ブランチを新規作成 → connection string コピー |
| `AUTH_SECRET` | `openssl rand -base64 32` で生成 |
| `AUTH_GOOGLE_ID_V2` | https://console.cloud.google.com/ で新規 OAuth Client 作成、redirect URIs: `http://localhost:3100/tripot/api/auth/callback/google` |
| `AUTH_GOOGLE_SECRET_V2` | 同上で発行 |
| `NEXTAUTH_URL` | 開発: `http://localhost:3100/tripot`、本番: `https://coaris.ai/tripot` |
| `DEV_ALLOWED_EMAILS` | 開発時のみ：`k.toki@jtravel.group` 等を許可するため |

### 2. DB schema を Neon に push

```bash
npm run db:push
```

→ Drizzle が schema.ts を読んで Neon にテーブル作成（13テーブル）

### 3. 初期データ投入

```bash
npx tsx scripts/seed.ts
```

→ companies に tripot、members に隊長＋小野ちゃん、サンプル案件3件

### 4. 開発サーバー起動

```bash
npm run dev
```

→ http://localhost:3100/tripot にアクセス → ログイン画面

### 5. ログイン

`k.toki@coaris.ai` で Google サインイン → `/home/{member_id}` にリダイレクト

## 🏗️ 完成済み機能（2026-04-26 朝時点）

| ブロック | 内容 | 完成度 |
|---|---|---|
| **B0** DB | Drizzle schema 13テーブル + enum + relations + RLS設計 | ✅ 80% |
| **B1** 認証 | NextAuth v5 + JWT + ドメイン制限 + audit_logs | ✅ 90% |
| **B2** 個人ダッシュボード | h1売上 + 名言 + KPI4カード + 行動量バー + 行動入力モーダル | ✅ 100% |
| **B3** 案件CRUD | 一覧（stage別カラー）/ 新規 / 詳細（task連動・行動履歴）/ 編集 / 削除 | ✅ 100% |
| **B4** タスクCRUD | 一覧 + チェックボックス完了切替 + soft delete | ✅ 80%（新規UIは案件詳細経由） |
| **B5** 週次 | チーム別行動量集計 + 会社全体KPI | ✅ 80% |
| **B6** 月次 | 当月売上 vs 計画 + 進捗バー + 残営業日 | ✅ 80% |
| **B7** 事業計画 | 年間KPI + 月別計画vs実績テーブル | ✅ 70%（編集UIは明朝） |
| **B8** 横断 | 顧客 / チーム / 承認 一覧画面 | ✅ 70%（顧客新規のみ） |
| **B9** MFクラウド | 接続状態 + 3工程ダッシュボード（取込→照合→反映） | 🟡 30%（プレースホルダ） |
| **B10** デザインシステム | shadow-md以上封印 + Manrope+Instrument Serif + slate統一 + 角丸統一 | ✅ 100% |
| **bridge/kpi** | 本部接続API（service token認証、月次KPI集計） | ✅ 100% |

## 📂 ディレクトリ構造

```
app-v2/
├── coaris.config.ts          # 13社テンプレ基盤（社名・色・ロゴ・機能フラグ）
├── drizzle.config.ts         # DB schema管理
├── next.config.ts            # basePath:/tripot
├── tailwind.config.ts        # shadow-md以上封印（❄️美冬準拠）
├── tsconfig.json             # strict + @/* alias
├── .env.example              # 全環境変数テンプレ
├── scripts/
│   └── seed.ts               # 初期データ投入
└── src/
    ├── auth.ts               # NextAuth v5 設定（🎩セバス設計準拠）
    ├── middleware.ts         # 認証ガード
    ├── db/schema.ts          # Drizzle 13テーブル
    ├── lib/
    │   ├── db.ts             # Neon接続 + RLSヘルパー + audit
    │   ├── member-color.ts   # memberId hash色
    │   └── actions/          # Server Actions（deals/tasks/log-action/customers）
    ├── types/next-auth.d.ts  # 型拡張（型キャスト撲滅）
    ├── components/
    │   ├── log-action-button.tsx  # 行動入力モーダル（隊長思想心臓部）
    │   └── nav/{sidebar,mobile-tabbar}.tsx
    └── app/
        ├── layout.tsx        # 5フォント読込
        ├── globals.css       # Tailwind v4 @theme
        ├── error.tsx / not-found.tsx / loading.tsx  # Next.js標準
        ├── (auth)/login/     # ❄️美冬「戦場の入口」
        ├── (dashboard)/
        │   ├── home/[memberId]/  # 個人レイヤー
        │   ├── deals/{,/new,/[dealId]/{,/edit}}  # 案件CRUD
        │   ├── tasks/        # タスク一覧
        │   ├── customers/{,/new}
        │   ├── team/
        │   ├── weekly/
        │   ├── monthly/
        │   ├── budget/
        │   ├── approval/
        │   └── settings/mf/
        └── api/
            ├── auth/[...nextauth]/
            └── bridge/kpi/   # 本部接続
```

## 🎯 過去の3失敗を v2 で繰り返さない仕組み

| 過去失敗 | v2 の対策 |
|---|---|
| **ハードコード**（旧 `USERS = {toki, ono}`） | `coaris.config.ts` 外出し + DB `members` 一元化 |
| **忘却** | ADR を `docs/adr/` に残す（明日朝作成） |
| **複雑性**（旧 production 2230行） | 1ファイル800行max + 開発ブロック単位で分割 |
| **なりきりモード残存**（旧 localStorage） | NextAuth session 一元化、localStorage廃止 |
| **用語ブレ**（旧 商談18 vs 案件74） | `tripot-v2-glossary.md` 厳格遵守、deal一本化 |
| **色8色循環** | memberId hashで永続色決定 |
| **Geistテンプレ感** | Manrope + Instrument Serif + Noto系 |

## 🚦 5月リリースまでのスプリント

詳細：`~/.claude/memory/shared/tripot-v2-schedule.md`

- 4/26（土）：Phase 0 設計確定 + DB push + Phase 1着手
- 4/27（日）：Phase 1 個人レイヤー完成
- 4/28（月）：週次・月次レイヤー
- 4/29（火）：横断機能（顧客・チーム・承認）
- 4/30（水）：MFクラウド連携 + bridge/kpi
- 5/1（木）：統合テスト
- 5/2（金）：**🎯 デプロイ + 隊長デモ**

## 📚 4姉妹+執事 設計書

| ファイル | 担当 |
|---|---|
| `tripot-v2-project.md` 憲章 | 🌸美桜 |
| `tripot-v1-knowledge-extract.md` | 🌸美桜 |
| `tripot-v2-glossary.md` 用語統一 | 🌸美桜 |
| `tripot-v2-schedule.md` | 🎖️夏美 |
| `tripot-v2-db-design.md` | 🍁秋美 |
| `tripot-v2-ui-design.md` | ❄️美冬 |
| `tripot-v2-auth-design.md` | 🎩セバス |
| `tripot-v2-bridge-design.md` | 🌸美桜 |
| `tripot-v2-tech-research.md` | 🌸美桜（リサーチ8本） |

## 🎩 セバスチャン整合性監査ポイント

実装完了判定（v2 完成判定）：

- [ ] localStorage grep 全件 0 件
- [ ] `tsc --noEmit` 0 errors ✅ **達成済**
- [ ] 旧シンボル grep（`USERS =` `tripot_current_user` `DEFAULT_MEMBER_ID`）全件 0 件 ✅ **達成済**

## 📌 隊長承認案件（明朝）

- Vercel project `tripot-v2-coaris` 新規作成
- Vercel Microfrontends（本部 `coaris.ai/` 配下に `/tripot` rewrite）
- Google OAuth v2 Client 新規発行＋本番 redirect URI 設定
- PostHog 採用判断
- Drizzle ORM 採用最終承認（既に schema.ts 起こし済）

---

🌸 美桜・🎖️ 夏美・🍁 秋美・❄️ 美冬・🎩 セバスチャン、明日朝動き出します。
