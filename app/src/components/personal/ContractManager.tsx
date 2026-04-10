'use client';

import { useState } from 'react';
import { usePersistedState } from '@/lib/hooks/usePersistedState';

type ContractType = 'nda' | 'master' | 'service' | 'individual' | 'po';

type Contract = {
  id: string;
  name: string;
  type: ContractType;
  status: 'draft' | 'sent' | 'signed' | 'expired';
  fileUrl?: string;
  sentDate?: string;
  signedDate?: string;
  expiryDate?: string;
  memo?: string;
};

const CONTRACT_TEMPLATES: Record<ContractType, { name: string; description: string; firstTime: boolean }> = {
  nda:        { name: '秘密保持契約書（NDA）',     description: '提案前の情報共有を保護',         firstTime: true  },
  master:     { name: '基本契約書',                description: '取引条件・支払い・知財の枠組み', firstTime: true  },
  service:    { name: '業務委託契約書',            description: '業務範囲・責任分担',             firstTime: true  },
  individual: { name: '個別契約書',                description: '案件ごとの納期・金額・成果物',   firstTime: true  },
  po:         { name: '発注書',                    description: '2回目以降の取引に使用',         firstTime: false },
};

const STATUS_LABEL: Record<Contract['status'], string> = {
  draft: '下書き',
  sent: '送付済み',
  signed: '締結済み',
  expired: '期限切れ',
};

const STATUS_BADGE: Record<Contract['status'], string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-amber-50 text-amber-700 border border-amber-200',
  signed: 'bg-blue-50 text-blue-700 border border-blue-200',
  expired: 'bg-red-50 text-red-600 border border-red-200',
};

const STATUS_NEXT: Record<Contract['status'], Contract['status'][]> = {
  draft: ['sent'],
  sent: ['signed', 'draft'],
  signed: ['expired'],
  expired: [],
};

const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'con1',
    name: '業務委託基本契約書',
    type: 'service',
    status: 'signed',
    sentDate: '2026-03-10',
    signedDate: '2026-03-15',
    expiryDate: '2027-03-14',
    memo: '年間自動更新。解約通知は3ヶ月前必要。',
  },
  {
    id: 'con2',
    name: '秘密保持契約書（NDA）',
    type: 'nda',
    status: 'sent',
    sentDate: '2026-04-01',
    memo: '先方の法務確認中。',
  },
];

function StatusNextButton({
  current,
  next,
  onChangeStatus,
}: {
  current: Contract['status'];
  next: Contract['status'];
  onChangeStatus: (s: Contract['status']) => void;
}) {
  const labels: Record<Contract['status'], string> = {
    draft: '下書きに戻す',
    sent: '送付済みにする',
    signed: '締結済みにする',
    expired: '期限切れにする',
  };
  return (
    <button
      onClick={() => onChangeStatus(next)}
      className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
    >
      {labels[next]}
    </button>
  );
}

function AddContractModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-xl w-full sm:max-w-md">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">契約書を追加</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form className="p-5 space-y-4" onSubmit={(e) => { e.preventDefault(); onClose(); }}>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              契約書名 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
              placeholder="業務委託契約書"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">有効期限</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">メモ</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
              placeholder="備考・注意事項"
            />
          </div>
          <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            追加する
          </button>
        </form>
      </div>
    </div>
  );
}

type Props = {
  dealStage?: string;
  isFirstDeal?: boolean;
  hasProposal?: boolean;
  hasEstimate?: boolean;
  clientName?: string;
  dealName?: string;
  dealAmount?: number;
  onStatusChange?: (contractName: string, status: Contract['status']) => void;
};

