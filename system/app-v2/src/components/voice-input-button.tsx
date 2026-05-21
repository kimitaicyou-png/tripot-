'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

/**
 * Web Speech API を使ったブラウザ音声入力ボタン。
 *
 * 隊長指摘 (2026-05-20)「議事録のページここで録音して、議事録自動生成させるって話」
 * への対応：tripot の心臓部「録音 → 文字起こし → AI 議事録整形 → ニーズ抽出 → 要件定義」
 * の入口を実装。
 *
 * 採用方式：Web Speech API（ブラウザネイティブ、無料、新規 env 不要、Chrome/Safari 対応）
 * - Chrome / Edge / Safari で動く（Firefox は SpeechRecognition 未対応）
 * - 日本語認識（lang='ja-JP'）
 * - final transcript のみ採用（interim は不安定）
 * - 将来 OpenAI Whisper API 等への切替可能な抽象化（onTranscript callback パターン）
 *
 * 使い方：
 *   <VoiceInputButton onTranscript={(text) => setRawText(prev => prev + '\n' + text)} />
 */

type SpeechRecognitionEvent = {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceInputButton({
  onTranscript,
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    setSupported(Boolean(Ctor));
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  function start() {
    if (recording) return;
    setErrorMsg(null);
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setErrorMsg('このブラウザは音声認識に未対応です（Chrome / Safari / Edge をお使いください）');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result.isFinal) {
          const text = result[0]?.transcript?.trim();
          if (text) onTranscript(text);
        }
      }
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setErrorMsg('マイク権限が拒否されました。ブラウザ設定で許可してください');
      } else if (event.error === 'no-speech') {
        // 無音タイムアウト、停止扱い
      } else {
        setErrorMsg(`音声認識エラー：${event.error}`);
      }
      setRecording(false);
    };
    recognition.onend = () => {
      setRecording(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '起動失敗';
      setErrorMsg(msg);
      setRecording(false);
    }
  }

  function stop() {
    recognitionRef.current?.stop();
    setRecording(false);
  }

  if (!supported) {
    return (
      <div className="text-xs text-gray-500">
        音声入力は Chrome / Safari / Edge で利用可能
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={recording ? stop : start}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg active:scale-[0.98] transition-all duration-150 ${
          recording
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        aria-label={recording ? '音声入力を停止' : '音声入力を開始'}
      >
        {recording ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            録音中… クリックで停止
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5" />
            マイクで議事録を入力
          </>
        )}
      </button>
      {recording && (
        <span className="text-xs text-gray-500">
          話した内容が文字に起こされ、下の欄に追記されます
        </span>
      )}
      {errorMsg && (
        <span className="inline-flex items-center gap-1 text-xs text-red-700">
          <MicOff className="w-3.5 h-3.5" />
          {errorMsg}
        </span>
      )}
    </div>
  );
}
