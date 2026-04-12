'use client';

import { useState, useEffect } from 'react';
import type { Deal, CommRecord, ActionTab } from '@/lib/deals/types';
import { ACTION_TABS } from '@/lib/deals/constants';
import { MOCK_COMMS } from '@/lib/deals/mockData';
import { logEmailSent, getEmailLogsByContext, type EmailLog } from '@/lib/emailLog';

type ActionSectionProps = {
  deal: Deal;
  isProductionContext?: boolean;
};

function VoiceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (!SR) setSupported(false);
    }
  }, []);

  const toggleListening = () => {
    if (!supported) return;
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SR();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = value;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + '\n';
        } else {
          interim += result[0].transcript;
        }
      }
      onChange(finalText + (interim ? `...${interim}` : ''));
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : supported
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!supported}>
          {isListening ? (
            <><span className="w-3 h-3 bg-white rounded-full animate-ping" />録音中...タップで停止</>
          ) : (
            <>🎤 声でメモ</>
          )}
        </button>
        {!supported && <p className="text-xs text-gray-500 self-center">※ Chrome推奨</p>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        placeholder={"打ち合わせの内容をメモしてください...\n（音声入力 or テキスト。走り書きOK。AIが整形します）"}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-gray-500"
      />
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          マイクが聞いています...
        </div>
      )}
    </div>
  );
}