function generateContractBody(type: ContractType, ctx: { clientName: string; dealName: string; dealAmount: number }): string {
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
  const amountStr = ctx.dealAmount > 0 ? `金${ctx.dealAmount.toLocaleString()}円（消費税別）` : '別途見積書に定める金額';
  const head = `${ctx.clientName}（以下「甲」という。）と トライポット株式会社（以下「乙」という。）は、`;

  if (type === 'nda') {
    return `秘密保持契約書

${head}甲乙間における「${ctx.dealName}」に関する協議・取引（以下「本目的」という。）に際し、相互に開示する秘密情報の取扱いについて、次のとおり契約を締結する。

第1条（秘密情報の定義）
本契約における秘密情報とは、本目的のために甲乙間で開示される一切の情報のうち、開示時に秘密である旨を明示したもの、及び本契約締結前に開示された情報であっても秘密として取扱うべきことが客観的に明らかなものをいう。

第2条（秘密保持義務）
1. 甲及び乙は、相手方の事前の書面による承諾なしに、秘密情報を第三者に開示又は漏洩してはならない。
2. 甲及び乙は、秘密情報を本目的以外に使用してはならない。
3. 甲及び乙は、秘密情報を本目的のために必要最小限の役員及び従業員にのみ開示するものとする。

第3条（例外）
次の各号に該当する情報は、秘密情報に含まれない。
(1) 開示の時点で既に公知である情報
(2) 開示後に受領者の責によらず公知となった情報
(3) 受領者が独自に開発した情報
(4) 法令又は裁判所の命令により開示が義務付けられた情報

第4条（有効期間）
本契約の有効期間は、締結日から1年間とする。ただし、本契約終了後3年間は秘密保持義務を負うものとする。

第5条（損害賠償）
甲又は乙が本契約に違反した場合、相手方は被った損害の賠償を請求することができる。

第6条（協議事項）
本契約に定めのない事項及び本契約の解釈について疑義が生じた場合は、甲乙誠意をもって協議し解決するものとする。

以上、本契約の成立を証するため本書2通を作成し、甲乙記名押印のうえ各1通を保有する。

${today}

甲: ${ctx.clientName}
乙: トライポット株式会社`;
  }

  if (type === 'master') {
    return `業務委託基本契約書

${head}乙が甲に対し業務を委託することに関し、その基本的事項を定めることを目的として、次のとおり契約を締結する。

第1条（目的）
本契約は、甲乙間の業務委託取引に共通して適用される基本的事項を定めるものとする。具体的な業務内容、納期、報酬等は、個別契約において定めるものとする。

第2条（個別契約）
1. 甲乙は、個別の取引ごとに業務内容、納期、報酬、支払条件等を定めた個別契約を締結するものとする。
2. 個別契約の内容が本契約と矛盾する場合は、個別契約の内容を優先する。

第3条（報酬及び支払）
1. 業務の対価は個別契約に定める金額とする。
2. 乙は業務完了後、甲に対し請求書を発行する。
3. 甲は請求書受領月の翌月末日までに、乙の指定する銀行口座に振込により支払う。振込手数料は甲の負担とする。

第4条（成果物の権利帰属）
本業務により生じた成果物の知的財産権は、対価の完済をもって甲に移転する。ただし、乙が従前より保有する知的財産権及び汎用的な技術・ノウハウは乙に留保される。

第5条（秘密保持）
甲乙は、本契約に関連して知り得た相手方の秘密情報を第三者に漏洩してはならない。本義務は本契約終了後も3年間存続する。

第6条（再委託）
乙は、甲の事前の書面による承諾なしに、本業務の全部又は一部を第三者に再委託することができない。

第7条（契約解除）
甲又は乙は、相手方が本契約に違反し、相当期間を定めた催告にもかかわらず是正されない場合、本契約を解除することができる。

第8条（損害賠償）
甲又は乙は、本契約の履行に関し相手方に損害を与えた場合、その損害を賠償する責を負う。ただし、賠償額は当該個別契約の報酬額を上限とする。

第9条（有効期間）
本契約の有効期間は、締結日から1年間とする。期間満了の3ヶ月前までに甲乙いずれからも書面による申出がない場合、本契約は同条件で1年間自動更新され、以後同様とする。

第10条（合意管轄）
本契約に関する一切の紛争については、名古屋地方裁判所を第一審の専属的合意管轄裁判所とする。

${today}

甲: ${ctx.clientName}
乙: トライポット株式会社`;
  }

  if (type === 'service') {
    return `業務委託契約書（${ctx.dealName}）

${head}「${ctx.dealName}」に関する業務の委託について、次のとおり契約を締結する。

第1条（業務内容）
乙は甲に対し、以下の業務（以下「本業務」という。）を委託し、甲はこれを受託する。
業務名: ${ctx.dealName}
業務概要: 提案書記載のとおり

第2条（業務遂行）
甲は本業務を、善良なる管理者の注意をもって遂行する。

第3条（委託料）
本業務の委託料は ${amountStr} とする。

第4条（支払条件）
1. 着手金（30%）: 契約締結後7日以内
2. 中間金（30%）: 中間成果物の納品時
3. 検収後（40%）: 最終成果物の検収完了後

第5条（成果物の納品）
甲は個別契約に定める納期までに成果物を乙に納品する。

第6条（検収）
乙は成果物受領後10営業日以内に検収を行い、合否を甲に通知する。期間内に通知がない場合は検収合格とみなす。

第7条（契約不適合責任）
乙は検収完了後3ヶ月以内に成果物の契約不適合を発見した場合、甲に対し修補を請求することができる。

第8条（再委託）
甲は乙の書面承諾なしに本業務を第三者に再委託することができない。

第9条（その他）
本契約に定めのない事項は、甲乙間の業務委託基本契約書の定めるところによる。

${today}

甲: ${ctx.clientName}
乙: トライポット株式会社`;
  }

  if (type === 'individual') {
    return `個別契約書（${ctx.dealName}）

${head}基本契約書第2条に基づき、次のとおり個別契約を締結する。

1. 業務名
   ${ctx.dealName}

2. 業務内容
   提案書記載の内容に従い、システムの設計・開発・導入支援を行う。

3. 委託料
   ${amountStr}

4. 支払条件
   着手30% / 中間30% / 検収40%
   各回とも請求月の翌月末日払い

5. 納期
   契約締結日より約3ヶ月後（詳細は別途スケジュール表に定める）

6. 成果物
   ・要件定義書
   ・基本設計書
   ・本番稼働環境
   ・操作マニュアル

7. 検収
   納品後10営業日以内に乙が検収を実施する。

8. 担当窓口
   甲側: トライポット株式会社 担当者
   乙側: ${ctx.clientName} 担当者

本個別契約に定めなき事項については、業務委託基本契約書の定めに従う。

${today}

甲: ${ctx.clientName}
乙: トライポット株式会社`;
  }

  return `発注書

発注先: トライポット株式会社 御中
発注日: ${today}
発注者: ${ctx.clientName}

下記のとおり発注いたします。

────────────────────────────
件名: ${ctx.dealName}
金額: ${amountStr}
納期: 別途協議
支払条件: 検収後翌月末払い
────────────────────────────

本発注は、貴社との間で締結済みの業務委託基本契約書の条件に基づくものです。

ご査収のほどよろしくお願いいたします。

${ctx.clientName}`;
}

