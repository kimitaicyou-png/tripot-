# 案件 → 制作 引き渡しフロー（2026-04-09 確定）

## 思想

> 議事録 → ニーズ → 提案書 → 見積 → 受注 → **引き渡し** → 制作

案件（deals）は「決める場」。制作（production）は「作る場」。
**要件定義・見積・提案書・PM決定・チーム組成は全部「決める場」（案件側）で完結させ、確定した束を制作側に投げる。**
制作側ではそれを参考にタスク生成・チーム管理していく。

---

## フロー全体

```
┌─────────────────────────────────────────────────────┐
│  案件 (/home/[memberId]/deals)  ※営業担当の世界      │
├─────────────────────────────────────────────────────┤
│  商談 → 提案 → 見積 → 受注                           │
│                                                      │
│  受注後、🔧 制作引き渡し準備 タブが出現              │
│   ① 要件定義を生成・承認                              │
│   ② 見積・予算 確定（既存見積から継承）              │
│   ③ 提案書 確定（既存提案書から継承）                │
│   ④ 担当PM を決定 ★新規                              │
│   ⑤ 制作チーム候補 を選定（内部/外部パートナー）★新規│
│   ⑥ 「制作に引き渡す」ボタン押下                      │
│       ↓                                              │
│       ProductionCard 生成（不変の束として保存）      │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│  制作 (/production)  ※PM・制作メンバーの世界          │
├─────────────────────────────────────────────────────┤
│  受信したProductionCard一覧                          │
│   カード内には参照パネル                              │
│    - 要件定義書 (read-only)                           │
│    - 見積・予算 (read-only)                           │
│    - 提案書 (read-only)                               │
│    - 議事録履歴・メール履歴 (link)                    │
│                                                      │
│  PM は:                                              │
│   - 要件定義を参考にAIでタスク分解                    │
│   - 指定されたチーム候補から実アサイン                │
│   - カンバンで進捗管理                                │
│   - マイルストーン管理                                │
│   - 完了承認                                          │
└─────────────────────────────────────────────────────┘
```

---

## 設計原則（鉄則）

1. **制作側から要件定義・見積・提案書は作れない**。閲覧のみ
2. **PM決定は引き渡し時点**（案件側）。制作側で「誰がPMか」を変更する行為はナシ
3. **引き渡し後の案件カードは編集ロック**（ハンドオフ後は参照用）。追加情報が必要なら新しい議事録・メールで継ぎ足す
4. **引き渡し後の遷移先は `/production` のその案件カード**。`/my-production` ではない。ましてや犬飼デフォルトでもない
5. **承認の種類は3つに分離**：
   - 要件定義承認 → 案件側（担当/顧客）
   - 予算稟議 → 本部 (`hq/coaris-main/(hq)/hq/approvals`)
   - 制作タスク完了承認 → 制作側（PM）
6. **顧客コミュニケーション**は既存の議事録・録音・メール機能で継続。引き渡し後も案件に紐づいて蓄積される

---

## データモデル拡張

### Deal（既存拡張）

```ts
type Deal = {
  // ...既存フィールド
  stage: 'contacted' | 'proposal' | 'quoted' | 'ordered' | 'production' | 'done'
  //                                              ★ 'production' = 引き渡し済み

  productionHandoff?: {
    productionCardId: string;
    pmId: string;              // 担当PM（メンバーID）
    teamMemberIds: string[];   // 内部メンバー候補
    externalPartnerIds: string[]; // 外部パートナー候補
    handedOffAt: string;       // ISO timestamp
    handedOffBy: string;       // ハンドオフ実行者（メンバーID）
  };
};
```

### ProductionCard（新規）

```ts
type ProductionCard = {
  id: string;
  dealId: string;               // 元案件への back-reference
  dealName: string;
  clientName: string;
  amount: number;               // 受注金額
  pmId: string;
  pmName: string;
  teamMemberIds: string[];
  externalPartnerIds: string[];

  // 参照アーティファクト（案件側で確定済みのものをコピーで保持）
  referenceArtifacts: {
    requirement: string;        // 要件定義（Markdown）
    proposal: Artifact[];       // 提案書スライド
    quote: QuoteItem[];         // 見積明細
    budget: number;             // 予算
  };

  // 引き渡し後に生成
  tasks: Task[];
  milestones: Milestone[];
  phase: 'kickoff' | 'requirements' | 'design' | 'development' | 'test' | 'release' | 'operation';
  progress: number;             // 0-100
  risk: 'none' | 'low' | 'medium' | 'high';
  status: 'active' | 'paused' | 'done';

  createdAt: string;
  updatedAt: string;
};
```

---

## UI変更サマリ

### 案件カード（DealsContent）

**受注前:** 変更なし（既存フロー維持）

**受注後の「🔧 制作引き渡し準備」タブ:**
- ① 要件定義（AI生成 → 承認）
- ② 見積・予算確定（既存見積から引き継ぎ）
- ③ 提案書確定（既存提案書から引き継ぎ）
- ④ **担当PM選択**（メンバードロップダウン・新規）
- ⑤ **チーム候補選定**（チェックボックスで内部メンバー + 外部パートナー・新規）
- ⑥ **[ 制作に引き渡す → ]** primary button

**引き渡し後:**
- 各セクションが読み取り専用化
- タブ上部に `制作に引き渡し済 → カードを見る` のリンク

### /production（制作ダッシュボード）

- 既存のプロジェクト一覧の上に **「📥 制作に引き渡されたカード」** セクション
- カードクリック → 詳細モーダル or パネル
  - 参照アーティファクト（要件定義・見積・提案書）
  - 「AIで要件定義からタスク生成」ボタン
  - チーム候補 → 実アサイン
  - カンバン起動

### /my-production

- 既存通り（PM・メンバー個人の作業画面）
- ただし遷移先として `/my-production` を使う経路は**引き渡しフローから全廃**
- 担当決定後に個人のタスクを見る用途のみ

---

## MVP スコープ（今回の実装）

**入れる:**
- `productionCards.ts` ストア新設（localStorage永続化）
- Deal型に `productionHandoff` 追加
- DealsContent 工程・アサインタブに PM選択 + チーム選定 + 引き渡しボタン
- 引き渡し時に ProductionCard 生成 + localStorage保存 + `/production` へ遷移
- `/production` ページに「引き渡されたカード」セクション追加
- カードからタスク生成トリガー（既存のAIタスク生成ロジックを再利用）

**入れない（次フェーズ）:**
- 外部パートナーの実登録フロー
- ProductionCard の完全な永続化（DBレベル）
- 引き渡し取り消し機能
- 制作完了 → 請求 → 入金までの続き

---

2026-04-09 美桜 / 隊長