function MeetingTabContent({ deal, meetings: initialMeetings }: { deal: Deal; meetings: CommRecord[] }) {
  const [voiceText, setVoiceText] = useState('');
  const [minutesGenerating, setMinutesGenerating] = useState(false);
  const [minutesResult, setMinutesResult] = useState('');
  const [extractedNeeds, setExtractedNeeds] = useState<string[]>([]);
  const [showNeedsExtracted, setShowNeedsExtracted] = useState(false);
  const [savedMeetings, setSavedMeetings] = useState<CommRecord[]>([]);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const meetings = [...savedMeetings, ...initialMeetings];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`coaris_meetings_${deal.id}`);
      if (raw) setSavedMeetings(JSON.parse(raw) as CommRecord[]);
    } catch {}
  }, [deal.id]);

  const saveMinutesToMeeting = () => {
    if (!minutesResult) return;
    const newMeeting: CommRecord = {
      id: `meeting_${Date.now()}`,
      date: new Date().toLocaleDateString('ja-JP'),
      type: 'meeting',
      title: `打合せ記録 ${new Date().toLocaleDateString('ja-JP')}`,
      summary: minutesResult.slice(0, 200),
      needs: extractedNeeds.length > 0 ? extractedNeeds : undefined,
    };
    const updated = [newMeeting, ...savedMeetings];
    setSavedMeetings(updated);
    try {
      localStorage.setItem(`coaris_meetings_${deal.id}`, JSON.stringify(updated));
    } catch {}
    setMinutesResult('');
    setVoiceText('');
    setShowNeedsExtracted(false);
    setExtractedNeeds([]);
    setShowVoiceInput(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const generateMinutes = async () => {
    if (!voiceText.trim()) return;
    setMinutesGenerating(true);
    try {
      const res = await fetch('/api/deals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-minutes',
          dealName: deal.dealName,
          voiceText,
          assignee: deal.assignee,
        }),
      });
      const data = await res.json();
      const minutes = data.minutes || `# 議事録: ${deal.dealName}\n\n${voiceText}`;
      setMinutesResult(minutes);
      try {
        const existing = JSON.parse(localStorage.getItem(`coaris_minutes_${deal.id}`) || '[]') as string[];
        localStorage.setItem(`coaris_minutes_${deal.id}`, JSON.stringify([minutes, ...existing].slice(0, 10)));
      } catch {}
      if (data.needs && data.needs.length > 0) {
        setExtractedNeeds(data.needs);
        setShowNeedsExtracted(true);
        try {
          const existing = JSON.parse(localStorage.getItem(`coaris_needs_${deal.id}`) || '[]') as string[];
          const merged = [...new Set([...data.needs, ...existing])];
          localStorage.setItem(`coaris_needs_${deal.id}`, JSON.stringify(merged));
        } catch {}
      }
    } catch {
      setMinutesResult(`# 議事録: ${deal.dealName}\n**日時:** ${new Date().toLocaleDateString('ja-JP')}\n\n## 内容\n${voiceText}`);
    }
    setMinutesGenerating(false);
  };

  return (
    <div>
      {saveToast && (
        <div className="mb-3 text-center text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-xl py-2">
          打合せ記録を保存しました ✓
        </div>
      )}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setShowVoiceInput(true)}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all duration-200">
          + 打合せを記録
        </button>
      </div>
      {meetings.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-3">打合せの記録がありません</p>
      )}
      {meetings.length > 0 && (
        <div className="space-y-2 mb-3">
          {meetings.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">打ち合わせ</span>
                <span className="text-xs text-gray-500">{c.date}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{c.summary}</p>
              {c.needs && c.needs.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.needs.map((n, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">{n}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {showVoiceInput && <div className="space-y-3 mt-2">
        <VoiceInput value={voiceText} onChange={setVoiceText} />
        {voiceText.trim() && (
          <button
            onClick={generateMinutes}
            disabled={minutesGenerating}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all duration-200">
            {minutesGenerating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                議事録を整形中...
              </span>
            ) : 'AIで議事録に整形'}
          </button>
        )}
        {minutesResult && (
          <div className="space-y-3">
            {showNeedsExtracted && extractedNeeds.length > 0 && (
              <div className="border border-blue-200 rounded-xl bg-blue-50 p-3">
                <p className="text-xs font-semibold text-blue-700 mb-2">ニーズを抽出しました</p>
                <div className="flex flex-wrap gap-1.5">
                  {extractedNeeds.map((n, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                      <span className="text-red-400 font-semibold">{i + 1}</span>
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-900">生成された議事録</span>
                <button onClick={saveMinutesToMeeting} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium active:scale-[0.98]">保存</button>
              </div>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{minutesResult}</pre>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}

function EmailTabContent({ deal, emails }: { deal: Deal; emails: CommRecord[] }) {
  const [emailDraft, setEmailDraft] = useState('');
  const [emailGenerating, setEmailGenerating] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sentLogs, setSentLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    setSentLogs(getEmailLogsByContext('deal', deal.id));
  }, [deal.id]);

  const comms = MOCK_COMMS[deal.id] ?? [];
  const allNeeds = comms.flatMap((c) => c.needs ?? []);

  const generateEmail = async () => {
    setEmailGenerating(true);
    try {
      const commsHistory = comms.slice(0, 3).map((c) => `[${c.date}] ${c.type}: ${c.title} - ${c.summary}`).join('\n');
      const res = await fetch('/api/deals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-email',
          dealName: deal.dealName,
          clientName: deal.clientName,
          assignee: deal.assignee,
          industry: deal.industry,
          commsHistory,
          allNeeds,
        }),
      });
      const data = await res.json();
      setEmailDraft(data.text || `${deal.clientName}\nご担当者様\n\nお世話になっております。トライポット株式会社の${deal.assignee}です。\n\n${deal.dealName}につきまして、ご連絡いたします。\n\n何卒よろしくお願いいたします。\n\nトライポット株式会社\n${deal.assignee}`);
    } catch {
      setEmailDraft(`${deal.clientName}\nご担当者様\n\nお世話になっております。トライポット株式会社の${deal.assignee}です。\n\n${deal.dealName}につきまして、ご連絡いたします。\n\n何卒よろしくお願いいたします。\n\nトライポット株式会社\n${deal.assignee}`);
    }
    setEmailGenerating(false);
  };

  return (
    <div>
      {!emailDraft && (
        <button
          onClick={generateEmail}
          disabled={emailGenerating}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-medium disabled:opacity-40 active:scale-[0.98] transition-all duration-200 mb-3">
          {emailGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </span>
          ) : 'AIでメールを作成'}
        </button>
      )}
      {emails.length === 0 && !emailDraft && (
        <p className="text-sm text-gray-500 text-center py-3">メールのやり取りがありません</p>
      )}
      {emails.length > 0 && !emailDraft && (
        <div className="space-y-2">
          {emails.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">メール</span>
                <span className="text-xs text-gray-500">{c.date}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{c.summary}</p>
            </div>
          ))}
        </div>
      )}
      {emailDraft && (
        <div className="space-y-2">
          <textarea
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
          />
          {draftSaved && (
            <p className="text-xs text-gray-600 font-medium">下書きを保存しました ✓</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                let to = '';
                try {
                  const raw = localStorage.getItem('coaris_customers');
                  if (raw) {
                    const arr = JSON.parse(raw) as Array<{ companyName: string; contactEmail: string }>;
                    const hit = arr.find((c) => c.companyName === deal.clientName);
                    if (hit?.contactEmail) to = hit.contactEmail;
                  }
                } catch {}
                const lines = emailDraft.split('\n');
                const subject = `${deal.dealName}の件`;
                const body = lines.slice(2).join('\n').trim() || emailDraft;
                const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                logEmailSent({ to, subject, contextType: 'deal', contextId: deal.id, actor: deal.assignee });
                window.open(gmail, '_blank');
              }}
              className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-200">
              Gmailで開く
            </button>
            <button
              onClick={() => {
                setDraftSaved(true);
                setTimeout(() => { setDraftSaved(false); setEmailDraft(''); }, 2000);
              }}
              className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-200">
              下書き保存
            </button>
            <button
              onClick={() => setEmailDraft('')}
              className="px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all duration-200">
              再生成
            </button>
          </div>
        </div>
      )}
      {sentLogs.length > 0 && (
        <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 active:scale-[0.98] transition-all">
            <span>過去のメール送信履歴 ({sentLogs.length}通)</span>
            <span className="text-gray-500 text-xs">{historyOpen ? '▲' : '▼'}</span>
          </button>
          {historyOpen && (
            <div className="divide-y divide-gray-100">
              {sentLogs.map((log) => (
                <div key={log.id} className="px-4 py-3">
                  <p className="text-sm text-gray-800">{log.subject}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 tabular-nums">
                      {new Date(log.sentAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {log.to && <span className="text-xs text-gray-500 truncate max-w-[160px]">{log.to}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GMeetTabContent({ deal }: { deal: Deal }) {
  const [copied, setCopied] = useState(false);
  const mockLink = `https://meet.google.com/mock-${deal.id}-link`;

  const copyLink = () => {
    navigator.clipboard.writeText(mockLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <button className="w-full py-3.5 rounded-xl bg-blue-600 text-white text-sm font-medium active:scale-[0.98] transition-all duration-200">
        Google Meetを作成
      </button>
      <button
        onClick={copyLink}
        className="w-full py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all duration-200">
        {copied ? '✓ コピーしました' : '会議リンクをコピー'}
      </button>
      <div className="py-6 text-center">
        <p className="text-sm text-gray-500">まだオンライン会議の記録はありません</p>
        <p className="text-xs text-gray-500 mt-1">将来 Google Calendar と連携予定</p>
      </div>
    </div>
  );
}

function CallTabContent({ deal, calls }: { deal: Deal; calls: CommRecord[] }) {
  return (
    <div>
      <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all duration-200 mb-3">
        + 電話メモを記録
      </button>
      {calls.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-3">電話の記録がありません</p>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">電話</span>
                <span className="text-xs text-gray-500">{c.date}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
              <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{c.summary}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ActionSection({ deal, isProductionContext }: ActionSectionProps) {
  const [actionTab, setActionTab] = useState<ActionTab>('meeting');
  const comms = MOCK_COMMS[deal.id] ?? [];
  const meetings = comms.filter((c) => c.type === 'meeting');
  const emails = comms.filter((c) => c.type === 'email');
  const calls = comms.filter((c) => c.type === 'call');

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-base">💬</span>
          <p className="text-sm font-semibold text-gray-900">{isProductionContext ? '制作メモ・打合せ' : 'アクション'}</p>
        </div>
        {isProductionContext && (
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
            制作フェーズ
          </span>
        )}
      </div>
      {isProductionContext && (
        <p className="text-xs text-gray-500 mb-3">
          ここから先の記録は制作フェーズに関するメモとして扱われます
        </p>
      )}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
        {ACTION_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActionTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 px-1 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[0.98] ${
              actionTab === tab.id
                ? 'bg-white shadow-sm text-gray-900 font-semibold'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      {actionTab === 'meeting' && <MeetingTabContent deal={deal} meetings={meetings} />}
      {actionTab === 'email' && <EmailTabContent deal={deal} emails={emails} />}
      {actionTab === 'gmeet' && <GMeetTabContent deal={deal} />}
      {actionTab === 'call' && <CallTabContent deal={deal} calls={calls} />}
    </div>
  );
}