function PreviewModal({
  contract,
  body,
  onClose,
  onSave,
}: {
  contract: { id: string; type: ContractType; name: string };
  body: string;
  onClose: () => void;
  onSave: (id: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(contract.id, draft);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handlePdf = () => {
    const safeText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>${safeText(contract.name)}</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  body { font-family: "Hiragino Mincho ProN", "Yu Mincho", "MS Mincho", serif; color: #111; line-height: 1.85; font-size: 11.5pt; }
  h1 { font-size: 17pt; text-align: center; margin: 0 0 24pt; letter-spacing: 0.1em; }
  pre { white-space: pre-wrap; font-family: inherit; font-size: inherit; margin: 0; }
  .footer { margin-top: 36pt; text-align: right; font-size: 10pt; color: #555; }
</style></head><body>
<pre>${safeText(draft)}</pre>
<div class="footer">トライポット株式会社 ・ コアリスAI で作成</div>
<script>window.addEventListener('load', () => { setTimeout(() => window.print(), 200); });</script>
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">AI生成済み {editing && '・編集中'}</p>
            <h2 className="text-base font-semibold text-gray-900">{contract.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs font-semibold text-emerald-600">✓ 保存しました</span>}
            {!editing ? (
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-2 py-1">
                編集
              </button>
            ) : (
              <button onClick={() => { setDraft(body); setEditing(false); }} className="text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors px-2 py-1">
                編集をやめる
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-600 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[60vh] p-5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
              <pre className="text-sm text-gray-900 leading-loose whitespace-pre-wrap font-serif">{draft}</pre>
            </div>
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex gap-2">
          {editing ? (
            <>
              <button onClick={() => { setDraft(body); setEditing(false); }} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                キャンセル
              </button>
              <button onClick={handleSave} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                変更を保存
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
                閉じる
              </button>
              <button onClick={handlePdf} className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                PDFで出力
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractManager({ dealStage, isFirstDeal = true, hasProposal = false, hasEstimate = false, clientName = 'クライアント', dealName = '本案件', dealAmount = 0, onStatusChange }: Props) {
  const [contracts, setContracts] = usePersistedState<Contract[]>('contracts', MOCK_CONTRACTS);
  const [contractBodies, setContractBodies] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [generating, setGenerating] = useState<ContractType | null>(null);
  const [previewContract, setPreviewContract] = useState<{ id: string; type: ContractType; name: string } | null>(null);

  const handleChangeStatus = (id: string, status: Contract['status']) => {
    setContracts((prev) => {
      const updated = prev.map((c) => {
        if (c.id !== id) return c;
        const now = new Date().toISOString();
        if (status === 'sent') return { ...c, status, sentDate: now.slice(0, 10) };
        if (status === 'signed') return { ...c, status, signedDate: now.slice(0, 10) };
        return { ...c, status };
      });
      const contract = updated.find((c) => c.id === id);
      if (contract && onStatusChange) onStatusChange(contract.name, status);
      return updated;
    });
  };

  const handleGenerate = (type: ContractType) => {
    setGenerating(type);
    setTimeout(() => {
      const tpl = CONTRACT_TEMPLATES[type];
      const id = `con${Date.now()}`;
      const body = generateContractBody(type, { clientName, dealName, dealAmount });
      const newContract: Contract = {
        id,
        name: tpl.name,
        type,
        status: 'draft',
      };
      setContracts((prev) => [...prev, newContract]);
      setContractBodies((prev) => ({ ...prev, [id]: body }));
      setGenerating(null);
      setPreviewContract({ id, type, name: tpl.name });
    }, 1200);
  };

  const hasSignedContract = contracts.some((c) => c.status === 'signed');
  const showProductionWarning =
    dealStage === 'ordered' && !hasSignedContract && contracts.length > 0;

  const requiredTypes: ContractType[] = isFirstDeal
    ? ['nda', 'master', 'service', 'individual']
    : ['po'];
  const existingTypes = new Set(contracts.map((c) => c.type));
  const missingRequired = requiredTypes.filter((t) => !existingTypes.has(t));

  return (
    <div>
      <div className="mb-3 p-3 bg-blue-50/50 border border-blue-100 rounded-xl">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-base">{isFirstDeal ? '📝' : '🔁'}</span>
          <div className="flex-1">
            <p className="text-xs font-semibold text-blue-900">
              {isFirstDeal ? '初回取引: 4種の契約書が必要です' : '2回目以降の取引: 発注書のみで進められます'}
            </p>
            <p className="text-[11px] text-blue-700/80 mt-0.5">
              {isFirstDeal
                ? '秘密保持・基本契約・業務委託・個別契約をAIが提案書/見積書から自動生成します'
                : '基本契約は締結済み。発注書だけで案件を開始できます'}
            </p>
          </div>
        </div>
        {(!hasProposal || !hasEstimate) && (
          <p className="text-xs text-amber-700 mt-1.5">
            ⚠ 提案書{!hasProposal && '・'}{!hasEstimate && '見積書'}が未作成です。先に作成すると条項に反映されます。
          </p>
        )}
      </div>

      {missingRequired.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">未作成の契約書</p>
          <div className="space-y-1.5">
            {missingRequired.map((type) => {
              const tpl = CONTRACT_TEMPLATES[type];
              const isGen = generating === type;
              return (
                <div key={type} className="flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg bg-white">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{tpl.name}</p>
                    <p className="text-[11px] text-gray-500">{tpl.description}</p>
                  </div>
                  <button
                    onClick={() => handleGenerate(type)}
                    disabled={isGen}
                    className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-lg px-3 py-1.5 active:scale-[0.98] transition-all shrink-0"
                  >
                    {isGen ? (
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        生成中
                      </span>
                    ) : (
                      'AIで生成'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showProductionWarning && (
        <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
          <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-xs font-semibold text-red-700">契約未締結</p>
            <p className="text-xs text-red-600 mt-0.5">締結済みの契約書がありません。制作開始前に契約を締結してください。</p>
          </div>
        </div>
      )}

      {contracts.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">作成済み契約書</p>
          {contracts.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-start justify-between mb-1.5">
                <p className="text-sm font-semibold text-gray-900 flex-1 min-w-0 pr-2">{c.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                {c.sentDate && <span>送付日: {c.sentDate}</span>}
                {c.signedDate && <span>締結日: {c.signedDate}</span>}
                {c.expiryDate && <span>有効期限: {c.expiryDate}</span>}
              </div>
              {c.memo && <p className="text-xs text-gray-500 mb-2">{c.memo}</p>}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => {
                    if (!contractBodies[c.id]) {
                      const body = generateContractBody(c.type, { clientName, dealName, dealAmount });
                      setContractBodies((prev) => ({ ...prev, [c.id]: body }));
                    }
                    setPreviewContract({ id: c.id, type: c.type, name: c.name });
                  }}
                  className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
                >
                  プレビュー
                </button>
                {STATUS_NEXT[c.status].map((next) => (
                  <StatusNextButton
                    key={next}
                    current={c.status}
                    next={next}
                    onChangeStatus={(s) => handleChangeStatus(c.id, s)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-2 border border-dashed border-gray-200 rounded text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
      >
        + 契約書を手動で追加
      </button>

      {showAddModal && <AddContractModal onClose={() => setShowAddModal(false)} />}
      {previewContract && (
        <PreviewModal
          contract={previewContract}
          body={contractBodies[previewContract.id] ?? generateContractBody(previewContract.type, { clientName, dealName, dealAmount })}
          onClose={() => setPreviewContract(null)}
          onSave={(id, body) => setContractBodies((prev) => ({ ...prev, [id]: body }))}
        />
      )}
    </div>
  );
}
