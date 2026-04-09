'use client';

import { useState } from 'react';
import { EstimateIntelligence } from './EstimateIntelligence';

export function EstimateIntelligenceSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">見積インテリジェンス</span>
        <span className="text-xs font-semibold text-gray-500">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>
      {open && (
        <div className="border-t border-gray-200">
          <EstimateIntelligence />
        </div>
      )}
    </div>
  );
}
