'use client';

import { useState, useEffect } from 'react';
import { logEmailSent, getEmailLogsByContext } from '@/lib/emailLog';

export type RecentContact = {
  id: string;
  name: string;
  company: string;
  title: string;
  email: string;
  exchangedAt: string;
};

const STORAGE_KEY = 'coaris_recent_contacts';
const ATTACK_DEALS_KEY = 'coaris_attack_to_deals';

function buildThanksMail(contact: RecentContact): string {
  const subject = encodeURIComponent(`先日の名刺交換のお礼 — ${contact.name}様`);
  const body = encodeURIComponent(
    `${contact.company}\n${contact.name} 様\n\n先日はお名刺交換の機会をいただきありがとうございました。\n株式会社コアリスホールディングスの[あなたの名前]です。\n\n今後ともどうぞよろしくお願い申し上げます。\n\n---\n[署名]`
  );
  return `mailto:${contact.email}?subject=${subject}&body=${body}`;
}

function buildApptMail(contact: RecentContact): string {
  const subject = encodeURIComponent(`ご面談のご相談 — ${contact.name}様`);
  const body = encodeURIComponent(
    `${contact.company}\n${contact.name} 様\n\n先日はお名刺交換いただきありがとうございました。\n改めてお時間をいただき、詳しくお話しできればと思いご連絡しました。\n\n以下の日程はいかがでしょうか。\n\n候補①：4月15日（水）14:00〜15:00\n候補②：4月16日（木）11:00〜12:00\n候補③：4月17日（金）16:00〜17:00\n\nご都合のよろしい日時をお知らせいただければ幸いです。\n\nよろしくお願いいたします。\n\n---\n[署名]`
  );
  return `mailto:${contact.email}?subject=${subject}&body=${body}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function AddContactModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: RecentContact) => void }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [title, setTitle] = useState('');
  const [email, setEmail] = useState('');
  const [exchangedAt, setExchangedAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !company.trim()) {
      setError('氏名と会社名は必須です');
      return;
    }
    onAdd({
      id: `rc-${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      title: title.trim(),
      email: email.trim(),
      exchangedAt,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-6 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-900 mb-4">連絡先を追加</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" aria-live="polite">{error}</p>
          )}

          <div>
            <label htmlFor="rc-name" className="block text-xs font-semibold text-gray-700 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              id="rc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="rc-company" className="block text-xs font-semibold text-gray-700 mb-1">
              会社名 <span className="text-red-500">*</span>
            </label>
            <input
              id="rc-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="rc-title" className="block text-xs font-semibold text-gray-700 mb-1">
              役職
            </label>
            <input
              id="rc-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="rc-email" className="block text-xs font-semibold text-gray-700 mb-1">
              メールアドレス
            </label>
            <input
              id="rc-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="rc-date" className="block text-xs font-semibold text-gray-700 mb-1">
              交換日 <span className="text-red-500">*</span>
            </label>
            <input
              id="rc-date"
              type="date"
              value={exchangedAt}
              onChange={(e) => setExchangedAt(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 active:scale-[0.98] transition-all"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              追加する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RecentContactsStrip() {
  const [contacts, setContacts] = useState<RecentContact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setContacts(JSON.parse(raw) as RecentContact[]);
      }
    } catch {
      setContacts([]);
    }
  }, []);

  const persistContacts = (updated: RecentContact[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
    setContacts(updated);
  };

  const handleAdd = (c: RecentContact) => {
    const updated = [c, ...contacts];
    persistContacts(updated);
    setShowModal(false);
    showToast(`${c.name}さんを追加しました`);
  };

  const handleDeal = (contact: RecentContact) => {
    try {
      const raw = localStorage.getItem(ATTACK_DEALS_KEY);
      const existing: { id: string }[] = raw ? JSON.parse(raw) : [];
      const dealId = `rc-deal-${contact.id}`;
      if (existing.some((d) => d.id === dealId)) {
        showToast(`${contact.company} は既に案件登録済みです`);
        return;
      }
      const newDeal = {
        id: dealId,
        clientName: contact.company,
        dealName: `${contact.company} 新規案件`,
        revenueType: 'shot',
        industry: 'その他',
        stage: 'lead',
        amount: 0,
        probability: 20,
        assignee: '柏樹 久美子',
        lastDate: new Date().toISOString().slice(0, 10),
        memo: `名刺交換（${contact.name} ${contact.title}）から案件化`,
      };
      localStorage.setItem(ATTACK_DEALS_KEY, JSON.stringify([...existing, newDeal]));
      showToast(`${contact.company} を案件管理に追加しました`);
    } catch {
      showToast('案件化に失敗しました');
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  const handleSendEmail = (contact: RecentContact, mailType: 'thanks' | 'appt') => {
    const subject = mailType === 'thanks'
      ? `先日の名刺交換のお礼 — ${contact.name}様`
      : `ご面談のご相談 — ${contact.name}様`;
    const url = mailType === 'thanks' ? buildThanksMail(contact) : buildApptMail(contact);
    logEmailSent({ to: contact.email, subject, contextType: 'contact', contextId: contact.id });
    window.open(url, '_blank', 'noopener,noreferrer');
    showToast(`${contact.name}さんへメールを開きました`);
  };

  const sorted = [...contacts].sort(
    (a, b) => new Date(b.exchangedAt).getTime() - new Date(a.exchangedAt).getTime()
  );

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-sm pointer-events-none">
          ✓ {toast}
        </div>
      )}

      {showModal && (
        <AddContactModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">最近の連絡先</h2>
            <p className="text-xs text-gray-500 mt-0.5">名刺交換した順に並んでいます</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 active:scale-[0.98] transition-all"
          >
            + 追加
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-gray-500 mb-3">連絡先がまだありません</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              + 連絡先を追加
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 py-4 pb-5 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {sorted.map((c) => (
              <div
                key={c.id}
                className="min-w-[260px] bg-gray-50 rounded-xl p-4 flex flex-col gap-3 border border-gray-100 shrink-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{c.company}</p>
                    {c.title && (
                      <p className="text-xs text-gray-500 truncate">{c.title}</p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                    {formatDate(c.exchangedAt)}
                  </span>
                </div>

                {(() => {
                  const sentCount = getEmailLogsByContext('contact', c.id).length;
                  return (
                    <>
                      {sentCount > 0 && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full self-start">
                          ✉ {sentCount}通送信済
                        </span>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleSendEmail(c, 'thanks')}
                          className="flex-1 min-w-[72px] text-center px-2 py-2 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] transition-all"
                        >
                          お礼メール
                        </button>
                        <button
                          onClick={() => handleSendEmail(c, 'appt')}
                          className="flex-1 min-w-[72px] text-center px-2 py-2 rounded-lg text-[11px] font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:scale-[0.98] transition-all"
                        >
                          アポ打診
                        </button>
                        <button
                          onClick={() => handleDeal(c)}
                          className="flex-1 min-w-[72px] px-2 py-2 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 active:scale-[0.98] transition-all"
                        >
                          案件化
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ))}

            <button
              onClick={() => setShowModal(true)}
              className="min-w-[120px] h-full min-h-[120px] flex flex-col items-center justify-center gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-600 active:scale-[0.98] transition-all shrink-0"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-xs font-semibold">連絡先を追加</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
