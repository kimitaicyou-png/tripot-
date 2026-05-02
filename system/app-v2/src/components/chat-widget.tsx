'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const INITIAL_GREETING: Message = {
  role: 'assistant',
  content:
    'こんにちは、コアリスAIです。\n営業や案件についての相談、考え方の整理、なんでも聞いてください。',
};

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_GREETING]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.message === 'string' ? data.message : `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const data = (await res.json()) as { reply: string };
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-36 md:bottom-24 right-6 z-40 w-14 h-14 bg-blue-600 text-white rounded-full shadow-sm hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center"
        aria-label="コアリスAIに話しかける"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-50 md:bg-transparent"
        onClick={() => setOpen(false)}
      />
      <div className="fixed left-0 right-0 bottom-0 md:left-auto md:right-6 md:bottom-6 md:w-96 md:max-h-[70vh] z-50">
        <div className="bg-white rounded-t-xl md:rounded-xl border border-gray-200 flex flex-col max-h-[80vh] md:max-h-[70vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">コアリスAI</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-700 hover:text-gray-900 leading-none"
              aria-label="閉じる"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={
                    m.role === 'user'
                      ? 'max-w-[85%] px-4 py-2 bg-blue-600 text-white rounded-2xl rounded-br-sm whitespace-pre-wrap text-sm'
                      : 'max-w-[85%] px-4 py-2 bg-gray-100 text-gray-900 rounded-2xl rounded-bl-sm whitespace-pre-wrap text-sm'
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="px-4 py-2 bg-gray-100 text-gray-700 rounded-2xl rounded-bl-sm flex items-center gap-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  考えてます…
                </div>
              </div>
            )}
            {error && (
              <div className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                エラー: {error}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as FormEvent);
                }
              }}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-label="送信"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
