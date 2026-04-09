'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { addProductionCard, buildProductionCard, updateProductionCard } from '@/lib/productionCards';
import { loadAllDeals, saveAllDeals } from '@/lib/dealsStore';
import Link from 'next/link';
import { KanbanBoard, type KanbanColumn, type KanbanCard } from '@/components/ui/KanbanBoard';
import DealArtifacts, { MOCK_ARTIFACTS, MOCK_GROSS_MARGIN_RATES } from '@/components/personal/DealArtifacts';
import NextAction, { MOCK_NEXT_ACTIONS, type NextActionData } from '@/components/personal/NextAction';
import RunningEstimateSection, { MOCK_RUNNING_ITEMS, type RunningItem } from '@/components/personal/RunningEstimateSection';
import ContractManager from '@/components/personal/ContractManager';
import LostDealRecord, { type LostReason, REASON_LABEL } from '@/components/personal/LostDealRecord';
import ProposalVersions from '@/components/personal/ProposalVersions';
import ProposalPresentation from '@/components/personal/ProposalPresentation';
import { logEmailSent, getEmailLogsByContext, type EmailLog } from '@/lib/emailLog';
import { getPartners, addPartner, type ExternalPartner } from '@/lib/externalPartners';
import { MEMBERS } from '@/lib/currentMember';
import { sendNotification } from '@/lib/notifications';

import { InternalComments, MOCK_COMMENTS } from '@/components/personal/InternalComments';
type Stage =
  | 'lead'
  | 'meeting'
  | 'proposal'
  | 'estimate_sent'
  | 'negotiation'
  | 'ordered'
  | 'in_production'
  | 'delivered'
  | 'acceptance'
  | 'invoiced'
  | 'accounting'
  | 'paid'
  | 'claim'
  | 'claim_resolved'
  | 'lost';

const STAGE_LABEL: Record<Stage, string> = {
  lead:           'リード',
  meeting:        '商談',
  proposal:       '提案',
  estimate_sent:  '見積提出',
  negotiation:    '交渉中',
  ordered:        '受注',
  in_production:  '制作中',
  delivered:      '納品',
  acceptance:     '検収',
  invoiced:       '請求済',
  accounting:     '経理処理中',
  paid:           '入金済',
  claim:          'クレーム',
  claim_resolved: 'クレーム解決',
  lost: '失注',
};

const STAGE_BADGE: Record<Stage, string> = {
  lead:           'bg-gray-100 text-gray-700',
  meeting:        'bg-blue-50 text-blue-700 border border-blue-200',
  proposal:       'bg-blue-50 text-blue-700 border border-blue-200',
  estimate_sent:  'bg-blue-50 text-blue-700 border border-blue-200',
  negotiation:    'bg-gray-100 text-gray-700',
  ordered:        'bg-blue-50 text-blue-700 border border-blue-200',
  in_production:  'bg-blue-100 text-blue-800 border border-blue-300',
  delivered:      'bg-blue-50 text-blue-700 border border-blue-200',
  acceptance:     'bg-blue-50 text-blue-700 border border-blue-200',
  invoiced:       'bg-gray-100 text-gray-700',
  accounting:     'bg-gray-100 text-gray-600',
  paid:           'bg-gray-100 text-gray-500',
  claim:          'bg-red-50 text-red-700 border border-red-200',
  claim_resolved: 'bg-gray-100 text-gray-600',
  lost: 'bg-gray-100 text-gray-500',
};

const CLAIM_NEXT_STAGES: Partial<Record<Stage, Stage[]>> = {
  claim: ['claim_resolved'],
  claim_resolved: ['invoiced', 'paid'],
};

const SALES_STAGES: Stage[] = ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation', 'ordered'];
const PRODUCTION_STAGES: Stage[] = ['in_production', 'delivered', 'acceptance'];
const BILLING_STAGES: Stage[] = ['invoiced', 'accounting', 'paid'];

export type HistoryEventType =
  | 'stage_change'
  | 'proposal_sent'
  | 'estimate_sent'
  | 'contract_sent'
  | 'contract_signed'
  | 'invoice_sent'
  | 'paid'
  | 'email_sent'
  | 'file_attached'
  | 'note';

export type HistoryEvent = {
  id: string;
  at: string;
  type: HistoryEventType;
  title: string;
  description?: string;
  actor?: string;
};

export type Deal = {
  id: string;
  clientName: string;
  dealName: string;
  industry: string;
  stage: Stage;
  amount: number;
  probability: number;
  assignee: string;
  lastDate: string;
  memo: string;
  revenueType: 'shot' | 'running';
  monthlyAmount?: number;
  runningStartDate?: string;
  progress?: number;
  invoiceDate?: string;
  paymentDue?: string;
  paidDate?: string;
  invoice?: {
    status: 'none' | 'draft' | 'sent' | 'paid';
    issuedAt?: string;
    paidAt?: string;
    amount?: number;
    memo?: string;
  };
  history?: HistoryEvent[];
  attachments?: Array<{
    id: string;
    kind: 'figma' | 'link' | 'google_doc' | 'sheet' | 'slide' | 'pdf' | 'image' | 'other';
    title: string;
    url: string;
    addedAt: string;
    addedBy?: string;
  }>;
  process?: DealProcess;
};

type ProcessTask = {
  id: string;
  title: string;
  dueDate?: string;
  assigneeType: 'internal' | 'external' | 'unassigned';
  internalMemberId?: string;
  externalPartnerId?: string;
  hours?: number;
  note?: string;
};

type DealProcess = {
  requirementsGenerated: boolean;
  requirementsDoc?: string;
  wbsGenerated: boolean;
  tasks?: ProcessTask[];
  committedToProduction: boolean;
  committedAt?: string;
  // 制作引き渡し: 担当PMとチーム候補
  pmId?: string;
  teamMemberIds?: string[];
  handoffCardId?: string;
};

type Filter = 'active' | 'estimate' | 'ordered' | 'production' | 'handed_off' | 'billing' | 'running' | 'claim' | 'lost' | 'all';

type Claim = {
  id: string;
  date: string;
  content: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved';
  assignee: string;
  response?: string;
};

const MOCK_CLAIMS: Record<string, Claim[]> = {
  'd1': [
    { id: 'cl1', date: '2026-04-03', content: '提案書の技術構成に質問あり。セキュリティ面の説明が不足との指摘。', severity: 'major', status: 'in_progress', assignee: '柏樹 久美子', response: '追加資料を準備中' },
  ],
};

export const MOCK_DEALS_INIT: Deal[] = [
  { id: 'd1',  clientName: 'トライポット株式会社',   dealName: 'SaaSプラットフォーム開発',  revenueType: 'shot',    industry: '製造業',      stage: 'estimate_sent', amount: 6500000, probability: 60,  assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: '最終見積書を提出済み。先方決裁待ち。' },
  { id: 'd2',  clientName: '株式会社中京メディカル',  dealName: '電子カルテAPI連携',         revenueType: 'shot',    industry: '医療',        stage: 'meeting',       amount: 0,       probability: 70,  assignee: '柏樹 久美子', lastDate: '2026-04-03', memo: '' },
  { id: 'd3',  clientName: '名古屋市教育委員会',      dealName: '学習管理システム',           revenueType: 'shot',    industry: '官公庁・教育', stage: 'in_production', amount: 8900000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-02', memo: '制作中。フロントエンド実装フェーズ。', progress: 35 },
  { id: 'd4',  clientName: '愛知県信用金庫',          dealName: '内部管理ツール開発',         revenueType: 'shot',    industry: '金融',        stage: 'invoiced',      amount: 2100000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-01', memo: '請求済み。入金待ち。', invoiceDate: '2026-04-01', paymentDue: '2026-04-30' },
  { id: 'd5',  clientName: '株式会社東海ロジスティクス', dealName: '配送管理システム',         revenueType: 'shot',    industry: '物流',        stage: 'paid',          amount: 3500000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-03-31', memo: '入金確認済み。', paidDate: '2026-03-28' },
  { id: 'd6',  clientName: '株式会社名港工業',        dealName: '生産管理DX',                revenueType: 'shot',    industry: '製造業',      stage: 'lead',          amount: 0,       probability: 50,  assignee: '柏樹 久美子', lastDate: '2026-03-30', memo: '' },
  { id: 'd7',  clientName: '有限会社スマート農業',    dealName: 'IoT農業センサー管理',        revenueType: 'shot',    industry: '農業',        stage: 'meeting',       amount: 0,       probability: 60,  assignee: '柏樹 久美子', lastDate: '2026-03-29', memo: '実証実験の提案へ進む予定。' },
  { id: 'd8',  clientName: '医療法人碧会',            dealName: '病院向け患者管理アプリ',     revenueType: 'shot',    industry: '医療',        stage: 'estimate_sent', amount: 5200000, probability: 45,  assignee: '柏樹 久美子', lastDate: '2026-03-27', memo: '見積書提出済み。回答待ち。' },
  { id: 'd9',  clientName: '愛知トヨタ協力工場',      dealName: 'QC管理システム追加開発',     revenueType: 'shot',    industry: '製造業',      stage: 'acceptance',    amount: 4200000, probability: 100, assignee: '犬飼 智之',   lastDate: '2026-03-26', memo: '先方での検収テスト中。', progress: 95 },
  { id: 'd10', clientName: '名古屋市教育委員会',      dealName: '学習管理システム保守',       revenueType: 'running', industry: '官公庁・教育', stage: 'ordered',       amount: 0,       probability: 100, assignee: '犬飼 智之',   lastDate: '2026-04-02', memo: '開発完了後に自動開始', monthlyAmount: 150000,  runningStartDate: '2026-07' },
  { id: 'd11', clientName: '愛知トヨタ協力工場',      dealName: 'QC管理システム保守',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '柏樹 久美子', lastDate: '2026-03-26', memo: '月額保守',         monthlyAmount: 80000,   runningStartDate: '2026-05' },
  { id: 'd12', clientName: '株式会社豊田精工',        dealName: 'ITコンサルティング',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: '月額コンサル。4月より開始。',   monthlyAmount: 300000,  runningStartDate: '2026-04' },
  { id: 'd13', clientName: '和泉クリエイティブ',       dealName: 'ブランドサイト制作',         revenueType: 'shot',    industry: 'IT',          stage: 'ordered',       amount: 2270000, probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '受注済み。デザイン着手中。' },
  { id: 'd14', clientName: '三河電機サービス',           dealName: 'Webサイト運用保守',         revenueType: 'running', industry: '製造業',      stage: 'ordered',       amount: 0,       probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '月額運用サポート。4月より開始。', monthlyAmount: 230000,  runningStartDate: '2026-04' },
];

const INDUSTRY_RATES: Record<string, { label: string; unitPrice: number; unit: string }[]> = {
  '製造業': [
    { label: '要件定義', unitPrice: 800000, unit: '人月' },
    { label: '基本設計', unitPrice: 900000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 750000, unit: '人月' },
    { label: 'テスト', unitPrice: 600000, unit: '人月' },
    { label: 'PM', unitPrice: 1000000, unit: '人月' },
  ],
  '医療': [
    { label: '要件定義', unitPrice: 900000, unit: '人月' },
    { label: '基本設計', unitPrice: 1000000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 850000, unit: '人月' },
    { label: 'テスト（含バリデーション）', unitPrice: 800000, unit: '人月' },
    { label: 'PM', unitPrice: 1100000, unit: '人月' },
  ],
  '金融': [
    { label: '要件定義', unitPrice: 1000000, unit: '人月' },
    { label: '基本設計', unitPrice: 1100000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 900000, unit: '人月' },
    { label: 'テスト・セキュリティ検証', unitPrice: 850000, unit: '人月' },
    { label: 'PM', unitPrice: 1200000, unit: '人月' },
  ],
  '官公庁・教育': [
    { label: '要件定義', unitPrice: 850000, unit: '人月' },
    { label: '基本設計', unitPrice: 950000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 800000, unit: '人月' },
    { label: 'テスト・受入支援', unitPrice: 700000, unit: '人月' },
    { label: 'PM', unitPrice: 1000000, unit: '人月' },
  ],
  default: [
    { label: '要件定義', unitPrice: 800000, unit: '人月' },
    { label: '基本設計', unitPrice: 850000, unit: '人月' },
    { label: '詳細設計・開発', unitPrice: 750000, unit: '人月' },
    { label: 'テスト', unitPrice: 600000, unit: '人月' },
    { label: 'PM', unitPrice: 950000, unit: '人月' },
  ],
};

function getIndustryRates(industry: string) {
  return INDUSTRY_RATES[industry] ?? INDUSTRY_RATES['default'];
}

type SlideType = 'cover' | 'problem' | 'solution' | 'effect' | 'tech' | 'schedule' | 'team' | 'cases' | 'cost' | 'next' | 'custom';

type Slide = {
  type: SlideType;
  title: string;
  bullets: string[];
  note?: string;
};

const scheduleData = [
  { name: '要件定義', start: 0, duration: 2 },
  { name: '基本設計', start: 2, duration: 2 },
  { name: '詳細設計・開発', start: 4, duration: 6 },
  { name: 'テスト', start: 10, duration: 2 },
];

const ChartBarIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ListBulletIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const ChatIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const PencilSquareIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const EnvelopeIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const TargetIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ExclamationIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);
const MicIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
);

function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-gray-500 flex-shrink-0">{icon}</span>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">{label}</p>
    </div>
  );
}

function SlideRenderer({ slide, deal, isPresent }: { slide: Slide; deal: Deal; isPresent: boolean }) {
  const isDark = ['cover', 'tech', 'cost', 'next'].includes(slide.type);
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/80' : 'text-gray-700';
  const titleSize = isPresent ? 'text-4xl md:text-5xl' : 'text-xl';
  const bodySize = isPresent ? 'text-xl md:text-2xl' : 'text-sm';
  const metaSize = isPresent ? 'text-base' : 'text-xs';

  if (slide.type === 'cover') {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col justify-between p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative">
          <span className={`inline-block px-3 py-1 bg-white/10 rounded ${metaSize} text-white/80 font-semibold mb-4`}>SYSTEM PROPOSAL</span>
          <h1 className={`${titleSize} font-semibold text-white leading-tight mb-3`}>{slide.title}</h1>
          <div className={`${bodySize} text-white/60`}>
            {slide.bullets.slice(0, 1).map((b, i) => <p key={i}>{b}</p>)}
          </div>
        </div>
        <div className="relative flex justify-between items-end">
          <div className="space-y-1">
            {slide.bullets.slice(1).map((b, i) => (
              <p key={i} className={`${metaSize} text-white/50`}>{b}</p>
            ))}
          </div>
          <div className="text-right">
            <p className={`${metaSize} text-white/80 font-semibold`}>トライポット株式会社</p>
            <p className={`${metaSize} text-white/40`}>柏樹 久美子</p>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === 'effect') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-2`}>{slide.title}</h2>
        <p className={`${metaSize} text-gray-500 mb-4`}>導入前後の比較（導入前=100として指数化）</p>
        <div className="flex-1 grid grid-cols-1 gap-3">
          {[
            { label: '工数削減', value: '30%削減', sub: '月40h → 月28h' },
            { label: 'コスト削減', value: '20%削減', sub: '運用コスト年間削減' },
            { label: '処理速度向上', value: '45%向上', sub: '業務スループット改善' },
            { label: 'エラー率低減', value: '75%削減', sub: 'ヒューマンエラー解消' },
          ].map((kpi) => (
            <div key={kpi.label} className={`flex items-center gap-3 ${isPresent ? 'p-3' : 'p-2'} bg-gray-50 rounded border border-gray-200`}>
              <div className={`w-0.5 ${isPresent ? 'h-12' : 'h-8'} bg-gray-900 rounded-full shrink-0`} />
              <div>
                <p className={`${isPresent ? 'text-2xl' : 'text-base'} font-semibold text-gray-900`}>{kpi.value}</p>
                <p className={`${metaSize} text-gray-500`}>{kpi.label} — {kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'tech') {
    return (
      <div className="w-full h-full bg-gray-950 flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-white mb-4`}>{slide.title}</h2>
        <div className="flex-1 grid grid-cols-1 gap-3">
          {[
            { layer: 'フロントエンド', items: ['Next.js 15 + TypeScript', 'Tailwind CSS v4', 'Vercel Deploy'] },
            { layer: 'バックエンド / API', items: ['Supabase (PostgreSQL)', 'Row Level Security', 'Realtime Subscriptions'] },
            { layer: 'インフラ / セキュリティ', items: ['Vercel Edge Network', 'JWT認証 + RLS', '暗号化通信 (TLS 1.3)'] },
          ].map((row, ri) => (
            <div key={ri} className="border-l-2 border-gray-600 px-4 py-3 bg-white/5">
              <p className={`${metaSize} text-gray-500 font-semibold uppercase tracking-wider mb-1`}>{row.layer}</p>
              <div className="flex flex-wrap gap-2">
                {row.items.map((item) => (
                  <span key={item} className={`${isPresent ? 'text-base' : 'text-xs'} font-medium text-white/80 bg-white/10 px-3 py-1 rounded`}>{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'schedule') {
    const totalWeeks = 12;
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-4`}>{slide.title}</h2>
        <div className="space-y-3 flex-1">
          {scheduleData.map((row) => (
            <div key={row.name} className="flex items-center gap-3">
              <span className={`${isPresent ? 'text-sm' : 'text-xs'} font-medium text-gray-700 w-28 shrink-0 text-right`}>{row.name}</span>
              <div className="flex-1 relative h-5 bg-gray-100 rounded overflow-hidden">
                <div className="absolute h-full rounded bg-gray-900" style={{ left: `${(row.start / totalWeeks) * 100}%`, width: `${(row.duration / totalWeeks) * 100}%` }} />
              </div>
              <span className={`${isPresent ? 'text-sm' : 'text-xs'} text-gray-500 font-medium w-12 shrink-0`}>{row.duration}週</span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {slide.bullets.map((b, i) => (
            <div key={i} className={`flex items-start gap-2 ${isPresent ? 'p-3' : 'p-2'} bg-gray-50 rounded border border-gray-200`}>
              <span className="text-gray-500 font-semibold shrink-0">{i + 1}.</span>
              <span className={`${bodySize} text-gray-800 font-medium`}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'team') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-4`}>{slide.title}</h2>
        <div className="flex-1 grid grid-cols-2 gap-3">
          {[
            { role: 'プロジェクトマネージャー', name: deal.assignee, desc: '全体統括・顧客折衝' },
            { role: 'フロントエンドエンジニア', name: '担当TBD', desc: 'UI/UX実装・性能最適化' },
            { role: 'バックエンドエンジニア', name: '担当TBD', desc: 'API設計・DB設計' },
            { role: 'QAエンジニア', name: '担当TBD', desc: 'テスト計画・品質保証' },
          ].map((m) => (
            <div key={m.role} className={`${isPresent ? 'p-4' : 'p-3'} bg-gray-50 rounded border border-gray-200`}>
              <p className={`${isPresent ? 'text-sm' : 'text-xs'} text-gray-500 font-medium`}>{m.role}</p>
              <p className={`${isPresent ? 'text-xl' : 'text-sm'} font-semibold text-gray-900`}>{m.name}</p>
              <p className={`${metaSize} text-gray-500`}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'cases') {
    return (
      <div className="w-full h-full bg-white flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-gray-900 mb-2`}>{slide.title}</h2>
        <p className={`${metaSize} text-gray-500 mb-4`}>{deal.industry}業界における類似プロジェクト実績</p>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 bg-gray-50 rounded border border-dashed border-gray-300 w-full">
            <p className={`${isPresent ? 'text-xl' : 'text-base'} font-semibold text-gray-700 mb-2`}>事例データベース構築中</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {['製造業実績: 3社', 'DX支援: 12社', '平均ROI: 180%'].map((tag) => (
                <span key={tag} className={`${metaSize} font-medium px-3 py-1 bg-gray-100 text-gray-700 rounded border border-gray-200`}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === 'cost') {
    const amt = deal.amount > 0 ? deal.amount : 0;
    const tax = Math.round(amt * 0.1);
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col p-6 relative overflow-hidden">
        <h2 className={`${titleSize} font-semibold text-white mb-4 relative`}>{slide.title}</h2>
        {amt > 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <p className="text-white/50 font-medium mb-2">お見積り総額（税別）</p>
            <p className={`${isPresent ? 'text-6xl md:text-8xl' : 'text-4xl'} font-semibold text-white tabular-nums`}>¥{(amt / 10000).toFixed(0)}<span className={`${isPresent ? 'text-3xl' : 'text-xl'}`}>万</span></p>
            <p className="text-white/40 mt-2 tabular-nums">税込: ¥{(amt + tax).toLocaleString()}</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center relative">
            <p className={`${isPresent ? 'text-2xl' : 'text-lg'} font-semibold text-white/70 mb-2`}>別途お見積りいたします</p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {[['開発', '45'], ['設計', '25'], ['テスト', '15'], ['PM', '15']].map(([name, value]) => (
                <span key={name} className="text-xs font-medium px-3 py-1 bg-white/10 text-white/70 rounded">{name}: {value}%</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (slide.type === 'next') {
    const steps = slide.bullets.slice(0, 4);
    return (
      <div className="w-full h-full bg-gray-900 flex flex-col p-6">
        <h2 className={`${titleSize} font-semibold text-white mb-6`}>{slide.title}</h2>
        <div className="flex-1 flex flex-col justify-center">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`${isPresent ? 'w-10 h-10 text-base' : 'w-7 h-7 text-sm'} bg-white/10 border border-white/20 rounded flex items-center justify-center font-semibold text-white shrink-0`}>{i + 1}</div>
                <div className={`flex-1 ${isPresent ? 'p-4' : 'p-3'} bg-white/5 border border-white/10 rounded`}>
                  <p className={`${bodySize} font-medium text-white/80`}>{step.replace(/^\d+\.\s/, '')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full h-full ${isDark ? 'bg-gray-900' : 'bg-white'} flex flex-col p-6`}>
      <h2 className={`${titleSize} font-semibold ${textMain} mb-4`}>{slide.title}</h2>
      <div className="flex-1 space-y-2">
        {slide.bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className={`${isDark ? 'text-gray-500' : 'text-gray-500'} font-medium shrink-0 ${isPresent ? 'text-xl' : 'text-base'}`}>—</span>
            <span className={`${bodySize} ${textSub} font-normal`}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SlideEditorCard({ slide, idx, total, onUpdate, onRemove }: {
  slide: Slide; idx: number; total: number;
  onUpdate: (s: Slide) => void; onRemove: () => void;
}) {
  const isDark = ['cover', 'tech', 'cost', 'next'].includes(slide.type);
  const bgMap: Record<string, string> = {
    cover: 'bg-gray-900',
    problem: 'bg-white border border-gray-200',
    solution: 'bg-white border border-gray-200',
    effect: 'bg-white border border-gray-200',
    tech: 'bg-gray-950',
    schedule: 'bg-white border border-gray-200',
    team: 'bg-white border border-gray-200',
    cases: 'bg-white border border-gray-200',
    cost: 'bg-gray-900',
    next: 'bg-gray-900',
    custom: 'bg-white border border-gray-200',
  };
  const textC = isDark ? 'text-white' : 'text-gray-900';
  const subC = isDark ? 'text-white/70' : 'text-gray-700';
  const inputBase = `bg-transparent focus:ring-0 p-0 w-full placeholder:text-gray-500 border-b border-white/30`;

  return (
    <div className="relative group">
      <div className={`${bgMap[slide.type] ?? 'bg-white'} rounded p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${isDark ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'}`}>{idx + 1} / {total}</span>
          <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            {({'cover': '表紙', 'problem': '課題', 'solution': '解決策', 'effect': '効果', 'tech': '技術構成', 'schedule': 'スケジュール', 'team': '体制', 'cases': '事例', 'cost': '費用', 'next': '次のステップ', 'custom': 'カスタム'} as Record<string, string>)[slide.type] ?? slide.type}
          </span>
        </div>
        <input value={slide.title} onChange={(e) => onUpdate({ ...slide, title: e.target.value })}
          className={`${inputBase} text-base font-semibold ${textC}`} placeholder="スライドタイトル" />
        <div className="space-y-1.5">
          {slide.bullets.map((b, bi) => (
            <div key={bi} className="flex items-start gap-2">
              <span className={`${subC} shrink-0 font-medium mt-0.5`}>•</span>
              <input value={b} onChange={(e) => { const nb = [...slide.bullets]; nb[bi] = e.target.value; onUpdate({ ...slide, bullets: nb }); }}
                className={`${inputBase} text-sm ${subC}`} placeholder="内容を入力..." />
              <button onClick={() => onUpdate({ ...slide, bullets: slide.bullets.filter((_, i) => i !== bi) })}
                className={`opacity-0 group-hover:opacity-100 text-sm shrink-0 ${isDark ? 'text-white/40 hover:text-red-300' : 'text-gray-500 hover:text-red-500'}`}>×</button>
            </div>
          ))}
          <button onClick={() => onUpdate({ ...slide, bullets: [...slide.bullets, ''] })}
            className={`text-xs font-medium ${isDark ? 'text-white/40 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'}`}>+ 行を追加</button>
        </div>
      </div>
      <button onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white rounded-full text-xs font-medium opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">×</button>
    </div>
  );
}

const KISHOUTENKETSU: { key: string; label: string; color: string; subItems: string[] }[] = [
  { key: 'ki',  label: '起', color: '#B91C1C', subItems: ['市場調査', '顧客動向', '他社状況', '課題'] },
  { key: 'shou', label: '承', color: '#1D4ED8', subItems: ['サービス概要', 'サービス特徴', 'ビジネスフロー', '競合優位性'] },
  { key: 'ten',  label: '転', color: '#047857', subItems: ['事業計画', 'KPI', '販売・獲得プラン', 'スケジュール'] },
  { key: 'ketsu', label: '結', color: '#7C3AED', subItems: ['ビジョン', '2〜3年後の未来', 'サービスイメージ', '結び'] },
];

const SLIDE_TO_SECTION: Record<string, number> = {
  cover: -1, problem: 0, solution: 1, effect: 1, tech: 1, schedule: 2, team: 2, cases: 2, cost: 2, next: 3, custom: 3,
};

function PresentationView({ slides, deal, onClose }: { slides: Slide[]; deal: Deal; onClose: () => void }) {
  const [view, setView] = useState<'map' | 'section' | 'slide'>('map');
  const [sectionIdx, setSectionIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animating, setAnimating] = useState(false);

  const sectionSlides = (si: number) => slides.filter((s) => SLIDE_TO_SECTION[s.type] === si);
  const currentSectionSlides = sectionSlides(sectionIdx);

  const animateTo = (fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 50);
  };

  const zoomIntoSection = (si: number) => animateTo(() => { setSectionIdx(si); setSlideIdx(0); setView('slide'); });
  const zoomOut = () => animateTo(() => setView('map'));

  const prevSlide = useCallback(() => {
    setSlideIdx((c) => {
      if (c > 0) return c - 1;
      if (sectionIdx > 0) {
        const prevSec = sectionIdx - 1;
        const prevSlides = slides.filter((s) => SLIDE_TO_SECTION[s.type] === prevSec);
        setSectionIdx(prevSec);
        return Math.max(0, prevSlides.length - 1);
      }
      return c;
    });
  }, [sectionIdx, slides]);

  const nextSlide = useCallback(() => {
    const secSlides = slides.filter((s) => SLIDE_TO_SECTION[s.type] === sectionIdx);
    setSlideIdx((c) => {
      if (c < secSlides.length - 1) return c + 1;
      if (sectionIdx < 3) {
        setSectionIdx(sectionIdx + 1);
        return 0;
      }
      return c;
    });
  }, [sectionIdx, slides]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (view === 'slide') zoomOut(); else onClose(); }
      if (view === 'slide') {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevSlide();
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      }
      if (view === 'map') {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zoomIntoSection(0); }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, prevSlide, nextSlide, onClose, sectionIdx]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const totalFlatIdx = slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).slice(0, slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).findIndex((s) => s === currentSectionSlides[slideIdx]) + 1).length;
  const totalSlideCount = slides.filter((s) => SLIDE_TO_SECTION[s.type] !== -1).length;

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950/80 backdrop-blur border-b border-white/5 shrink-0 z-20">
        <button onClick={() => { if (view === 'slide') zoomOut(); else onClose(); }}
          className="text-sm text-gray-500 hover:text-white font-medium transition-colors">
          {view === 'slide' ? '← マップに戻る' : '← 閉じる'}
        </button>
        <div className="flex items-center gap-3">
          {view === 'slide' && (
            <div className="flex items-center gap-2">
              {KISHOUTENKETSU.map((sec, i) => (
                <button key={sec.key} onClick={() => zoomIntoSection(i)}
                  className={`w-7 h-7 rounded text-xs font-semibold transition-all ${i === sectionIdx ? 'text-white scale-110' : 'text-white/30 hover:text-white/60'}`}
                  style={{ backgroundColor: i === sectionIdx ? sec.color : 'transparent' }}>
                  {sec.label}
                </button>
              ))}
              <span className="text-xs text-gray-600 ml-2">{totalFlatIdx} / {totalSlideCount}</span>
            </div>
          )}
          <button onClick={toggleFullscreen} className="px-3 py-1.5 bg-white/5 text-gray-500 hover:bg-white/10 rounded text-xs font-medium transition-colors">
            {isFullscreen ? '通常' : '全画面'}
          </button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${view === 'map' ? 'opacity-100 scale-100' : 'opacity-0 scale-150 pointer-events-none'}`}>
          <div className="w-full max-w-4xl px-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-semibold text-white mb-2">{deal.dealName}</h1>
              <p className="text-gray-500">{deal.clientName} 御中</p>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {KISHOUTENKETSU.map((sec, i) => {
                const secSlides = sectionSlides(i);
                return (
                  <button key={sec.key} onClick={() => zoomIntoSection(i)}
                    className="group text-left p-0 rounded-xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-[0.98]"
                    style={{ boxShadow: `0 0 0 1px ${sec.color}30` }}>
                    <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: sec.color }}>
                      <span className="text-3xl font-semibold text-white/90">{sec.label}</span>
                      <span className="text-sm font-medium text-white/70">{secSlides.length} slides</span>
                    </div>
                    <div className="bg-gray-900 px-4 py-3 space-y-1.5">
                      {sec.subItems.map((item, j) => (
                        <div key={j} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: `${sec.color}80` }} />
                          <span className="text-xs text-gray-500 group-hover:text-gray-500 transition-colors">{item}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-center text-gray-600 text-xs mt-6">クリックでズームイン / Enter で開始</p>
          </div>
        </div>

        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${view === 'slide' ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'}`}>
          <button onClick={prevSlide}
            className="absolute left-4 z-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white text-xl transition-all">
            ‹
          </button>
          <div className="w-full max-w-5xl px-16" style={{ aspectRatio: '16/9' }}>
            <div className="w-full h-full relative rounded-lg overflow-hidden" style={{ boxShadow: `0 0 60px ${KISHOUTENKETSU[sectionIdx]?.color ?? '#000'}20` }}>
              <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ backgroundColor: KISHOUTENKETSU[sectionIdx]?.color }} />
              <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
                <span className="text-xs font-semibold text-white/60 px-2 py-0.5 rounded" style={{ backgroundColor: `${KISHOUTENKETSU[sectionIdx]?.color}40` }}>
                  {KISHOUTENKETSU[sectionIdx]?.label}
                </span>
                <span className="text-xs text-white/30">{slideIdx + 1} / {currentSectionSlides.length}</span>
              </div>
              {currentSectionSlides[slideIdx] && (
                <SlideRenderer slide={currentSectionSlides[slideIdx]} deal={deal} isPresent={true} />
              )}
            </div>
          </div>
          <button onClick={nextSlide}
            className="absolute right-4 z-10 w-12 h-12 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white text-xl transition-all">
            ›
          </button>
        </div>

        {view === 'slide' && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
            {currentSectionSlides.map((_, i) => (
              <button key={i} onClick={() => setSlideIdx(i)}
            className={`rounded-full transition-all ${i === slideIdx ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const KSTK_TABS = [
  { key: 'ki', label: '起', sub: '課題提起', color: '#B91C1C', placeholder: '市場の動向、顧客が抱える課題、競合状況など' },
  { key: 'shou', label: '承', sub: 'ソリューション', color: '#1D4ED8', placeholder: 'サービスの概要、特徴、ビジネスフロー、競合優位性' },
  { key: 'ten', label: '転', sub: '実行計画', color: '#047857', placeholder: '事業計画、KPI、費用、スケジュール' },
  { key: 'ketsu', label: '結', sub: 'ビジョン', color: '#7C3AED', placeholder: '2〜3年後の未来、ビジョン、導入後の理想像' },
] as const;

type MarketData = { size: string; growth: string; trends: string[]; competitors: string[] };
const MARKET_DATA: Record<string, MarketData> = {
  '製造業': {
    size: '4.2兆円',
    growth: '年5.8%',
    trends: ['DX投資の本格化', 'IoT・AIによる予知保全', 'カーボンニュートラル対応'],
    competitors: ['富士通', 'NEC', 'CTC'],
  },
  '医療': {
    size: '1.8兆円',
    growth: '年7.2%',
    trends: ['電子カルテの普及加速', 'AI診断支援の台頭', '訪問・在宅医療のデジタル化'],
    competitors: ['MEDIS', '富士フイルム', 'NTTデータ'],
  },
  '金融': {
    size: '3.1兆円',
    growth: '年6.4%',
    trends: ['オープンバンキングの拡大', 'AIリスク審査の普及', 'ノーコード業務自動化'],
    competitors: ['NTTデータ', 'TIS', 'FISC'],
  },
  '物流': {
    size: '2.6兆円',
    growth: '年8.1%',
    trends: ['ラストワンマイル自動化', 'WMS・TMSクラウド化', '2024年問題対応'],
    competitors: ['NTTロジスコ', 'SBSホールディングス', 'オープンロジ'],
  },
  '小売': {
    size: '1.4兆円',
    growth: '年9.3%',
    trends: ['OMO戦略の本格化', 'AIパーソナライズ推薦', '在庫最適化AI'],
    competitors: ['インテージ', 'True Data', 'シナジーマーケティング'],
  },
  '建設': {
    size: '1.1兆円',
    growth: '年4.9%',
    trends: ['BIM/CIMの義務化対応', 'ドローン測量の普及', '施工管理DX'],
    competitors: ['オートデスク', '福井コンピュータ', 'コンピュータシステム研究所'],
  },
  '不動産': {
    size: '0.9兆円',
    growth: '年5.5%',
    trends: ['PropTechによる取引デジタル化', 'AI査定の普及', 'スマートビル化'],
    competitors: ['いえらぶGROUP', 'Land Brain', 'GA technologies'],
  },
  'IT': {
    size: '5.6兆円',
    growth: '年11.2%',
    trends: ['生成AI組み込みの標準化', 'エッジコンピューティング拡大', 'セキュリティ強化投資増'],
    competitors: ['アクセンチュア', '野村総研', 'SAP'],
  },
};
const MARKET_DATA_DEFAULT: MarketData = {
  size: '市場規模調査中',
  growth: '成長率調査中',
  trends: ['DX推進の加速', 'AI・クラウド活用', 'コスト最適化ニーズの高まり'],
  competitors: ['既存ベンダー', 'SaaS新興勢力', '内製化傾向'],
};
function getMarketData(industry: string): MarketData {
  return MARKET_DATA[industry] ?? MARKET_DATA_DEFAULT;
}

function ProposalPromptSection({
  deal,
  prompt,
  onPromptChange,
  generating,
  onGenerate,
  researchEnabled,
  onResearchChange,
}: {
  deal: Deal;
  prompt: string;
  onPromptChange: (v: string) => void;
  generating: boolean;
  onGenerate: () => void;
  researchEnabled: boolean;
  onResearchChange: (v: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [sheets, setSheets] = useState<Record<string, string>>({
    ki: '',
    shou: '',
    ten: '',
    ketsu: '',
  });

  const updateSheet = (key: string, val: string) => {
    const next = { ...sheets, [key]: val };
    setSheets(next);
    const parts = KSTK_TABS.map((t) => next[t.key] ? `【${t.label} ${t.sub}】\n${next[t.key]}` : '').filter(Boolean);
    const base = `あなたは${deal.industry}業界のシステム提案のプロフェッショナルです。\n「${deal.dealName}」の提案書を起承転結の構成で作成してください。\n顧客: ${deal.clientName}\n予算感: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}\n`;
    onPromptChange(parts.length > 0 ? base + '\n' + parts.join('\n\n') : base);
  };

  const tab = KSTK_TABS[activeTab];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">提案書を作成</h2>
        <p className="text-sm text-gray-500">{deal.clientName} | {deal.dealName}</p>
      </div>

      <div className="px-6 pb-4">
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-lg px-4 py-3">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-indigo-900">✨ 市場調査をAIに含めさせる</p>
            <p className="text-xs text-indigo-600 mt-0.5">業界市場データ・競合・トレンドを最新情報から取得して提案書に反映します</p>
            {researchEnabled && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {['業界規模', '成長率', '主要トレンド', '競合'].map((tag) => (
                  <span key={tag} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => onResearchChange(!researchEnabled)}
            className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors active:scale-[0.98] ${researchEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            aria-pressed={researchEnabled}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${researchEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <div className="px-6">
        <div className="flex gap-1 border-b border-gray-100">
          {KSTK_TABS.map((t, i) => (
            <button key={t.key} onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all border-b-2 ${i === activeTab ? 'border-current text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-600'}`}
              style={i === activeTab ? { color: t.color } : undefined}>
              <span className="w-5 h-5 rounded text-xs font-semibold flex items-center justify-center text-white" style={{ backgroundColor: t.color }}>{t.label}</span>
              <span className="hidden sm:inline">{t.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full" style={{ backgroundColor: tab.color }} />
          <span className="text-sm font-semibold text-gray-900">{tab.label} — {tab.sub}</span>
        </div>
        <textarea
          value={sheets[tab.key]}
          onChange={(e) => updateSheet(tab.key, e.target.value)}
          rows={4}
          placeholder={`${tab.placeholder}\n（空欄ならAIが自動で構成します）`}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none leading-relaxed placeholder:text-gray-500"
        />
        <div className="flex gap-1 mt-2">
          {KSTK_TABS.map((t, i) => (
            <div key={t.key} className="flex-1 h-1 rounded-full" style={{ backgroundColor: sheets[t.key] ? t.color : '#e5e7eb' }} />
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">入力されたシートは色付きで表示されます。空欄のシートはAIが自動補完します。</p>
      </div>

      <div className="px-6 pb-5">
        <button onClick={onGenerate} disabled={generating}
          className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors active:scale-[0.98]">
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              生成中...
            </span>
          ) : 'AIで提案書を生成'}
        </button>
      </div>
    </div>
  );
}

function ProposalEditor({ deal, onClose, onCreateEstimate, onAutoAdvance }: {
  deal: Deal;
  onClose: () => void;
  onCreateEstimate: (slides: Slide[]) => void;
  onAutoAdvance?: (id: string, stage: Stage) => void;
}) {
  const [step, setStep] = useState<'prompt' | 'edit' | 'present'>('prompt');
  const dealContext = gatherDealContext(deal);
  const storedNeeds = typeof window !== 'undefined'
    ? (() => { try { const v = localStorage.getItem(`coaris_needs_${deal.id}`); return v ? (JSON.parse(v) as string[]) : []; } catch { return []; } })()
    : [];
  const needsAppend = storedNeeds.length > 0
    ? `\n\n【事前抽出ニーズ（自動反映）】\n${storedNeeds.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    : '';
  const [prompt, setPrompt] = useState(
    `あなたは${deal.industry}業界のシステム提案のプロフェッショナルです。\n\n以下の顧客データに基づいて「${deal.dealName}」の提案書を作成してください。\n\n${dealContext}\n【提案方針】\n・${deal.industry}業界の課題に精通した視点で書く\n・顧客のニーズに全て応える提案にする\n・技術的な優位性を明確にする\n・導入効果を数値で示す\n・予算感: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}${needsAppend}`
  );
  const [generating, setGenerating] = useState(false);
  const [researching, setResearching] = useState(false);
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [slides, setSlides] = useState<Slide[]>([]);

  const buildSlides = (withResearch: boolean): Slide[] => {
    const md = withResearch ? getMarketData(deal.industry) : null;
    const coverTitle = withResearch ? `${deal.dealName} ✦ 市場調査済み` : deal.dealName;
    const marketBullets = md
      ? [
          `市場規模: ${md.size}`,
          `成長率: ${md.growth}`,
          ...md.trends.map((t) => `・${t}`),
        ]
      : [`${deal.industry}業界のDX市場は年15%成長`, '中小企業のシステム投資は過去5年で2.3倍に拡大', '人手不足により業務自動化のニーズが急増', 'クラウド移行の波が加速中'];
    return [
      { type: 'cover', title: coverTitle, bullets: [`${deal.clientName} 御中`, `トライポット株式会社`, `担当: ${deal.assignee}`, `2026年4月`] },
      { type: 'problem', title: `${deal.industry}業界の市場動向`, bullets: marketBullets },
      { type: 'problem', title: `${deal.clientName}の現状と課題`, bullets: ['既存システムの老朽化による保守コスト増大', 'データのサイロ化で経営判断に必要な情報が散在', '属人的な業務フローが事業拡大のボトルネックに', `${deal.industry}業界特有の規制対応・セキュリティ要件`] },
      { type: 'solution', title: 'サービス概要', bullets: [`${deal.dealName}`, `${deal.clientName}の課題を解決する統合型システム`, 'データ一元管理 + AI自動化 + リアルタイム可視化', 'クラウドネイティブで初期費用を抑えた導入'] },
      { type: 'effect', title: 'サービス特徴', bullets: ['業務効率30%改善 ― 手作業を自動化', '経営判断を3秒に ― リアルタイムダッシュボード', '属人化ゼロ ― 標準化されたワークフロー', 'AI活用 ― 提案書・見積書・要件定義を自動生成'] },
      { type: 'tech', title: 'ビジネスフロー', bullets: [`${deal.clientName}（発注者）→ トライポット（開発・運用）`, '日次: データ自動連携で手入力ゼロ', '週次: AIが自動でレポート生成・課題検出', '月次: 経営ダッシュボードで即判断'] },
      { type: 'tech', title: '競合優位性', bullets: md ? ['AI前提設計 ― 競合の後付けAIとは根本が違う', '行動ベースKPI ― 結果だけでなくプロセスを可視化', `${deal.industry}業界特化 ― 汎用SaaSにない専門機能`, `主要競合(${md.competitors.join('・')})を凌駕するスピードと専門性`] : ['AI前提設計 ― 競合の後付けAIとは根本が違う', '行動ベースKPI ― 結果だけでなくプロセスを可視化', `${deal.industry}業界特化 ― 汎用SaaSにない専門機能`, '高速開発 ― 数日でプロトタイプ、数週間で本番'] },
      { type: 'cost', title: '費用概要', bullets: deal.amount > 0 ? [`総額: ¥${deal.amount.toLocaleString()}（税別）`, '支払条件: 着手30% / 中間30% / 検収40%', `月額運用: ¥${Math.round(deal.amount * 0.05 / 10000)}万円/月（保守・AI利用料込み）`] : ['別途お見積りいたします'] },
      { type: 'cases', title: 'KPI・投資対効果', bullets: [`投資回収: ${deal.amount > 0 ? Math.ceil(deal.amount / 500000) : 12}ヶ月で回収見込`, '業務工数: 月間40時間の削減', '判断速度: 月次報告 → リアルタイムに短縮', '人的ミス: 手入力による誤りを90%削減'] },
      { type: 'schedule', title: '開発スケジュール', bullets: ['Phase 1: 要件定義・基本設計（2週間）', 'Phase 2: 詳細設計（2週間）', 'Phase 3: 開発・実装（6週間）', 'Phase 4: テスト・導入支援（2週間）'] },
      { type: 'team', title: '販売・獲得プラン', bullets: [`プロジェクトマネージャー: ${deal.assignee}`, '初月: プロトタイプで体験 → 社内合意形成', '2-3月: 本開発 → 段階的リリース', '4月〜: 運用開始 → 月次改善サイクル'] },
      { type: 'next', title: 'ビジョン ― 3年後の未来', bullets: [`${deal.clientName}の全業務がAIで最適化された状態`, '経営者は判断だけに集中できる組織へ', 'データが溜まるほど会社が賢くなる仕組み', `${deal.industry}業界のDX先進企業としてのポジション確立`] },
      { type: 'next', title: 'ネクストステップ', bullets: ['1. 本提案内容のご検討（1週間）', '2. 詳細要件の擦り合わせ（お打ち合わせ）', '3. 正式見積書のご提出', '4. ご発注・キックオフ'] },
    ];
  };

  const handleGenerate = () => {
    if (researchEnabled) {
      setResearching(true);
      setTimeout(() => {
        setResearching(false);
        setGenerating(true);
        setTimeout(() => {
          setSlides(buildSlides(true));
          setGenerating(false);
          setStep('edit');
          if (['lead', 'meeting'].includes(deal.stage) && onAutoAdvance) {
            onAutoAdvance(deal.id, 'proposal');
          }
        }, 1400);
      }, 800);
    } else {
      setGenerating(true);
      setTimeout(() => {
        setSlides(buildSlides(false));
        setGenerating(false);
        setStep('edit');
        if (['lead', 'meeting'].includes(deal.stage) && onAutoAdvance) {
          onAutoAdvance(deal.id, 'proposal');
        }
      }, 1800);
    }
  };

  const updateSlide = (idx: number, slide: Slide) => setSlides((prev) => prev.map((s, i) => (i === idx ? slide : s)));
  const removeSlide = (idx: number) => setSlides((prev) => prev.filter((_, i) => i !== idx));
  const addSlide = () => setSlides((prev) => [...prev, { type: 'custom', title: '新しいスライド', bullets: [''] }]);

  const isLoading = researching || generating;
  const loadingLabel = researching ? `市場調査を実行中... (${deal.industry})` : `${deal.industry}業界の提案プロとして生成中...`;

  if (step === 'present') return <ProposalPresentation slides={slides} deal={deal as any} onClose={() => setStep('edit')} />;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-900 font-medium">← 戻る</button>
          {step === 'edit' && (
            <div className="flex gap-2">
              <button onClick={() => setStep('present')} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">プレゼン表示</button>
              <button onClick={() => { onCreateEstimate(slides); }} className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">この提案書から見積書を作成</button>
            </div>
          )}
        </div>
        <div className="px-5 py-5">
        {step === 'prompt' && (
          <>
            <ProposalPromptSection
              deal={deal}
              prompt={prompt}
              onPromptChange={setPrompt}
              generating={isLoading}
              onGenerate={handleGenerate}
              researchEnabled={researchEnabled}
              onResearchChange={setResearchEnabled}
            />
            {isLoading && (
              <div className="mt-3 flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin flex-shrink-0" />
                {loadingLabel}
              </div>
            )}
          </>
        )}
        {step === 'edit' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{slides.length}枚のスライド</h2>
              <button onClick={() => setStep('prompt')} className="text-sm text-gray-500 hover:text-gray-900 font-medium">AIで再生成</button>
            </div>
            {slides.map((slide, i) => (
              <SlideEditorCard key={i} slide={slide} idx={i} total={slides.length}
                onUpdate={(s) => updateSlide(i, s)} onRemove={() => removeSlide(i)} />
            ))}
            <button onClick={addSlide}
              className="w-full py-3 border border-dashed border-gray-300 rounded text-sm font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
              + スライドを追加
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

type EstimateItem = { name: string; amount: number; manMonth: number; unitPrice: number };
type BudgetItem = { name: string; revenue: number; costLabel: string; budgetCost: number; grossProfit: number };

function EstimatePromptDetails({ prompt, onPromptChange }: { prompt: string; onPromptChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {open ? '詳細設定を閉じる' : '詳細設定を開く'}
      </button>
      {open && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">AIへの指示</label>
          <textarea value={prompt} onChange={(e) => onPromptChange(e.target.value)} rows={6}
            className="w-full px-3 py-2.5 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 resize-none" />
        </div>
      )}
    </div>
  );
}

function EstimateEditor({ deal, slides, onClose, onAutoAdvance }: { deal: Deal; slides?: Slide[]; onClose: () => void; onAutoAdvance?: (id: string, stage: Stage) => void }) {
  const rates = getIndustryRates(deal.industry);
  const scheduleSlide = slides?.find((s) => s.type === 'schedule');

  const buildDefaultItems = (): EstimateItem[] => {
    if (scheduleSlide) {
      const phases = scheduleSlide.bullets.filter((b) => b.includes('Phase'));
      return phases.map((b, i) => {
        const name = b.replace(/Phase \d+: /, '').replace(/（.*$/, '').trim();
        const rate = rates[i] ?? rates[0];
        return { name, amount: 0, manMonth: 1, unitPrice: rate.unitPrice };
      });
    }
    return rates.map((r) => ({ name: r.label, amount: 0, manMonth: 1, unitPrice: r.unitPrice }));
  };

  const [tab, setTab] = useState<'estimate' | 'budget'>('estimate');
  const [step, setStep] = useState<'prompt' | 'edit'>(slides ? 'edit' : 'prompt');
  const [items, setItems] = useState<EstimateItem[]>(buildDefaultItems());
  const [notes, setNotes] = useState('・納期: ご発注後約3ヶ月\n・支払条件: 着手30% / 中間30% / 検収40%\n・見積有効期限: 発行日より1ヶ月');
  const [generating, setGenerating] = useState(false);
  const [budgetGenerated, setBudgetGenerated] = useState(false);
  const [budgetGenerating, setBudgetGenerating] = useState(false);
  const [budgetStale, setBudgetStale] = useState(false);
  const dealContext = gatherDealContext(deal);
  const [prompt, setPrompt] = useState(
    slides
      ? `提案書の内容に基づいて見積書を作成してください。\n\n${dealContext}\nスケジュール:\n${scheduleSlide?.bullets.join('\n') ?? '（未定）'}\n\n総額目安: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}`
      : `${deal.clientName}向け「${deal.dealName}」の見積書を作成してください。\n\n${dealContext}\n総額: ${deal.amount > 0 ? `¥${deal.amount.toLocaleString()}` : '未定'}`
  );

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const amt = deal.amount || 3000000;
      const generatedRates = getIndustryRates(deal.industry);
      if (slides && scheduleSlide) {
        const phases = scheduleSlide.bullets.filter((b) => b.includes('Phase'));
        const ratios = [0.15, 0.15, 0.45, 0.15, 0.1];
        setItems(phases.map((b, i) => {
          const name = b.replace(/Phase \d+: /, '').replace(/（.*$/, '').trim();
          const rate = generatedRates[i] ?? generatedRates[0];
          const phaseAmt = Math.round(amt * (ratios[i] ?? 0.2));
          const manMonth = parseFloat((phaseAmt / rate.unitPrice).toFixed(1));
          return { name, amount: phaseAmt, manMonth, unitPrice: rate.unitPrice };
        }));
      } else {
        const ratios = [0.15, 0.15, 0.45, 0.15, 0.05, 0.05];
        setItems(generatedRates.map((r, i) => {
          const phaseAmt = Math.round(amt * (ratios[i] ?? 0.1));
          const manMonth = parseFloat((phaseAmt / r.unitPrice).toFixed(1));
          return { name: r.label, amount: phaseAmt, manMonth, unitPrice: r.unitPrice };
        }));
      }
      setGenerating(false);
      setStep('edit');
      if (['proposal', 'meeting', 'lead'].includes(deal.stage) && onAutoAdvance) {
        onAutoAdvance(deal.id, 'estimate_sent');
      }
    }, 1200);
  };

  const handleBudgetGenerate = () => {
    setBudgetGenerating(true);
    setTimeout(() => {
      generateBudgetItems();
      setBudgetGenerating(false);
      setBudgetGenerated(true);
      setBudgetStale(false);
    }, 1400);
  };

  const updateItem = (idx: number, field: keyof EstimateItem, value: string) => {
    if (budgetGenerated) { setBudgetGenerated(false); setBudgetStale(true); }
    setItems((prev) => prev.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'name') return { ...item, name: value };
      const num = parseFloat(value) || 0;
      if (field === 'manMonth') return { ...item, manMonth: num, amount: Math.round(num * item.unitPrice) };
      if (field === 'unitPrice') return { ...item, unitPrice: num, amount: Math.round(item.manMonth * num) };
      if (field === 'amount') return { ...item, amount: Math.round(num) };
      return item;
    }));
  };

  const total = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(total * 0.1);

  const [runningItems, setRunningItems] = useState<RunningItem[]>(MOCK_RUNNING_ITEMS[deal.id] ?? []);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);

  const generateBudgetItems = () => {
    const generated = items.filter((item) => item.amount > 0).map((item) => {
      const costRate = item.name.includes('PM') ? 0.85 : item.name.includes('テスト') ? 0.70 : 0.75;
      const budgetCost = Math.round(item.amount * costRate);
      return {
        name: item.name,
        revenue: item.amount,
        costLabel: `${item.manMonth}人月 × ¥${Math.round(item.unitPrice * costRate / 10000)}万`,
        budgetCost,
        grossProfit: item.amount - budgetCost,
      };
    });
    setBudgetItems(generated);
  };

  const updateBudgetCost = (idx: number, value: number) => {
    setBudgetItems((prev) => prev.map((b, i) => i === idx ? { ...b, budgetCost: value, grossProfit: b.revenue - value } : b));
  };

  const totalBudgetCost = budgetItems.reduce((s, b) => s + b.budgetCost, 0);
  const totalGrossProfit = total - totalBudgetCost;
  const grossMargin = total > 0 ? Math.round((totalGrossProfit / total) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded border border-gray-200 max-w-2xl w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">見積書{slides ? '（提案書ベース）' : ''}</span>
          <div className="flex gap-2 items-center">
            {step === 'edit' && <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium">PDF出力</button>}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none">&times;</button>
          </div>
        </div>

        {step === 'prompt' && (
          <div className="p-5 space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              追加の指示がなければ、このまま生成できます。カスタマイズしたい場合は下の詳細設定を開いてください。
            </div>
            <EstimatePromptDetails prompt={prompt} onPromptChange={setPrompt} />
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中...
                </span>
              ) : 'AIで見積書を生成'}
            </button>
          </div>
        )}

        {step === 'edit' && (
          <div>
            <div className="flex border-b border-gray-200">
              <button onClick={() => setTab('estimate')}
                className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${tab === 'estimate' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                見積書
              </button>
              <button onClick={() => setTab('budget')}
                className={`flex-1 py-2.5 text-sm font-medium text-center transition-colors ${tab === 'budget' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                原価・利益計算（社内用）
              </button>
            </div>

            {tab === 'estimate' && (
              <div className="p-5">
                <div className="text-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 tracking-widest">御 見 積 書</h2>
                  <p className="text-xs text-gray-500 mt-1">No. EST-{deal.id} / 2026年4月5日</p>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <p className="font-semibold text-gray-900">{deal.clientName} 御中</p>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-xs">トライポット株式会社</p>
                    <p className="text-xs text-gray-500">担当: {deal.assignee}</p>
                  </div>
                </div>
                <div className="border border-gray-200 rounded p-3 mb-4 text-center bg-gray-50">
                  <p className="text-xs text-gray-500 mb-1">お見積り金額（税込）</p>
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{(total + tax).toLocaleString()}</p>
                </div>
                <div className="mb-2">
                  <div className="grid grid-cols-12 gap-1 text-xs font-medium text-gray-500 pb-1 border-b border-gray-200">
                    <span className="col-span-4">項目</span>
                    <span className="col-span-3 text-right">単価</span>
                    <span className="col-span-2 text-right">人月<span className="text-gray-500 text-xs font-normal ml-0.5 hidden sm:inline">（1人1ヶ月）</span></span>
                    <span className="col-span-3 text-right">金額</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <div className="space-y-1.5 mb-3 min-w-0">
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-1 items-center">
                        <input value={item.name} onChange={(e) => updateItem(i, 'name', e.target.value)}
                          className="col-span-4 px-2 py-1.5 border border-gray-200 rounded text-xs text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none bg-white" placeholder="項目名" />
                        <input type="number" value={item.unitPrice || ''} onChange={(e) => updateItem(i, 'unitPrice', e.target.value)}
                          className="col-span-3 px-1 py-1.5 border border-gray-200 bg-white rounded text-xs text-right text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                        <input type="number" step="0.1" value={item.manMonth || ''} onChange={(e) => updateItem(i, 'manMonth', e.target.value)}
                          className="col-span-2 px-2 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                        <div className="col-span-3 flex items-center gap-0.5">
                          <input type="number" value={item.amount || ''} onChange={(e) => updateItem(i, 'amount', e.target.value)}
                            className="flex-1 px-1 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-semibold focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none tabular-nums" />
                          <button onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))} className="text-gray-500 hover:text-red-600 text-base leading-none">×</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { const r = rates[0]; setItems((prev) => [...prev, { name: '', amount: 0, manMonth: 1, unitPrice: r.unitPrice }]); }}
                      className="w-full py-2 border border-dashed border-gray-200 rounded text-xs text-gray-500 font-medium hover:border-gray-400 hover:text-gray-700">
                      + 項目を追加
                    </button>
                  </div>
                </div>
                <RunningEstimateSection items={runningItems} onChange={setRunningItems} />
                <div className="border-t border-gray-200 pt-2 space-y-1 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">小計（ショット）</span><span className="font-semibold text-gray-900 tabular-nums">¥{total.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">ランニング年額</span><span className="text-gray-700 tabular-nums">¥{(runningItems.reduce((s, r) => s + (r.period === 'monthly' ? r.monthlyAmount * 12 : r.monthlyAmount), 0)).toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">消費税(10%)</span><span className="text-gray-700 tabular-nums">¥{tax.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-gray-200 pt-1"><span className="font-semibold text-gray-900">合計(税込)</span><span className="font-semibold text-gray-900 tabular-nums">¥{(total + tax).toLocaleString()}</span></div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">備考</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded text-xs text-gray-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none resize-none" />
                </div>
                <button onClick={() => setStep('prompt')} className="w-full mt-3 py-2 text-xs text-gray-500 hover:text-gray-900 font-medium">AIで再生成</button>
              </div>
            )}

            {tab === 'budget' && (
              <div className="p-5">
                {budgetStale && (
                  <div className="border border-yellow-300 rounded p-3 mb-4 bg-yellow-50">
                    <p className="text-xs font-medium text-yellow-800">見積金額を変更したため予算を再生成してください</p>
                  </div>
                )}
                <div className="border border-gray-200 rounded p-3 mb-4 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-0.5">社内管理用（クライアントには非開示）</p>
                  <p className="text-xs text-gray-500">見積書の各項目から自動でコスト予算と粗利を計算します。受注時に制作パイプラインへ引き継ぎます。</p>
                </div>

                {!budgetGenerated ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-4">
                    <p className="text-sm text-gray-500 text-center">
                      見積書の各項目に対してコスト予算をAIが自動生成します
                    </p>
                    {total === 0 && (
                      <p className="text-xs text-gray-600 border border-gray-200 rounded px-3 py-2 text-center bg-gray-50">
                        先に「見積書」タブで金額を設定してください
                      </p>
                    )}
                    <button
                      onClick={handleBudgetGenerate}
                      disabled={budgetGenerating || total === 0}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                      {budgetGenerating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          AIで予算を生成中...
                        </span>
                      ) : 'AIで予算を自動生成'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded border border-gray-200 mb-4">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="text-left px-3 py-2 text-gray-500 font-medium">項目</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-16">売上</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-20">予算コスト</th>
                            <th className="text-right px-3 py-2 text-gray-500 font-medium w-16">粗利</th>
                          </tr>
                        </thead>
                        <tbody>
                          {budgetItems.map((b, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              <td className="px-3 py-2">
                                <p className="text-gray-900 font-medium">{b.name}</p>
                                <p className="text-gray-500">{b.costLabel}</p>
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-700 tabular-nums">¥{(b.revenue / 10000).toFixed(0)}万</td>
                              <td className="px-1 py-1">
                                <input type="number" value={b.budgetCost || ''} onChange={(e) => updateBudgetCost(i, Number(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs text-right text-gray-900 font-semibold tabular-nums focus:ring-1 focus:ring-blue-500" />
                              </td>
                              <td className={`px-3 py-2 text-right font-semibold tabular-nums ${b.grossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                ¥{(b.grossProfit / 10000).toFixed(0)}万
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="border border-gray-200 rounded p-4 mb-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-semibold text-gray-900">合計サマリー</p>
                        <span className="text-xs font-medium text-gray-700">粗利率 {grossMargin}%</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">売上合計</p>
                          <p className="text-sm font-semibold text-gray-900 tabular-nums">¥{(total / 10000).toFixed(0)}万</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">予算コスト</p>
                          <p className="text-sm font-semibold text-gray-700 tabular-nums">¥{(totalBudgetCost / 10000).toFixed(0)}万</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">予測粗利</p>
                          <p className={`text-sm font-semibold tabular-nums ${totalGrossProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>¥{(totalGrossProfit / 10000).toFixed(0)}万</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setBudgetGenerated(false)} className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50">
                        AIで再生成
                      </button>
                      <button onClick={onClose} className="flex-1 py-2.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700">
                        予算を確定して閉じる
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type CommType = 'meeting' | 'email' | 'call' | 'note';
type CommRecord = { id: string; type: CommType; date: string; title: string; summary: string; needs?: string[] };

const COMM_TYPE_LABEL: Record<CommType, string> = {
  meeting: '打ち合わせ',
  email:   'メール',
  call:    '電話',
  note:    'メモ',
};

const MOCK_COMMS: Record<string, CommRecord[]> = {
  'd1': [
    { id: 'cm1', type: 'meeting', date: '2026-04-04', title: '初回技術提案', summary: 'CTO鈴木氏同席。現行システムのレスポンス問題が最大の課題。予算は6000万前後で社内稟議中。', needs: ['レスポンス改善が最優先', 'マイクロサービスへの移行希望', '既存データの移行が必須条件'] },
    { id: 'cm2', type: 'email', date: '2026-04-02', title: '提案資料送付', summary: '提案書v1をPDFで送付。「社内で共有します」との返信あり。' },
  ],
  'd2': [
    { id: 'cm3', type: 'meeting', date: '2026-04-03', title: 'ヒアリング', summary: '電子カルテの既存システムがHL7 FHIR非対応。API連携で患者データの一元管理を希望。', needs: ['HL7 FHIR対応が必須', '医療情報ガイドライン準拠', 'オンプレミス環境との共存'] },
  ],
  'd8': [
    { id: 'cm4', type: 'meeting', date: '2026-03-27', title: '初回提案', summary: '院長と事務長に提案。予約システムとの連携を重視。', needs: ['予約システム連携', 'スマホ対応（患者向け）', '高齢患者への配慮'] },
  ],
};

const DEALS_OVERRIDE_KEY = 'coaris_deals_override';

function loadOverrides(): Record<string, Partial<Deal>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DEALS_OVERRIDE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<Deal>>) : {};
  } catch { return {}; }
}

function saveOverrides(overrides: Record<string, Partial<Deal>>) {
  try { localStorage.setItem(DEALS_OVERRIDE_KEY, JSON.stringify(overrides)); } catch {}
}

function appendHistory(dealId: string, event: Omit<HistoryEvent, 'id' | 'at'>, setDeal: (updater: (d: Deal) => Deal) => void) {
  const now = new Date().toISOString();
  const newEvent: HistoryEvent = { ...event, id: `h${Date.now()}`, at: now };
  setDeal((d) => {
    if (d.id !== dealId) return d;
    const next = { ...d, history: [newEvent, ...(d.history ?? [])] };
    const overrides = loadOverrides();
    overrides[dealId] = { ...overrides[dealId], history: next.history };
    saveOverrides(overrides);
    return next;
  });
}

function gatherDealContext(deal: Deal): string {
  const comms = MOCK_COMMS[deal.id] ?? [];
  const needs = comms.flatMap((c) => c.needs ?? []);

  let ctx = `【顧客情報】\nクライアント: ${deal.clientName}\n業種: ${deal.industry}\n案件: ${deal.dealName}\n`;

  if (deal.memo) ctx += `\nメモ: ${deal.memo}\n`;

  if (comms.length > 0) {
    ctx += `\n【打ち合わせ・やり取り履歴】\n`;
    comms.forEach((c) => {
      const typeLabel = c.type === 'meeting' ? '打ち合わせ' : c.type === 'email' ? 'メール' : c.type === 'call' ? '電話' : 'メモ';
      ctx += `${c.date} [${typeLabel}] ${c.title}\n${c.summary}\n\n`;
    });
  }

  if (needs.length > 0) {
    ctx += `\n【抽出されたニーズ】\n`;
    needs.forEach((n, i) => { ctx += `${i + 1}. ${n}\n`; });
  }

  return ctx;
}

function ClaimSection({ deal }: { deal: Deal }) {
  const claims = MOCK_CLAIMS[deal.id] ?? [];

  const severityBadge = (s: Claim['severity']) => {
    if (s === 'critical') return 'text-red-600 bg-red-50 border border-red-200';
    if (s === 'major') return 'text-blue-600 bg-blue-50 border border-blue-200';
    return 'text-gray-500 bg-gray-100 border border-gray-200';
  };
  const severityLabel = (s: Claim['severity']) => {
    if (s === 'critical') return '重大';
    if (s === 'major') return '重要';
    return '軽微';
  };
  const statusDot = (s: Claim['status']) => {
    if (s === 'open') return 'bg-red-500';
    if (s === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-400';
  };
  const statusLabel = (s: Claim['status']) => {
    if (s === 'open') return '未対応';
    if (s === 'in_progress') return '対応中';
    return '解決済';
  };

  return (
    <div className="p-4">
      {claims.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">クレームはありません</p>
      ) : (
        <div className="space-y-3 mb-3">
          {claims.map((c) => (
            <div key={c.id} className="border border-gray-200 rounded p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${severityBadge(c.severity)}`}>{severityLabel(c.severity)}</span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot(c.status)}`} />
                  {statusLabel(c.status)}
                </span>
                <span className="text-xs text-gray-500 ml-auto">{c.date}</span>
              </div>
              <p className="text-sm text-gray-900 leading-relaxed">{c.content}</p>
              {c.response && (
                <p className="text-xs text-gray-500 mt-1.5 border-l-2 border-gray-200 pl-2">{c.response}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">担当: {c.assignee}</p>
            </div>
          ))}
        </div>
      )}
      <button className="w-full py-2.5 border border-dashed border-gray-200 rounded text-xs font-medium text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors">
        + クレームを記録
      </button>
    </div>
  );
}

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
        <button onClick={toggleListening}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5}
        placeholder={"打ち合わせの内容をメモしてください...\n（音声入力 or テキスト。走り書きOK。AIが整形します）"}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-1 focus:ring-blue-500 resize-none placeholder:text-gray-500" />
      {isListening && (
        <div className="flex items-center gap-2 text-sm text-red-700 font-medium">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          マイクが聞いています...
        </div>
      )}
    </div>
  );
}

const ContractTabIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ProposalTabIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
  </svg>
);


type ActionTab = 'email' | 'meeting' | 'gmeet' | 'call';

const ACTION_TABS: { id: ActionTab; label: string; icon: string }[] = [
  { id: 'meeting', label: '打合せ', icon: '🤝' },
  { id: 'email',   label: 'メール', icon: '✉' },
  { id: 'gmeet',   label: 'Meet',   icon: '📹' },
  { id: 'call',    label: '電話',   icon: '📞' },
];

function ActionSection({ deal, isProductionContext }: { deal: Deal; isProductionContext?: boolean }) {
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

function MeetingTabContent({ deal, meetings }: { deal: Deal; meetings: CommRecord[] }) {
  const [voiceText, setVoiceText] = useState('');
  const [minutesGenerating, setMinutesGenerating] = useState(false);
  const [minutesResult, setMinutesResult] = useState('');
  const [extractedNeeds, setExtractedNeeds] = useState<string[]>([]);
  const [showNeedsExtracted, setShowNeedsExtracted] = useState(false);

  const generateMinutes = () => {
    if (!voiceText.trim()) return;
    setMinutesGenerating(true);
    setTimeout(() => {
      setMinutesResult(`# 議事録: ${deal.dealName}\n**日時:** ${new Date().toLocaleDateString('ja-JP')}\n**参加者:** 柏樹 久美子（トライポット）、先方ご担当者\n\n---\n\n## 議題\n${voiceText}\n\n## 決定事項\n- 要件の方向性について合意\n- 次回打ち合わせで詳細仕様を確定\n\n## 宿題\n- 【トライポット】詳細見積もりの作成（期限: 1週間以内）\n- 【先方】社内承認プロセスの確認\n\n## 次回予定\n- 来週中に日程調整`);
      setExtractedNeeds(['レスポンス改善・処理速度向上', 'データ移行・既存システム連携', 'コスト削減・運用効率化']);
      setShowNeedsExtracted(true);
      setMinutesGenerating(false);
    }, 1800);
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all duration-200">
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
      <div className="space-y-3 mt-2">
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
                  <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium">保存</button>
                </div>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">{minutesResult}</pre>
              </div>
            </div>
          )}
        </div>
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

  const generateEmail = () => {
    setEmailGenerating(true);
    setTimeout(() => {
      const lastComm = comms[0];
      const needsList = allNeeds.length > 0
        ? `\n\n先日のお打ち合わせで伺いました以下のご要望につきまして、検討を進めております。\n${allNeeds.map((n) => `・${n}`).join('\n')}`
        : '';
      const lastMeetingRef = lastComm
        ? `\n\n${lastComm.date}の${lastComm.type === 'meeting' ? 'お打ち合わせ' : lastComm.type === 'email' ? 'メールでのやり取り' : 'お電話'}では「${lastComm.title}」についてお時間をいただき、誠にありがとうございました。`
        : `\n\n先日はお時間をいただき、誠にありがとうございました。`;
      setEmailDraft(`${deal.clientName}\nご担当者様\n\nお世話になっております。トライポット株式会社の${deal.assignee}です。${lastMeetingRef}${needsList}\n\n${deal.dealName}につきまして、ご提案内容をまとめております。\n\n次回のお打ち合わせ日程について、来週のご都合をお教えください。\n\n何卒よろしくお願いいたします。\n\nトライポット株式会社\n${deal.assignee}`);
      setEmailGenerating(false);
    }, 1500);
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
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-700 active:scale-[0.98] transition-all"
          >
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


const NEEDS_STORAGE_KEY = (dealId: string) => `coaris_needs_${dealId}`;

function NeedsSection({ deal }: { deal: Deal }) {
  const comms = MOCK_COMMS[deal.id] ?? [];
  const allNeeds = comms.flatMap((c) => c.needs ?? []);
  if (allNeeds.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">🎯</span>
        <p className="text-sm font-semibold text-gray-900">ニーズ（自動抽出）</p>
      </div>
      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-3">
        {comms.filter((c) => c.needs && c.needs.length > 0).map((c) => (
          <div key={c.id}>
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">{c.date} · {COMM_TYPE_LABEL[c.type]}</p>
            <div className="flex flex-wrap gap-1.5">
              {(c.needs ?? []).map((need, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                  <span className="text-red-400 font-semibold">{i + 1}</span>
                  {need}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentsSection({ deal, onOpenProposal, onOpenEstimate }: {
  deal: Deal;
  onOpenProposal: () => void;
  onOpenEstimate: () => void;
}) {
  const artifacts = MOCK_ARTIFACTS[deal.id] ?? { proposal: false, estimate: false, budget: false, requirement: false, schedule: false };
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📄</span>
        <p className="text-sm font-semibold text-gray-900">ドキュメント</p>
      </div>
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onOpenProposal}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium active:scale-[0.98] transition-all duration-200">
            提案書を作成 →
          </button>
          <button
            onClick={onOpenEstimate}
            title="金額が未設定でもAIが推定します"
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-medium active:scale-[0.98] transition-all duration-200">
            見積書を作成 →
          </button>
        </div>
        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
          <div className="grid grid-cols-2 gap-2">
            {([
              ['提案書', artifacts.proposal],
              ['見積書', artifacts.estimate],
              ['予算計画', artifacts.budget],
              ['要件定義', artifacts.requirement],
              ['スケジュール', artifacts.schedule],
            ] as const).map(([label, done]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`text-xs font-semibold ${done ? 'text-gray-700' : 'text-gray-500'}`}>
                  {done ? '✓' : '○'}
                </span>
                <span className={`text-xs ${done ? 'text-gray-700' : 'text-gray-500'}`}>{label}</span>
              </div>
            ))}
          </div>
          {MOCK_GROSS_MARGIN_RATES[deal.id] !== undefined && (
            <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">
              予測粗利率: <span className="font-semibold text-gray-700">{MOCK_GROSS_MARGIN_RATES[deal.id]}%</span>
            </p>
          )}
        </div>
        <div className="mt-1">
          <ProposalVersions />
        </div>
      </div>
    </div>
  );
}

function InternalMemoSection({ deal }: { deal: Deal }) {
  const [internalComments, setInternalComments] = useState(MOCK_COMMENTS);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📝</span>
        <p className="text-sm font-semibold text-gray-900">社内メモ</p>
      </div>
      <InternalComments
        comments={internalComments}
        onChange={setInternalComments}
        currentUser="柏樹 久美子"
      />
    </div>
  );
}

function ContractSection({ deal, onContractStatusChange }: { deal: Deal; onContractStatusChange?: (contractName: string, status: string) => void }) {
  const artifacts = MOCK_ARTIFACTS[deal.id];
  const hasProposal = artifacts?.proposal ?? false;
  const hasEstimate = artifacts?.estimate ?? false;
  const isFirstDeal = !['d4', 'd5', 'd9'].includes(deal.id);
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">📋</span>
        <p className="text-sm font-semibold text-gray-900">契約</p>
      </div>
      <ContractManager
        dealStage={deal.stage}
        isFirstDeal={isFirstDeal}
        hasProposal={hasProposal}
        hasEstimate={hasEstimate}
        clientName={deal.clientName}
        dealName={deal.dealName}
        dealAmount={deal.amount}
        onStatusChange={onContractStatusChange}
      />
    </div>
  );
}

function ClaimInlineSection({ deal }: { deal: Deal }) {
  const claims = MOCK_CLAIMS[deal.id] ?? [];
  if (claims.length === 0) return null;

  const severityBadge = (s: Claim['severity']) => {
    if (s === 'critical') return 'text-red-600 bg-red-50 border border-red-200';
    if (s === 'major') return 'text-blue-600 bg-blue-50 border border-blue-200';
    return 'text-gray-500 bg-gray-100 border border-gray-200';
  };
  const severityLabel = (s: Claim['severity']) => {
    if (s === 'critical') return '重大';
    if (s === 'major') return '重要';
    return '軽微';
  };
  const statusDot = (s: Claim['status']) => {
    if (s === 'open') return 'bg-red-500';
    if (s === 'in_progress') return 'bg-blue-500';
    return 'bg-gray-400';
  };
  const statusLabel = (s: Claim['status']) => {
    if (s === 'open') return '未対応';
    if (s === 'in_progress') return '対応中';
    return '解決済';
  };

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-3">
        <span className="text-base">⚠</span>
        <p className="text-sm font-semibold text-gray-900">クレーム</p>
      </div>
      <div className="space-y-2 mb-3">
        {claims.map((c) => (
          <div key={c.id} className="bg-red-50 rounded-xl p-3.5 border border-red-100">
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${severityBadge(c.severity)}`}>{severityLabel(c.severity)}</span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${statusDot(c.status)}`} />
                {statusLabel(c.status)}
              </span>
              <span className="text-xs text-gray-500 ml-auto">{c.date}</span>
            </div>
            <p className="text-sm text-gray-900 leading-relaxed">{c.content}</p>
            {c.response && (
              <p className="text-xs text-gray-500 mt-1.5 border-l-2 border-red-200 pl-2">{c.response}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">担当: {c.assignee}</p>
          </div>
        ))}
      </div>
      <button className="w-full py-2.5 border border-dashed border-gray-200 rounded-xl text-xs font-medium text-gray-500 active:scale-[0.98] transition-all duration-200">
        + クレームを記録
      </button>
    </div>
  );
}

function CollapsibleSalesArchive({ deal, onOpenProposal, onOpenEstimate, onContractStatusChange }: {
  deal: Deal;
  onOpenProposal: () => void;
  onOpenEstimate: () => void;
  onContractStatusChange?: (contractName: string, status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <span className="text-base">📁</span>
          <p className="text-sm font-semibold text-gray-900">ドキュメント・契約</p>
        </div>
        <span className={`text-gray-500 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
          <DocumentsSection
            deal={deal}
            onOpenProposal={onOpenProposal}
            onOpenEstimate={onOpenEstimate}
          />
          <div className="border-t border-gray-100 pt-4">
            <ContractSection deal={deal} onContractStatusChange={onContractStatusChange} />
          </div>
        </div>
      )}
    </div>
  );
}

const HISTORY_TYPE_CONFIG: Record<HistoryEventType, { icon: string; color: string }> = {
  stage_change:    { icon: '🔄', color: 'bg-blue-50 border-blue-200' },
  proposal_sent:   { icon: '📄', color: 'bg-gray-50 border-gray-200' },
  estimate_sent:   { icon: '💰', color: 'bg-gray-50 border-gray-200' },
  contract_sent:   { icon: '📋', color: 'bg-amber-50 border-amber-200' },
  contract_signed: { icon: '✅', color: 'bg-blue-50 border-blue-200' },
  invoice_sent:    { icon: '🧾', color: 'bg-gray-50 border-gray-200' },
  paid:            { icon: '💳', color: 'bg-gray-50 border-gray-200' },
  email_sent:      { icon: '✉', color: 'bg-gray-50 border-gray-200' },
  file_attached:   { icon: '📎', color: 'bg-gray-50 border-gray-200' },
  note:            { icon: '📝', color: 'bg-gray-50 border-gray-200' },
};

type AttachmentKind = 'figma' | 'link' | 'google_doc' | 'sheet' | 'slide' | 'pdf' | 'image' | 'other';

type Attachment = {
  id: string;
  kind: AttachmentKind;
  title: string;
  url: string;
  addedAt: string;
  addedBy?: string;
};

const KIND_ICON: Record<AttachmentKind, string> = {
  figma: '📐',
  link: '🔗',
  google_doc: '📄',
  sheet: '📊',
  slide: '🖼',
  pdf: '📑',
  image: '🖼',
  other: '📎',
};

const KIND_LABEL: Record<AttachmentKind, string> = {
  figma: 'Figma',
  link: 'リンク',
  google_doc: 'Google Docs',
  sheet: 'スプレッドシート',
  slide: 'スライド',
  pdf: 'PDF',
  image: '画像',
  other: 'その他',
};

function detectKind(url: string): AttachmentKind {
  try {
    const u = new URL(url);
    const host = u.hostname;
    const path = u.pathname;
    if (host.includes('figma.com')) return 'figma';
    if (host === 'docs.google.com') {
      if (path.startsWith('/document')) return 'google_doc';
      if (path.startsWith('/spreadsheets')) return 'sheet';
      if (path.startsWith('/presentation')) return 'slide';
    }
    const ext = path.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'pdf') return 'pdf';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    return 'link';
  } catch {
    return 'link';
  }
}

function getHostLabel(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

const LS_KEY = 'coaris_deals_override';

function loadAttachments(dealId: string): Attachment[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const overrides = JSON.parse(raw) as Record<string, { attachments?: Attachment[] }>;
    return overrides[dealId]?.attachments ?? [];
  } catch { return []; }
}

function saveAttachments(dealId: string, attachments: Attachment[]) {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const overrides = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    const existing = (overrides[dealId] as Record<string, unknown>) ?? {};
    overrides[dealId] = { ...existing, attachments };
    localStorage.setItem(LS_KEY, JSON.stringify(overrides));
  } catch { /* ignore */ }
}

function AttachmentsTab({ deal, onUpdate }: { deal: Deal; onUpdate: (next: Deal) => void }) {
  const [items, setItems] = useState<Attachment[]>(() => {
    const fromDeal = deal.attachments ?? [];
    const fromLS = loadAttachments(deal.id);
    const merged = [...fromLS];
    fromDeal.forEach((a) => { if (!merged.find((m) => m.id === a.id)) merged.push(a); });
    return merged;
  });
  const [showForm, setShowForm] = useState(false);
  const [presetKind, setPresetKind] = useState<AttachmentKind | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [kindInput, setKindInput] = useState<AttachmentKind>('link');

  const openForm = (preset?: AttachmentKind) => {
    setPresetKind(preset ?? null);
    setKindInput(preset ?? 'link');
    setUrlInput('');
    setTitleInput('');
    setShowForm(true);
  };

  const handleUrlChange = (v: string) => {
    setUrlInput(v);
    if (!presetKind) setKindInput(detectKind(v));
  };

  const handleAdd = () => {
    if (!urlInput.trim()) return;
    const newItem: Attachment = {
      id: `att_${Date.now()}`,
      kind: kindInput,
      title: titleInput.trim() || getHostLabel(urlInput),
      url: urlInput.trim(),
      addedAt: new Date().toISOString().slice(0, 10),
    };
    const next = [newItem, ...items];
    setItems(next);
    saveAttachments(deal.id, next);
    onUpdate({ ...deal, attachments: next });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const next = items.filter((a) => a.id !== id);
    setItems(next);
    saveAttachments(deal.id, next);
    onUpdate({ ...deal, attachments: next });
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => openForm('figma')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm">
          📐 Figmaを追加
        </button>
        <button
          onClick={() => openForm('google_doc')}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm">
          📄 Google Docsを追加
        </button>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm ml-auto">
          + リンクを追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">URL（必須）</label>
            <input
              type="url"
              value={urlInput}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">タイトル（省略可）</label>
            <input
              type="text"
              value={titleInput}
              onChange={(e) => setTitleInput(e.target.value)}
              placeholder="デザインカンプ v2"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">種類</label>
            <select
              value={kindInput}
              onChange={(e) => setKindInput(e.target.value as AttachmentKind)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
              {(Object.keys(KIND_LABEL) as AttachmentKind[]).map((k) => (
                <option key={k} value={k}>{KIND_ICON[k]} {KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={!urlInput.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 active:scale-[0.98] transition-all">
              追加
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500">まだ添付がありません。</p>
          <p className="text-xs text-gray-500 mt-1">Figma や Google Docs のリンクを貼れます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
              <span className="text-xl shrink-0">{KIND_ICON[a.kind]}</span>
              <button
                onClick={() => window.open(a.url, '_blank', 'noopener,noreferrer')}
                className="flex-1 min-w-0 text-left active:scale-[0.98] transition-all">
                <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-500 truncate">{getHostLabel(a.url)} · {a.addedAt}</p>
              </button>
              <button
                onClick={() => handleDelete(a.id)}
                className="shrink-0 p-1.5 text-gray-500 hover:text-red-500 active:scale-[0.98] transition-all rounded-lg hover:bg-red-50">
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineTab({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-sm text-gray-500">まだ履歴がありません</p>
        <p className="text-xs text-gray-500 mt-1">ステージ変更や契約操作が自動的に記録されます</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((ev) => {
        const cfg = HISTORY_TYPE_CONFIG[ev.type] ?? { icon: '•', color: 'bg-gray-50 border-gray-200' };
        const dateStr = new Date(ev.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        return (
          <div key={ev.id} className={`bg-white rounded-xl border p-3.5 flex items-start gap-3 ${cfg.color}`}>
            <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-snug">{ev.title}</p>
              {ev.description && <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{ev.description}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500 tabular-nums">{dateStr}</span>
                {ev.actor && <span className="text-xs text-gray-500">· {ev.actor}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DealDetail({ deal: initialDeal, onBack, onStageChange }: {
  deal: Deal;
  onBack: () => void;
  onStageChange: (id: string, stage: Stage) => void;
}) {
  const [deal, setDeal] = useState(initialDeal);
  const [modal, setModal] = useState<'proposal' | 'estimate' | 'estimate-from-proposal' | 'lost' | null>(null);
  const [proposalSlides, setProposalSlides] = useState<Slide[]>([]);
  const [nextActions, setNextActions] = useState<Record<string, NextActionData | null>>(MOCK_NEXT_ACTIONS as Record<string, NextActionData | null>);
  const [lostReason, setLostReason] = useState<LostReason | undefined>(undefined);
  const [invoice, setInvoice] = useState<NonNullable<Deal['invoice']>>(
    initialDeal.invoice ?? { status: 'none' }
  );
  const [detailTab, setDetailTab] = useState<'main' | 'timeline' | 'attachments' | 'process'>('main');

  const handleStageChange = (stage: Stage) => {
    const prevStage = deal.stage;
    setDeal((prev) => ({ ...prev, stage }));
    onStageChange(deal.id, stage);
    appendHistory(deal.id, {
      type: 'stage_change',
      title: `ステージ変更: ${STAGE_LABEL[prevStage]} → ${STAGE_LABEL[stage]}`,
      actor: deal.assignee,
    }, setDeal);
  };

  const isSalesPhase = SALES_STAGES.includes(deal.stage);
  const isLost = deal.stage === 'lost';
  const isProductionPhase = PRODUCTION_STAGES.includes(deal.stage);
  const isBillingPhase = BILLING_STAGES.includes(deal.stage);
  const isClaimPhase = deal.stage === 'claim' || deal.stage === 'claim_resolved';
  const isPostOrder = ['ordered','in_production','delivered','acceptance','invoiced','accounting','paid'].includes(deal.stage);

  const visibleSalesStages = SALES_STAGES.filter((s) => {
    const allowed = CLAIM_NEXT_STAGES[deal.stage];
    if (allowed) return false;
    if (s === 'claim') return false;
    return true;
  });


  return (
    <>
      <div className="max-w-lg mx-auto px-4 py-5 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-between mb-5">
          <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-900 font-medium inline-flex items-center gap-1">← 戻る</button>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setDetailTab('main')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${detailTab === 'main' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              案件詳細
            </button>
            <button
              onClick={() => setDetailTab('timeline')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              🕐 履歴{(deal.history ?? []).length > 0 && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">{(deal.history ?? []).length}</span>}
            </button>
            <button
              onClick={() => setDetailTab('attachments')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'attachments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              📎 添付{(deal.attachments ?? []).length > 0 && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">{(deal.attachments ?? []).length}</span>}
            </button>
            {isPostOrder && (
              <button
                onClick={() => setDetailTab('process')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${detailTab === 'process' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                🔧 工程・アサイン{deal.process?.committedToProduction && <span className="text-xs font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5">投入済</span>}
              </button>
            )}
          </div>
        </div>

        {detailTab === 'main' && (
        <>
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 mb-0.5">{deal.clientName}</p>
              <h1 className="text-xl font-semibold text-gray-900 leading-snug">{deal.dealName}</h1>
            </div>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ml-3 shrink-0 ${STAGE_BADGE[deal.stage]}`}>
              {STAGE_LABEL[deal.stage]}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 mb-4 text-sm text-gray-600">
            {deal.revenueType === 'shot' && deal.amount > 0 && (
              <span className="font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</span>
            )}
            {deal.revenueType === 'running' && deal.monthlyAmount && (
              <span className="font-semibold text-blue-600 tabular-nums">¥{(deal.monthlyAmount / 10000).toFixed(0)}万/月</span>
            )}
            <span className="text-gray-500">{deal.industry}</span>
            <span className="text-gray-500">{deal.assignee}</span>
            <span className="text-gray-500 tabular-nums">確度 {deal.probability}%</span>
          </div>

          <textarea
            value={deal.memo}
            onChange={(e) => setDeal((prev) => ({ ...prev, memo: e.target.value }))}
            placeholder="一言メモ（クリックで編集）"
            rows={2}
            className="w-full text-sm text-gray-700 mb-4 leading-relaxed bg-transparent border-0 rounded px-0 -mx-0 hover:bg-gray-50 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:px-2 focus:-mx-2 transition-all resize-none placeholder:text-gray-500"
          />

          {(() => {
            let stageOptions: { value: string; label: string }[] = [];
            if (isSalesPhase) stageOptions = visibleSalesStages.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
            else if (isProductionPhase) stageOptions = PRODUCTION_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
            else if (isBillingPhase) stageOptions = BILLING_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
            else if (isClaimPhase) {
              stageOptions = (['claim', 'claim_resolved'] as Stage[]).map((s) => ({ value: s, label: STAGE_LABEL[s] }));
              if (deal.stage === 'claim_resolved') {
                stageOptions.push({ value: 'invoiced', label: STAGE_LABEL.invoiced });
                stageOptions.push({ value: 'paid', label: STAGE_LABEL.paid });
              }
            }
            return (
              <div className="mb-1">
                <NextAction
                  action={nextActions[deal.id] ?? null}
                  onChange={(action) => setNextActions((prev) => ({ ...prev, [deal.id]: action ?? null }))}
                  currentStage={deal.stage}
                  stageOptions={stageOptions}
                  onStageChange={(s) => handleStageChange(s as Stage)}
                />
              </div>
            );
          })()}

          {deal.stage === 'claim_resolved' && (
            <div className="border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => handleStageChange('invoiced')}
                className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all duration-200">
                請求済にする
              </button>
              <button
                onClick={() => handleStageChange('paid')}
                className="block w-full text-center mt-2 text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">
                既に入金済みの場合はこちら →
              </button>
            </div>
          )}

          {(isSalesPhase || isLost) && (
            <div className="border-t border-gray-100 pt-3 mt-4">
              {isLost ? (
                <div className="space-y-2">
                  {lostReason && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-0.5">{REASON_LABEL[lostReason.reason]}</p>
                      {lostReason.competitor && <p className="text-xs text-gray-500">競合: {lostReason.competitor}</p>}
                      <p className="text-xs text-gray-500">{lostReason.detail}</p>
                      <p className="text-xs text-gray-500 mt-1">{lostReason.recordedAt}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setModal('lost')}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-[0.98] transition-all">
                      失注理由を{lostReason ? '編集' : '記録'}
                    </button>
                    <button
                      onClick={() => { handleStageChange('lead'); setLostReason(undefined); }}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 active:scale-[0.98] transition-all">
                      リードに戻す
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleStageChange('claim')}
                    className="text-xs text-red-600 hover:text-red-800 font-medium">
                    クレーム発生
                  </button>
                  <span className="text-xs text-gray-500">/</span>
                  <button
                    onClick={() => setModal('lost')}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium">
                    失注として記録
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5">
          <ActionSection deal={deal} isProductionContext={isProductionPhase || deal.stage === 'ordered'} />
        </div>

        {(MOCK_COMMS[deal.id] ?? []).flatMap((c) => c.needs ?? []).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
            <NeedsSection deal={deal} />
          </div>
        )}

        <CollapsibleSalesArchive
          deal={deal}
          onOpenProposal={() => setModal('proposal')}
          onOpenEstimate={() => setModal('estimate')}
          onContractStatusChange={(contractName, status) => {
            const labelMap: Record<string, string> = { sent: '送付済み', signed: '締結済み', draft: '下書き', expired: '期限切れ' };
            const typeMap: Record<string, HistoryEventType> = { sent: 'contract_sent', signed: 'contract_signed', draft: 'note', expired: 'note' };
            appendHistory(deal.id, {
              type: typeMap[status] ?? 'note',
              title: `契約書ステータス変更: ${contractName} → ${labelMap[status] ?? status}`,
              actor: deal.assignee,
            }, setDeal);
          }}
        />

        {(() => {
          const claims = MOCK_CLAIMS[deal.id] ?? [];
          return claims.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-5 mt-4">
              <ClaimInlineSection deal={deal} />
            </div>
          ) : null;
        })()}

        {deal.stage === 'ordered' && (
          <div className="mt-5">
            <OrderedFlowSection deal={deal} onSendToProduction={() => handleStageChange('in_production')} />
          </div>
        )}

        {isProductionPhase && (
          <div className="mt-5">
            <ProductionPhasePanel deal={deal} onStageChange={handleStageChange} />
          </div>
        )}

        {isBillingPhase && (
          <div className="mt-5">
            <BillingPhasePanel deal={deal} onStageChange={handleStageChange} />
          </div>
        )}

        {(isBillingPhase || deal.stage === 'acceptance') && (
          <div className="mt-4">
            <InvoiceSection
              deal={deal}
              invoice={invoice}
              onInvoiceChange={(next) => {
                setInvoice(next);
                setDeal((prev) => ({ ...prev, invoice: next }));
              }}
              onStageChange={handleStageChange}
              onAppendHistory={(event) => appendHistory(deal.id, event, setDeal)}
            />
          </div>
        )}

        <div className="h-8" />
        </>
        )}

        {detailTab === 'timeline' && (
          <TimelineTab events={deal.history ?? []} />
        )}

        {detailTab === 'attachments' && (
          <AttachmentsTab deal={deal} onUpdate={(next) => setDeal(next)} />
        )}
        {detailTab === 'process' && isPostOrder && (
          <ProcessTab
            deal={deal}
            onUpdate={(next) => {
              setDeal(next);
              const overrides = (() => { try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) as Record<string, Partial<Deal>> : {}; } catch { return {}; } })();
              overrides[next.id] = { ...overrides[next.id], process: next.process };
              localStorage.setItem(LS_KEY, JSON.stringify(overrides));
            }}
            onAppendHistory={(event) => appendHistory(deal.id, event, setDeal)}
          />
        )}
      </div>

      {modal === 'proposal' && (
        <ProposalEditor deal={deal} onClose={() => setModal(null)}
          onCreateEstimate={(sl) => { setProposalSlides(sl); setModal('estimate-from-proposal'); }}
          onAutoAdvance={(_id, s) => handleStageChange(s)} />
      )}
      {modal === 'estimate' && <EstimateEditor deal={deal} onClose={() => setModal(null)} onAutoAdvance={(_id, s) => handleStageChange(s)} />}
      {modal === 'estimate-from-proposal' && <EstimateEditor deal={deal} slides={proposalSlides} onClose={() => setModal(null)} onAutoAdvance={(_id, s) => handleStageChange(s)} />}
      {modal === 'lost' && (
        <LostDealRecord
          dealId={deal.id}
          dealName={deal.dealName}
          existingReason={lostReason}
          onConfirm={(reason) => {
            setLostReason(reason);
            handleStageChange('lost');
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
    </>
  );
}

function ProductionPhasePanel({ deal, onStageChange }: { deal: Deal; onStageChange: (s: Stage) => void }) {
  const progress = deal.progress ?? 0;
  const completedTasks = Math.round(progress / 10);
  const totalTasks = 10;
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">制作フェーズ</h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${STAGE_BADGE[deal.stage]}`}>{STAGE_LABEL[deal.stage]}</span>
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">進捗</span>
          <span className="text-xs font-semibold text-gray-900 tabular-nums">{progress}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1 tabular-nums">{completedTasks} / {totalTasks} タスク完了</p>
      </div>
      <Link href="/production" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-800">
        📥 制作カードを見る → /production
      </Link>
      {(deal.stage === 'delivered' || deal.stage === 'acceptance') && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <p className="text-xs font-medium text-gray-700">制作完了サマリー</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">完了タスク</p>
              <p className="text-sm font-semibold text-gray-900 tabular-nums">{completedTasks} / {totalTasks}</p>
            </div>
            <div className="bg-gray-50 rounded p-2">
              <p className="text-xs text-gray-500">予測粗利率</p>
              <p className="text-sm font-semibold text-gray-900">28%</p>
            </div>
          </div>
          <button
            onClick={() => setShowInvoiceModal(true)}
            className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
            請求書を作成 →
          </button>
        </div>
      )}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => setShowInvoiceModal(false)}>
          <div className="bg-white rounded border border-gray-200 max-w-sm w-full my-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">請求書プレビュー</span>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-500 hover:text-gray-900 text-lg leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="text-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 tracking-widest">請 求 書</h2>
              </div>
              {[
                ['請求書 No.', `INV-${deal.id}-${today}`],
                ['請求先', deal.clientName],
                ['件名', deal.dealName],
                ['金額', `¥${deal.amount.toLocaleString()}`],
                ['振込先', '三菱UFJ銀行 名古屋支店 普通 1234567 トライポット(カ'],
                ['支払期日', '検収後翌月末'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs font-semibold text-gray-500 shrink-0">{label}</span>
                  <span className="text-xs text-gray-900 text-right">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">
                キャンセル
              </button>
              <button
                onClick={() => { setShowInvoiceModal(false); onStageChange('invoiced'); }}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">
                請求書を発行する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


type InvoiceData = NonNullable<Deal['invoice']>;

function InvoiceProgressBar({ stage }: { stage: Stage }) {
  const steps = [
    { key: 'ordered', label: '受注' },
    { key: 'acceptance', label: '検収' },
    { key: 'invoiced', label: '請求' },
    { key: 'paid', label: '入金済' },
  ];
  const stageOrder: Stage[] = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
  const currentIdx = stageOrder.indexOf(stage);
  const stepOrder = ['ordered', 'acceptance', 'invoiced', 'paid'];

  return (
    <div className="flex items-center gap-0 mb-4">
      {steps.map((step, i) => {
        const stepStageIdx = stageOrder.indexOf(step.key as Stage);
        const done = currentIdx >= stepStageIdx;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium mt-0.5 ${done ? 'text-blue-600' : 'text-gray-500'}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mb-3 ${done && currentIdx >= stageOrder.indexOf(steps[i + 1].key as Stage) ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InvoiceSection({
  deal,
  invoice,
  onInvoiceChange,
  onStageChange,
  onAppendHistory,
}: {
  deal: Deal;
  invoice: InvoiceData;
  onInvoiceChange: (next: InvoiceData) => void;
  onStageChange: (s: Stage) => void;
  onAppendHistory: (event: Omit<HistoryEvent, 'id' | 'at'>) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [draftText, setDraftText] = useState(invoice.memo ?? '');
  const [generating, setGenerating] = useState(false);

  const buildDraftText = () => {
    const paymentDue = new Date();
    paymentDue.setDate(paymentDue.getDate() + 30);
    const dueStr = paymentDue.toISOString().slice(0, 10);
    const amt = deal.amount > 0 ? deal.amount : (deal.monthlyAmount ?? 0);
    const tax = Math.round(amt * 0.1);
    return `請求書

請求先: ${deal.clientName} 御中
件名: ${deal.dealName}

発行日: ${today}
支払期限: ${dueStr}（30日以内）

---
品目: ${deal.dealName}
金額（税別）: ¥${amt.toLocaleString()}
消費税（10%）: ¥${tax.toLocaleString()}
合計（税込）: ¥${(amt + tax).toLocaleString()}
---

振込先: 三菱UFJ銀行 名古屋支店 普通 1234567 トライポット(カ

何卒よろしくお願いいたします。

トライポット株式会社
担当: ${deal.assignee}`;
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const text = buildDraftText();
      setDraftText(text);
      onInvoiceChange({ ...invoice, status: 'draft', memo: text, amount: deal.amount > 0 ? deal.amount : (deal.monthlyAmount ?? 0) });
      setGenerating(false);
    }, 1200);
  };

  const handleMarkSent = () => {
    onInvoiceChange({ ...invoice, status: 'sent', issuedAt: today, memo: draftText });
    onStageChange('invoiced');
  };

  const handleMarkPaid = () => {
    onInvoiceChange({ ...invoice, status: 'paid', paidAt: today });
    onStageChange('paid');
  };

  const handleOpenGmail = () => {
    let to = '';
    try {
      const raw = localStorage.getItem('coaris_customers');
      if (raw) {
        const arr = JSON.parse(raw) as Array<{ companyName: string; contactEmail: string }>;
        const hit = arr.find((c) => c.companyName === deal.clientName);
        if (hit?.contactEmail) to = hit.contactEmail;
      }
    } catch {}
    const subject = `【請求書】${deal.dealName}`;
    const body = draftText;
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    logEmailSent({ to, subject, contextType: 'invoice', contextId: deal.id, actor: deal.assignee });
    onAppendHistory({ type: 'invoice_sent', title: `請求書をGmailで送信: ${subject}`, actor: deal.assignee });
    window.open(gmail, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">請求書</p>
      </div>
      <div className="p-5">
        <InvoiceProgressBar stage={deal.stage} />

        {invoice.status === 'none' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">見積書の内容をもとにAIが請求書テキストを生成します。送付後「送付済」にマークしてください。</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-[0.98] transition-all">
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </span>
              ) : 'AIで請求書を作成'}
            </button>
          </div>
        )}

        {invoice.status === 'draft' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">下書き</span>
            </div>
            <textarea
              value={draftText}
              onChange={(e) => { setDraftText(e.target.value); onInvoiceChange({ ...invoice, memo: e.target.value }); }}
              rows={12}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleOpenGmail}
                className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all">
                Gmailで送る
              </button>
              <button
                onClick={handleMarkSent}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all">
                送付済にする
              </button>
            </div>
          </div>
        )}

        {invoice.status === 'sent' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">請求書送付済み</p>
                {invoice.issuedAt && <p className="text-xs text-gray-500">送付日: {invoice.issuedAt}</p>}
                {invoice.amount && invoice.amount > 0 && (
                  <p className="text-xs text-gray-500 tabular-nums">金額: ¥{invoice.amount.toLocaleString()}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleMarkPaid}
              className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-[0.98] transition-all">
              入金確認済みにする
            </button>
          </div>
        )}

        {invoice.status === 'paid' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <svg className="w-4 h-4 text-gray-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-900">入金済み</p>
                {invoice.paidAt && <p className="text-xs text-gray-500">入金日: {invoice.paidAt}</p>}
                {invoice.amount && invoice.amount > 0 && (
                  <p className="text-xs text-gray-700 font-semibold tabular-nums">¥{invoice.amount.toLocaleString()}</p>
                )}
              </div>
            </div>
            <a
              href="https://biz.moneyforward.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-1.5">
              MFクラウドで詳細を見る →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function BillingPhasePanel({ deal, onStageChange }: { deal: Deal; onStageChange: (s: Stage) => void }) {
  if (deal.stage === 'invoiced') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="grid grid-cols-3 divide-x divide-gray-100 border border-gray-100 rounded mb-3">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">請求日</p>
            <p className="text-xs font-semibold text-gray-900">{deal.invoiceDate ?? '—'}</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">請求額</p>
            <p className="text-xs font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</p>
          </div>
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 mb-0.5">支払期限</p>
            <p className="text-xs font-semibold text-gray-900">{deal.paymentDue ?? '—'}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-2">
          <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50">
            Slackで通知
          </button>
          <button className="flex-1 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50">
            MFクラウド連携
          </button>
        </div>
        <button
          onClick={() => onStageChange('accounting')}
          className="w-full py-2.5 bg-gray-100 text-gray-700 rounded text-sm font-medium hover:bg-gray-200 transition-colors">
          経理処理中に変更
        </button>
      </div>
    );
  }

  if (deal.stage === 'accounting') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200 mb-3">
          <span className="w-2 h-2 bg-gray-400 rounded-full shrink-0" />
          <p className="text-sm font-medium text-gray-700">経理処理中</p>
        </div>
        <button
          onClick={() => onStageChange('paid')}
          className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
          入金確認
        </button>
      </div>
    );
  }

  if (deal.stage === 'paid') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">請求フェーズ</h2>
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200">
          <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-900">入金確認済み</p>
            {deal.paidDate && <p className="text-xs text-gray-500">{deal.paidDate}</p>}
          </div>
        </div>
      </div>
    );
  }

  return null;
}


const RESOURCES = [
  { id: 'ono', name: '小野 崇', role: 'PM', load: 80, type: 'inhouse' },
  { id: 'kashiwagi', name: '柏樹 久美子', role: '営業', load: 60, type: 'inhouse' },
  { id: 'inukai', name: '犬飼 智之', role: '開発', load: 90, type: 'inhouse' },
  { id: 'izumi', name: '和泉 阿委璃', role: 'ディレクター', load: 40, type: 'inhouse' },
  { id: 'create-design', name: 'クリエイトデザイン', role: 'UIデザイン', load: 50, type: 'outsource' },
  { id: 'tech-bridge', name: 'テックブリッジ', role: 'インフラ', load: 25, type: 'outsource' },
];

type AssignedMember = { resourceId: string; roleLabel: string };

function LoadBadge({ load }: { load: number }) {
  if (load >= 80) return <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">⚠ キャパ限界</span>;
  if (load < 50) return <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">空きあり</span>;
  return <span className="text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">{load}%</span>;
}

function RequirementPromptDetails({ dealContext }: { dealContext: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {open ? '詳細設定を閉じる' : '詳細設定を開く'}
      </button>
      {open && (
        <div className="mt-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">参照コンテキスト（AIへの指示）</label>
          <pre className="w-full px-3 py-2 border border-gray-200 rounded text-xs text-gray-600 bg-gray-50 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{dealContext}</pre>
        </div>
      )}
    </div>
  );
}

type ProductionTask = {
  id: string;
  title: string;
  detail?: string;
  dueDate: string;
  assigneeId: string;
  status: 'todo' | 'doing' | 'done';
};

function OrderedFlowSection({ deal, onSendToProduction }: { deal: Deal; onSendToProduction: () => void }) {
  const [requirementState, setRequirementState] = useState<'idle' | 'generating' | 'generated' | 'approved'>('idle');
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [requirementText, setRequirementText] = useState('');
  const [assignedMembers, setAssignedMembers] = useState<AssignedMember[]>([]);
  const [deadline, setDeadline] = useState('');
  const [scheduleState, setScheduleState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [scheduleItems, setScheduleItems] = useState<{ phase: string; period: string }[]>([]);
  const [tasksState, setTasksState] = useState<'idle' | 'generating' | 'generated'>('idle');
  const [tasks, setTasks] = useState<ProductionTask[]>([]);

  const dealContext = gatherDealContext(deal);
  const comms = MOCK_COMMS[deal.id] ?? [];
  const contextNeeds = comms.flatMap((c) => c.needs ?? []);

  const mockRequirement = `# 要件定義書: ${deal.dealName}

## 1. プロジェクト概要
- クライアント: ${deal.clientName}
- 案件名: ${deal.dealName}
- 予算: ¥${deal.amount > 0 ? deal.amount.toLocaleString() : (deal.monthlyAmount ? deal.monthlyAmount.toLocaleString() + '/月' : '別途協議')}
- 業種: ${deal.industry}

## 2. 背景・課題（顧客ヒアリングより）
${dealContext}
## 3. 機能要件（ニーズから導出）
${contextNeeds.length > 0
  ? contextNeeds.map((n, i) => `### 3.${i + 1} ${n}\n- 具体的な実装内容について顧客と詳細確認が必要`).join('\n\n')
  : `### 3.1 ユーザー管理\n- ログイン/ログアウト機能\n- ロール管理（管理者/一般ユーザー）\n- プロフィール編集\n\n### 3.2 コア機能\n- ダッシュボード（KPI表示）\n- データ入力フォーム\n- レポート生成\n- 通知機能`}

## 4. 非機能要件
- レスポンス: 3秒以内
- 稼働率: 99%以上
- セキュリティ: SSL/TLS、データ暗号化
- ブラウザ: Chrome/Edge最新版

## 5. 技術スタック
- フロントエンド: Next.js + TypeScript
- バックエンド: Supabase
- インフラ: Vercel

## 6. 画面一覧（概算）
- ログイン画面
- ダッシュボード
- データ入力画面
- レポート画面
- 設定画面
`;

  const handleGenerateRequirement = () => {
    setRequirementState('generating');
    setTimeout(() => {
      setRequirementText(mockRequirement);
      setRequirementState('generated');
    }, 1500);
  };

  const handleApproveRequirement = () => {
    setRequirementState('approved');
    if (deal.stage === 'ordered') {
      onSendToProduction();
    }
  };

  const handleGenerateTasks = () => {
    setTasksState('generating');
    setTimeout(() => {
      const today = new Date('2026-04-08');
      const addDays = (n: number) => {
        const d = new Date(today);
        d.setDate(d.getDate() + n);
        return d.toISOString().slice(0, 10);
      };
      const baseTasks: Omit<ProductionTask, 'id' | 'assigneeId' | 'status'>[] = [
        { title: 'キックオフMTG準備',     detail: '議題・参加者・資料整理',         dueDate: addDays(3) },
        { title: 'クライアント要件再ヒアリング', detail: '不明点リストの作成',     dueDate: addDays(5) },
        { title: '画面設計（ワイヤー）',  detail: '主要5画面のワイヤーフレーム',    dueDate: addDays(10) },
        { title: 'DB設計',                detail: 'ER図、テーブル定義書',          dueDate: addDays(12) },
        { title: '実装フェーズ1（認証）', detail: 'ログイン・権限管理',            dueDate: addDays(20) },
        { title: '実装フェーズ2（コア機能）', detail: 'メイン業務ロジック',         dueDate: addDays(40) },
        { title: 'テスト・修正',          detail: '結合・受入れテスト',            dueDate: addDays(55) },
        { title: '納品・運用引き継ぎ',    detail: 'マニュアル作成・トレーニング', dueDate: addDays(60) },
      ];
      const generated: ProductionTask[] = baseTasks.map((t, i) => ({
        ...t,
        id: `task-${Date.now()}-${i}`,
        assigneeId: assignedMembers[i % Math.max(1, assignedMembers.length)]?.resourceId ?? '',
        status: 'todo' as const,
      }));
      setTasks(generated);
      setTasksState('generated');
    }, 1500);
  };

  const updateTask = (id: string, patch: Partial<ProductionTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addTask = () => {
    const today = new Date('2026-04-08');
    today.setDate(today.getDate() + 7);
    const newTask: ProductionTask = {
      id: `task-${Date.now()}`,
      title: '新しいタスク',
      dueDate: today.toISOString().slice(0, 10),
      assigneeId: assignedMembers[0]?.resourceId ?? '',
      status: 'todo',
    };
    setTasks((prev) => [...prev, newTask]);
  };

  const addMember = () => {
    setAssignedMembers((prev) => [...prev, { resourceId: '', roleLabel: '' }]);
  };

  const updateMember = (idx: number, resourceId: string) => {
    setAssignedMembers((prev) => prev.map((m, i) => i === idx ? { ...m, resourceId } : m));
  };

  const removeMember = (idx: number) => {
    setAssignedMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleGenerateSchedule = () => {
    if (!deadline) return;
    setScheduleState('generating');
    setTimeout(() => {
      const end = new Date(deadline);
      const now = new Date('2026-04-07');
      const totalDays = Math.max(14, Math.floor((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const req = Math.round(totalDays * 0.15);
      const design = Math.round(totalDays * 0.15);
      const dev = Math.round(totalDays * 0.50);
      const test = totalDays - req - design - dev;
      const fmt = (d: Date) => d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }).replace('/', '/');
      const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
      const s1 = now;
      const e1 = addDays(s1, req);
      const s2 = addDays(e1, 1);
      const e2 = addDays(s2, design);
      const s3 = addDays(e2, 1);
      const e3 = addDays(s3, dev);
      const s4 = addDays(e3, 1);
      const e4 = addDays(s4, test);
      setScheduleItems([
        { phase: '要件定義', period: `${fmt(s1)}〜${fmt(e1)}（${req}日間）` },
        { phase: '設計', period: `${fmt(s2)}〜${fmt(e2)}（${design}日間）` },
        { phase: '開発', period: `${fmt(s3)}〜${fmt(e3)}（${dev}日間）` },
        { phase: 'テスト', period: `${fmt(s4)}〜${fmt(e4)}（${test}日間）` },
        { phase: '納品', period: deadline },
      ]);
      setScheduleState('generated');
    }, 1400);
  };

  const assignedMembersValid = assignedMembers.length > 0 && assignedMembers.every((m) => m.resourceId !== '');
  const allReady =
    requirementState === 'approved' &&
    assignedMembersValid &&
    deadline !== '' &&
    scheduleState === 'generated';

  const summaryLines: { label: string; value: string; ok: boolean }[] = [
    { label: '要件定義', value: requirementState === 'approved' ? '承認済み' : '未承認', ok: requirementState === 'approved' },
    {
      label: 'アサイン',
      value: assignedMembersValid
        ? assignedMembers.map((m) => RESOURCES.find((r) => r.id === m.resourceId)?.name ?? '').filter(Boolean).join('、')
        : '未設定',
      ok: assignedMembersValid,
    },
    {
      label: '予算',
      value: deal.amount > 0 ? `¥${(deal.amount / 10000).toFixed(0)}万` : deal.monthlyAmount ? `¥${(deal.monthlyAmount / 10000).toFixed(0)}万/月` : '未設定',
      ok: deal.amount > 0 || (deal.monthlyAmount !== undefined && deal.monthlyAmount > 0),
    },
    { label: '納期', value: deadline || '未設定', ok: deadline !== '' },
    { label: 'スケジュール', value: scheduleState === 'generated' ? '生成済み' : '未生成', ok: scheduleState === 'generated' },
  ];

  return (
    <div className="space-y-4 mb-4">
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">要件定義書</p>
        </div>
        <div className="p-4">
          {requirementState === 'idle' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                追加の指示がなければ、このまま生成できます。カスタマイズしたい場合は下の詳細設定を開いてください。
              </div>
              <RequirementPromptDetails dealContext={dealContext} />
              <button
                onClick={handleGenerateRequirement}
                className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
                AIで要件定義を生成
              </button>
            </div>
          )}
          {requirementState === 'generating' && (
            <div className="flex items-center justify-center py-6 gap-3">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
              <span className="text-sm text-gray-500">要件定義書を生成中...</span>
            </div>
          )}
          {(requirementState === 'generated' || requirementState === 'approved') && (
            <div className="space-y-3">
              <textarea
                value={requirementText}
                onChange={(e) => setRequirementText(e.target.value)}
                rows={14}
                readOnly={requirementState === 'approved'}
                className={`w-full px-3 py-2.5 border border-gray-200 rounded text-xs text-gray-900 font-mono leading-relaxed focus:ring-2 focus:ring-blue-600 resize-none ${requirementState === 'approved' ? 'bg-gray-50 text-gray-600' : ''}`}
              />
              {requirementState === 'generated' && (
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveRequirement}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
                    承認する
                  </button>
                  <button
                    onClick={handleGenerateRequirement}
                    className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 transition-colors">
                    AIで再生成
                  </button>
                </div>
              )}
              {requirementState === 'approved' && (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded">
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-700">要件定義 承認済み</span>
                  <button onClick={() => setRequirementState('generated')} className="ml-auto text-xs text-gray-500 hover:text-gray-700 font-medium">編集</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {requirementState === 'approved' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">タスク</p>
            {tasks.length > 0 && (
              <span className="text-xs font-semibold text-gray-500">{tasks.length}件</span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {tasksState === 'idle' && (
              <button
                onClick={handleGenerateTasks}
                className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]">
                AIで要件定義からタスクを生成
              </button>
            )}
            {tasksState === 'generating' && (
              <div className="flex items-center justify-center py-6 gap-3">
                <span className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-500">タスクを生成中...</span>
              </div>
            )}
            {tasksState === 'generated' && (
              <>
                <div className="space-y-2">
                  {tasks.map((task) => {
                    const res = RESOURCES.find((r) => r.id === task.assigneeId);
                    return (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
                        <div className="flex items-start gap-2 mb-2">
                          <input
                            type="text"
                            value={task.title}
                            onChange={(e) => updateTask(task.id, { title: e.target.value })}
                            className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1"
                          />
                          <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-600 text-sm shrink-0 px-1">×</button>
                        </div>
                        {task.detail !== undefined && (
                          <input
                            type="text"
                            value={task.detail}
                            onChange={(e) => updateTask(task.id, { detail: e.target.value })}
                            placeholder="詳細"
                            className="w-full text-xs text-gray-600 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1 mb-2"
                          />
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">期限</span>
                            <input
                              type="date"
                              value={task.dueDate}
                              onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                              className="text-xs text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                            <span className="text-xs text-gray-500">担当</span>
                            <select
                              value={task.assigneeId}
                              onChange={(e) => updateTask(task.id, { assigneeId: e.target.value })}
                              className="flex-1 text-xs text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
                            >
                              <option value="">未アサイン</option>
                              <optgroup label="社内">
                                {RESOURCES.filter((r) => r.type === 'inhouse').map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </optgroup>
                              <optgroup label="外注">
                                {RESOURCES.filter((r) => r.type === 'outsource').map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </optgroup>
                            </select>
                            {res && <LoadBadge load={res.load} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addTask}
                    className="flex-1 py-2 border border-dashed border-gray-300 rounded text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
                    + タスクを追加
                  </button>
                  <button
                    onClick={handleGenerateTasks}
                    className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-50 transition-colors">
                    AIで再生成
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">アサイン</p>
          </div>
          <div className="p-4 space-y-3">
            {assignedMembers.length === 0 && (
              <p className="text-xs text-gray-500">メンバーを追加してください。各メンバーの稼働率が確認できます。</p>
            )}
            <div className="space-y-2">
              {assignedMembers.map((m, i) => {
                const res = RESOURCES.find((r) => r.id === m.resourceId);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      value={m.resourceId}
                      onChange={(e) => updateMember(i, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
                      <option value="">選択してください</option>
                      <optgroup label="社内">
                        {RESOURCES.filter((r) => r.type === 'inhouse').map((r) => (
                          <option key={r.id} value={r.id}>{r.name}（{r.role}）</option>
                        ))}
                      </optgroup>
                      <optgroup label="外注">
                        {RESOURCES.filter((r) => r.type === 'outsource').map((r) => (
                          <option key={r.id} value={r.id}>{r.name}（{r.role}）</option>
                        ))}
                      </optgroup>
                    </select>
                    {res && <LoadBadge load={res.load} />}
                    <button onClick={() => removeMember(i)} className="text-gray-500 hover:text-red-600 text-lg leading-none shrink-0">×</button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={addMember}
              className="w-full py-2 border border-dashed border-gray-300 rounded text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors">
              + メンバーを追加
            </button>
          </div>
        </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">納期・スケジュール</p>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label htmlFor="deadline" className="block text-xs font-medium text-gray-700 mb-1.5">
                納期 <span className="text-red-500">*</span>
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => { setDeadline(e.target.value); setScheduleState('idle'); setScheduleItems([]); }}
                className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            {deadline && scheduleState !== 'generated' && (
              <button
                onClick={handleGenerateSchedule}
                disabled={scheduleState === 'generating'}
                className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                {scheduleState === 'generating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    スケジュールを逆算中...
                  </span>
                ) : 'AIでスケジュールを逆算'}
              </button>
            )}
            {scheduleState === 'generated' && scheduleItems.length > 0 && (
              <div className="space-y-2">
                {scheduleItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-xs font-semibold text-gray-700 w-20 shrink-0">{item.phase}</span>
                    <span className="text-xs text-gray-600 text-right">{item.period}</span>
                  </div>
                ))}
                <button
                  onClick={() => { setScheduleState('idle'); setScheduleItems([]); }}
                  className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                  AIで再生成
                </button>
              </div>
            )}
          </div>
        </div>

      {requirementState === 'approved' && (
        <div className={`rounded-lg border p-4 ${allReady ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">制作に渡す</p>
          <div className="space-y-1.5 mb-4">
            {summaryLines.map((line) => (
              <div key={line.label} className="flex items-center gap-2">
                {line.ok ? (
                  <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 bg-gray-300 rounded-full" />
                  </span>
                )}
                <span className="text-xs font-semibold text-gray-700 w-24 shrink-0">{line.label}</span>
                <span className={`text-xs ${line.ok ? 'text-gray-700' : 'text-gray-500'}`}>{line.value}</span>
              </div>
            ))}
          </div>
          <button
            disabled={!allReady}
            onClick={() => { if (allReady) setShowSendConfirm(true); }}
            className={`w-full py-3 rounded text-sm font-semibold transition-colors ${
              allReady
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}>
            {allReady ? '制作パイプラインに渡す →' : '全項目を入力してください'}
          </button>
          {showSendConfirm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowSendConfirm(false)}>
              <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full p-5" onClick={(e) => e.stopPropagation()}>
                <p className="text-sm font-semibold text-gray-900 mb-2">制作チームに引き継ぎます</p>
                <p className="text-sm text-gray-600 mb-4">要件定義・アサイン・スケジュールを確認しましたか？</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSendConfirm(false)}
                    className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition-all">
                    戻る
                  </button>
                  <button
                    onClick={() => { setShowSendConfirm(false); onSendToProduction(); }}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all">
                    引き継ぐ
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



function ProcessTab({ deal, onUpdate, onAppendHistory }: {
  deal: Deal;
  onUpdate: (next: Deal) => void;
  onAppendHistory: (event: Omit<HistoryEvent, 'id' | 'at'>) => void;
}) {
  const proc = deal.process ?? { requirementsGenerated: false, wbsGenerated: false, committedToProduction: false };
  const router = useRouter();

  const [reqGenerating, setReqGenerating] = useState(false);
  const [reqOpen, setReqOpen] = useState(false);
  const [wbsGenerating, setWbsGenerating] = useState(false);
  const [partners, setPartners] = useState<ExternalPartner[]>(() => getPartners());
  const [showAddPartner, setShowAddPartner] = useState<string | null>(null);
  const [newPartnerForm, setNewPartnerForm] = useState({ companyName: '', contactName: '', role: '', email: '' });
  const [toast, setToast] = useState('');
  // 担当PM・チーム候補（localState初期値はproc、未設定ならデフォルト案件担当者）
  const defaultPmId = proc.pmId ?? MEMBERS.find((m) => m.name === deal.assignee)?.id ?? MEMBERS[0].id;
  const [pmId, setPmId] = useState<string>(defaultPmId);
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>(proc.teamMemberIds ?? []);

  useEffect(() => {
    if (!proc.committedToProduction || !proc.handoffCardId) return;
    const pmMember = MEMBERS.find((m) => m.id === pmId);
    updateProductionCard(proc.handoffCardId, {
      pmId,
      pmName: pmMember?.name ?? deal.assignee,
      teamMemberIds,
    });
  }, [pmId, teamMemberIds, proc.committedToProduction, proc.handoffCardId, deal.assignee]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const getInternalMemberName = (id: string) => MEMBERS.find((m) => m.id === id)?.name ?? id;
  const getExternalPartnerLabel = (id: string) => {
    const p = partners.find((x) => x.id === id);
    return p ? `${p.companyName} / ${p.contactName}` : id;
  };

  const mockReqDoc = `# 要件定義書: ${deal.dealName}

## 1. プロジェクト概要
- クライアント: ${deal.clientName}
- 案件名: ${deal.dealName}
- 予算: ¥${deal.amount > 0 ? deal.amount.toLocaleString() : deal.monthlyAmount ? deal.monthlyAmount.toLocaleString() + '/月' : '別途協議'}
- 業種: ${deal.industry}

## 2. 背景・課題
- 業務効率化・デジタル化の推進が急務
- 現行システムの老朽化・保守コスト増大

## 3. 機能要件
### 3.1 ユーザー管理
- ログイン/ログアウト / ロール管理 / プロフィール編集

### 3.2 コア機能
- ダッシュボード（KPI表示）/ データ入力 / レポート生成 / 通知

## 4. 非機能要件
- レスポンス3秒以内 / 稼働率99%以上 / SSL/TLS暗号化

## 5. 技術スタック
- フロントエンド: Next.js + TypeScript
- バックエンド: Supabase / インフラ: Vercel`;

  const wbsTemplates: Record<string, string[]> = {
    'IT': ['トップページデザイン', '下層ページデザイン', 'HTMLコーディング', 'バックエンド実装', 'テスト', 'ディレクション', 'SEO設定', 'リリース対応'],
    '製造業': ['要件ヒアリング', '基本設計', 'DB設計', 'API実装', 'フロントエンド実装', '結合テスト', '受入テスト', '運用引継ぎ'],
    '医療': ['要件ヒアリング', 'セキュリティ設計', '基本設計', '実装（認証・RBAC）', '実装（業務機能）', 'バリデーションテスト', '受入テスト', 'ドキュメント作成'],
  };

  const getWbsTitles = () => {
    const template = wbsTemplates[deal.industry] ?? wbsTemplates['IT'];
    return template;
  };

  const handleGenerateReq = () => {
    setReqGenerating(true);
    setTimeout(() => {
      const next: Deal = { ...deal, process: { ...proc, requirementsGenerated: true, requirementsDoc: mockReqDoc } };
      onUpdate(next);
      setReqGenerating(false);
      setReqOpen(true);
    }, 1500);
  };

  const handleGenerateWbs = () => {
    setWbsGenerating(true);
    setTimeout(() => {
      const titles = getWbsTitles();
      const today = new Date('2026-04-08');
      const addDays = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
      const newTasks: ProcessTask[] = titles.map((title, i) => ({
        id: `ptask_${Date.now()}_${i}`,
        title,
        dueDate: addDays((i + 1) * 7),
        assigneeType: 'unassigned' as const,
        hours: 8,
      }));
      const next: Deal = { ...deal, process: { ...proc, requirementsGenerated: true, requirementsDoc: proc.requirementsDoc ?? mockReqDoc, wbsGenerated: true, tasks: newTasks, committedToProduction: proc.committedToProduction, committedAt: proc.committedAt } };
      onUpdate(next);
      setWbsGenerating(false);
    }, 1500);
  };

  const updateTask = (id: string, patch: Partial<ProcessTask>) => {
    const tasks = (proc.tasks ?? []).map((t) => t.id === id ? { ...t, ...patch } : t);
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };

  const removeTask = (id: string) => {
    const tasks = (proc.tasks ?? []).filter((t) => t.id !== id);
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };

  const addTask = () => {
    const newTask: ProcessTask = {
      id: `ptask_${Date.now()}`,
      title: '新しいタスク',
      dueDate: new Date('2026-04-15').toISOString().slice(0, 10),
      assigneeType: 'unassigned',
      hours: 8,
    };
    const tasks = [...(proc.tasks ?? []), newTask];
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };

  const applyPreset = () => {
    const tasks = (proc.tasks ?? []).map((t) => {
      const title = t.title.toLowerCase();
      if (title.includes('デザイン') || title.includes('ワイヤー') || title.includes('カンプ')) {
        const m = MEMBERS.find((x) => x.id === 'kashiwagi');
        return { ...t, assigneeType: 'internal' as const, internalMemberId: m?.id ?? '' };
      }
      if (title.includes('コーディング') || title.includes('コード') || title.includes('実装') || title.includes('バックエンド')) {
        const p = partners.find((x) => x.contactName === 'Vinh') ?? partners[0];
        return { ...t, assigneeType: 'external' as const, externalPartnerId: p?.id };
      }
      if (title.includes('ディレクション') || title.includes('pm') || title.includes('PM')) {
        const m = MEMBERS.find((x) => x.id === 'izumi');
        return { ...t, assigneeType: 'internal' as const, internalMemberId: m?.id ?? '' };
      }
      return t;
    });
    onUpdate({ ...deal, process: { ...proc, tasks } });
  };

  const handleAddPartner = (taskId: string) => {
    const { companyName, contactName } = newPartnerForm;
    if (!companyName.trim() || !contactName.trim()) return;
    const newP = addPartner({ companyName: companyName.trim(), contactName: contactName.trim(), role: newPartnerForm.role.trim() || undefined, email: newPartnerForm.email.trim() || undefined });
    setPartners(getPartners());
    updateTask(taskId, { assigneeType: 'external', externalPartnerId: newP.id });
    setShowAddPartner(null);
    setNewPartnerForm({ companyName: '', contactName: '', role: '', email: '' });
  };

  const allAssigned = (proc.tasks ?? []).length > 0 && (proc.tasks ?? []).every((t) => t.assigneeType !== 'unassigned');
  const lockedByHandoff = proc.committedToProduction;

  // 🆕 制作引き渡し: ProductionCard 生成して /production に飛ばす
  // 旧「制作ラインへ投入」は /my-production 直行で犬飼に飛ぶ設計バグがあったため廃止
  const handleCommit = () => {
    const now = new Date().toISOString();
    const internalTasks = (proc.tasks ?? []).filter((t) => t.assigneeType === 'internal' && t.internalMemberId);

    // ProductionCard を生成して localStorage に保存
    const pmMember = MEMBERS.find((m) => m.id === pmId);
    const quoteTotal = deal.revenueType === 'running' ? (deal.monthlyAmount ?? 0) * 12 : deal.amount;
    const card = buildProductionCard({
      dealId: deal.id,
      dealName: deal.dealName,
      clientName: deal.clientName,
      amount: quoteTotal,
      pmId: pmId,
      pmName: pmMember?.name ?? deal.assignee,
      teamMemberIds: teamMemberIds,
      externalPartnerIds: (proc.tasks ?? [])
        .filter((t) => t.assigneeType === 'external' && t.externalPartnerId)
        .map((t) => t.externalPartnerId!)
        .filter((v, i, a) => a.indexOf(v) === i),
      requirement: proc.requirementsDoc ?? '',
      proposalSummary: `${deal.dealName} / ${deal.clientName}`,
      quoteTotal: quoteTotal,
      budget: quoteTotal,
      handedOffBy: deal.assignee,
    });

    const reqDoc = proc.requirementsDoc ?? '';
    const reqLines = reqDoc
      .split('\n')
      .filter((l) => l.trim().startsWith('- ') || /^\d+\./.test(l.trim()))
      .slice(0, 6);
    const fallbackTitles = ['要件確認MTG', '画面設計', 'API設計', '実装', 'テスト', 'リリース'];
    const autoTaskTitles = reqLines.length > 0
      ? reqLines.map((l) => l.replace(/^[-\d.)\s]+/, '').trim())
      : fallbackTitles;
    card.tasks = autoTaskTitles.map((title, i) => ({
      id: `t_${card.id}_${i}`,
      title,
      status: 'todo' as const,
      assigneeId: i === 0 ? pmId : teamMemberIds[i % Math.max(teamMemberIds.length, 1)] ?? pmId,
    }));
    card.phase = 'requirements';
    addProductionCard(card);

    // PMに優先的に通知（遷移先は /production の引き渡しカード画面）
    sendNotification({
      toMemberId: pmId,
      fromMemberId: 'system',
      fromName: 'システム',
      type: 'task_assigned',
      title: `制作引き渡し: ${deal.dealName}`,
      body: `${deal.clientName} の案件が制作に引き渡されました。PM: ${pmMember?.name ?? ''}`,
      link: '/production',
    });

    // 残りの内部チームメンバーにも通知
    internalTasks.forEach((t) => {
      if (t.internalMemberId === pmId) return;
      sendNotification({
        toMemberId: t.internalMemberId!,
        fromMemberId: 'system',
        fromName: 'システム',
        type: 'task_assigned',
        title: `制作タスクをアサインしました`,
        body: `${deal.dealName}（${deal.clientName}）の「${t.title}」が割り当てられました。`,
        link: '/production',
      });
    });

    const next: Deal = {
      ...deal,
      process: {
        ...proc,
        committedToProduction: true,
        committedAt: now,
        pmId: pmId,
        teamMemberIds: teamMemberIds,
        handoffCardId: card.id,
      },
    };
    onUpdate(next);
    onAppendHistory({
      type: 'note',
      title: '制作に引き渡し',
      actor: deal.assignee,
      description: `PM: ${pmMember?.name ?? '-'} / 内部${internalTasks.length}件 / チーム${teamMemberIds.length}名。ProductionCard生成済。`,
    });
    showToast('制作に引き渡しました。ダッシュボードに移動します');

    // 少しウェイトしてから制作ダッシュボードに遷移
    setTimeout(() => router.push('/production'), 800);
  };

  const stepDone1 = proc.requirementsGenerated;
  const stepDone2 = proc.wbsGenerated && (proc.tasks ?? []).length > 0;

  return (
    <div className="space-y-4 pt-2 pb-8">
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-xl shadow-sm z-50">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">🔧</span>
        <p className="text-sm font-semibold text-gray-900">工程・アサイン</p>
        {proc.committedToProduction && (
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">制作ライン投入済み</span>
        )}
      </div>

      <div className="flex gap-2 items-start">
        {[
          { n: 1, label: '要件定義', done: stepDone1 },
          { n: 2, label: '工程吐き出し', done: stepDone2 },
          { n: 3, label: 'アサイン', done: allAssigned && stepDone2 },
          { n: 4, label: 'PM・チーム', done: !!pmId && teamMemberIds.length > 0 },
          { n: 5, label: '制作引き渡し', done: proc.committedToProduction },
        ].map((s) => (
          <div key={s.n} className="flex flex-col items-center gap-1 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${s.done ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{s.done ? '✓' : s.n}</div>
            <p className="text-xs text-gray-500 text-center leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      {lockedByHandoff && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700">
          📦 制作に引き渡し済み — 要件定義・WBS・タスクアサインは参照のみ（PM・チーム変更は可能、制作カードに即反映）
        </div>
      )}

      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${lockedByHandoff ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">① 要件定義</p>
          {stepDone1 && <span className="text-xs font-semibold text-blue-600">生成済み</span>}
        </div>
        <div className="p-4">
          {!stepDone1 ? (
            <button
              onClick={handleGenerateReq}
              disabled={reqGenerating}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all duration-200">
              {reqGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  要件定義を生成中...
                </span>
              ) : '① 要件定義を生成'}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => setReqOpen((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
                <svg className={`w-4 h-4 transition-transform ${reqOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {reqOpen ? '要件定義書を閉じる' : '要件定義書を見る'}
              </button>
              {reqOpen && (
                <pre className="w-full px-3 py-2.5 border border-gray-200 rounded text-xs text-gray-800 bg-gray-50 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{proc.requirementsDoc}</pre>
              )}
              <button
                onClick={handleGenerateReq}
                disabled={reqGenerating}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">
                {reqGenerating ? '再生成中...' : '再生成'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${!stepDone1 || lockedByHandoff ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">② 工程吐き出し（WBS）</p>
          {stepDone2 && <span className="text-xs font-semibold text-blue-600">{(proc.tasks ?? []).length}件</span>}
        </div>
        <div className="p-4">
          {!stepDone2 ? (
            <button
              onClick={handleGenerateWbs}
              disabled={wbsGenerating || !stepDone1}
              className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold disabled:opacity-50 active:scale-[0.98] transition-all duration-200">
              {wbsGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  工程を生成中...
                </span>
              ) : '② 工程を吐き出す'}
            </button>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{(proc.tasks ?? []).length}件のタスクが生成されました</p>
                <div className="flex gap-2">
                  <button onClick={applyPreset} className="text-xs font-medium text-blue-600 hover:text-blue-800 active:scale-[0.98] transition-all">一括アサイン</button>
                  <button onClick={handleGenerateWbs} disabled={wbsGenerating} className="text-xs text-gray-500 hover:text-gray-700 font-medium active:scale-[0.98] transition-all">再生成</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {stepDone2 && (proc.tasks ?? []).length > 0 && (
        <div className={`bg-white rounded-2xl border border-gray-200 overflow-hidden ${lockedByHandoff ? 'opacity-60 pointer-events-none' : ''}`}>
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">③ アサイン</p>
            <div className="flex items-center gap-2">
              {allAssigned && <span className="text-xs font-semibold text-blue-600">全員アサイン済み</span>}
              <button onClick={applyPreset} className="text-xs font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 rounded px-2 py-0.5 active:scale-[0.98] transition-all">プリセット</button>
            </div>
          </div>
          <div className="p-3 space-y-2">
            {(proc.tasks ?? []).map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <input
                    type="text"
                    value={task.title}
                    onChange={(e) => updateTask(task.id, { title: e.target.value })}
                    className="flex-1 text-sm font-semibold text-gray-900 bg-transparent border-0 focus:ring-1 focus:ring-blue-500 rounded px-1 -mx-1"
                  />
                  <button onClick={() => removeTask(task.id)} className="text-gray-500 hover:text-red-600 text-sm shrink-0">×</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">内外</span>
                    <select
                      value={task.assigneeType}
                      onChange={(e) => updateTask(task.id, { assigneeType: e.target.value as ProcessTask['assigneeType'], internalMemberId: undefined, externalPartnerId: undefined })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                      <option value="unassigned">未アサイン</option>
                      <option value="internal">内部</option>
                      <option value="external">外部</option>
                    </select>
                  </div>
                  {task.assigneeType === 'internal' && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">担当</span>
                      <select
                        value={task.internalMemberId ?? ''}
                        onChange={(e) => updateTask(task.id, { internalMemberId: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                        <option value="">選択</option>
                        {MEMBERS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {task.assigneeType === 'external' && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-xs text-gray-500">パートナー</span>
                      <select
                        value={task.externalPartnerId ?? ''}
                        onChange={(e) => updateTask(task.id, { externalPartnerId: e.target.value })}
                        className="text-xs border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                        <option value="">選択</option>
                        {partners.map((p) => (
                          <option key={p.id} value={p.id}>{p.companyName} / {p.contactName}{p.role ? ` (${p.role})` : ''}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setShowAddPartner(task.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-[0.98] transition-all">
                        ＋ 新規パートナー登録
                      </button>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">期限</span>
                    <input
                      type="date"
                      value={task.dueDate ?? ''}
                      onChange={(e) => updateTask(task.id, { dueDate: e.target.value })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500">工数</span>
                    <input
                      type="number"
                      value={task.hours ?? ''}
                      onChange={(e) => updateTask(task.id, { hours: Number(e.target.value) })}
                      className="text-xs border border-gray-200 rounded px-1.5 py-0.5 w-14 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      min={0}
                    />
                    <span className="text-xs text-gray-500">h</span>
                  </div>
                </div>
                {showAddPartner === task.id && (
                  <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2 mt-1">
                    <p className="text-xs font-semibold text-blue-700">外部パートナーを追加</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="会社名 *" value={newPartnerForm.companyName} onChange={(e) => setNewPartnerForm((f) => ({ ...f, companyName: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="text" placeholder="担当者名 *" value={newPartnerForm.contactName} onChange={(e) => setNewPartnerForm((f) => ({ ...f, contactName: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="text" placeholder="役割（任意）" value={newPartnerForm.role} onChange={(e) => setNewPartnerForm((f) => ({ ...f, role: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                      <input type="email" placeholder="メール（任意）" value={newPartnerForm.email} onChange={(e) => setNewPartnerForm((f) => ({ ...f, email: e.target.value }))} className="text-xs border border-gray-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAddPartner(null)} className="text-xs text-gray-500 font-medium active:scale-[0.98] transition-all">キャンセル</button>
                      <button onClick={() => handleAddPartner(task.id)} className="text-xs font-semibold text-white bg-blue-600 px-3 py-1 rounded active:scale-[0.98] transition-all">追加</button>
                    </div>
                  </div>
                )}
                {task.assigneeType !== 'unassigned' && (
                  <p className="text-xs text-gray-500">
                    {task.assigneeType === 'internal' && task.internalMemberId ? `内部: ${getInternalMemberName(task.internalMemberId)}` : ''}
                    {task.assigneeType === 'external' && task.externalPartnerId ? `外部: ${getExternalPartnerLabel(task.externalPartnerId)}` : ''}
                  </p>
                )}
              </div>
            ))}
            <button
              onClick={addTask}
              className="w-full py-2 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-500 hover:border-gray-500 hover:text-gray-700 transition-colors active:scale-[0.98]">
              + タスクを追加
            </button>
          </div>
        </div>
      )}

      {stepDone2 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">④ PM・チーム組成</p>
            {pmId && teamMemberIds.length > 0 && <span className="text-xs font-semibold text-blue-600">設定済み</span>}
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">担当PM（1名）</label>
              <select
                value={pmId}
                onChange={(e) => setPmId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none">
                {MEMBERS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">引き渡し後も担当PMは変更できます（制作カードに反映）</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">チーム候補（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {MEMBERS.filter((m) => m.id !== pmId).map((m) => {
                  const selected = teamMemberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setTeamMemberIds((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.98] ${
                        selected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}>
                      {selected ? '✓ ' : ''}{m.name}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-2">選んだメンバーは制作カードのチームに含まれ、/productionで見えるようになります</p>
            </div>
          </div>
        </div>
      )}

      {stepDone2 && (
        <div className={`rounded-2xl border p-4 ${allAssigned && pmId ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">⑤ 制作に引き渡す</p>
            {proc.committedToProduction && proc.committedAt && (
              <p className="text-xs text-gray-500">{new Date(proc.committedAt).toLocaleDateString('ja-JP')} 引き渡し済</p>
            )}
          </div>
          {!allAssigned && (
            <p className="text-xs text-gray-500 mb-3">全タスクのアサインが完了すると引き渡しできます（未アサイン: {(proc.tasks ?? []).filter((t) => t.assigneeType === 'unassigned').length}件）</p>
          )}
          {allAssigned && !pmId && (
            <p className="text-xs text-gray-500 mb-3">担当PMを選択してください</p>
          )}
          {proc.committedToProduction ? (
            <div className="space-y-2">
              <button
                onClick={() => router.push('/production')}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 active:scale-[0.98]">
                📥 制作ダッシュボードでカードを見る →
              </button>
              <button
                onClick={handleCommit}
                className="w-full py-2 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all active:scale-[0.98]">
                引き渡し情報を更新
              </button>
            </div>
          ) : (
            <button
              disabled={!allAssigned || !pmId}
              onClick={handleCommit}
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                allAssigned && pmId
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-500 cursor-not-allowed'
              }`}>
              🚀 制作に引き渡す
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function dealToCard(deal: Deal): KanbanCard {
  return {
    id: deal.id,
    title: deal.dealName,
    subtitle: deal.clientName,
    amount: deal.revenueType === 'running' ? (deal.monthlyAmount ?? 0) * 12 : deal.amount,
    progress: deal.progress,
    assignee: deal.assignee,
    risk: undefined,
    claim: deal.stage === 'claim',
    badge: deal.revenueType === 'running' ? '継続' : undefined,
  };
}

function NewDealModal({ onClose, onAdd, existingDeals }: { onClose: () => void; onAdd: (deal: Deal) => void; existingDeals: Deal[] }) {
  const [clientName, setClientName] = useState('');
  const [dealName, setDealName] = useState('');
  const [industry, setIndustry] = useState('製造業');
  const [amount, setAmount] = useState('');
  const [probability, setProbability] = useState('50');
  const [revenueType, setRevenueType] = useState<'shot' | 'running'>('shot');
  const [assignee, setAssignee] = useState('柏樹 久美子');
  const [memo, setMemo] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const existingCustomers: { name: string; industry: string }[] = Array.from(
    new Map(existingDeals.map((d) => [d.clientName, { name: d.clientName, industry: d.industry }])).values()
  );

  const suggestions = clientName.trim()
    ? existingCustomers.filter((c) => c.name.toLowerCase().includes(clientName.toLowerCase()))
    : [];

  const isNewCustomer = clientName.trim().length > 0 && !existingCustomers.some((c) => c.name === clientName.trim());

  const handleSelectSuggestion = (customer: { name: string; industry: string }) => {
    setClientName(customer.name);
    setIndustry(customer.industry);
    setShowSuggestions(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <strong className="font-semibold text-gray-900">{text.slice(idx, idx + query.length)}</strong>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !dealName.trim()) return;
    const id = `d${Date.now()}`;
    const deal: Deal = {
      id,
      clientName: clientName.trim(),
      dealName: dealName.trim(),
      industry,
      stage: 'lead',
      amount: Number(amount) || 0,
      probability: Number(probability) || 50,
      assignee,
      lastDate: new Date().toISOString().slice(0, 10),
      memo,
      revenueType,
    };
    onAdd(deal);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-lg border border-gray-200 max-w-sm w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <span className="text-sm font-semibold text-gray-900">新規案件を追加</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 text-lg leading-none">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-700 mb-1">クライアント名 <span className="text-red-500">*</span></label>
            <input
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              required
              placeholder="例: 株式会社トヨタ精工"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                {suggestions.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      onMouseDown={() => handleSelectSuggestion(c)}
                      className="w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                    >
                      {highlightMatch(c.name, clientName)}
                      <span className="ml-2 text-xs text-gray-500">{c.industry}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isNewCustomer && (
              <p className="mt-1 text-xs text-blue-600">新しい顧客として追加されます</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">案件名 <span className="text-red-500">*</span></label>
            <input value={dealName} onChange={(e) => setDealName(e.target.value)} required
              placeholder="例: 生産管理システム開発"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">業種 <span className="text-gray-500 font-normal">（任意）</span></label>
            <select value={industry} onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              {['製造業', '医療', '金融', '官公庁・教育', '物流', 'IT', '農業', 'その他'].map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">案件種別</label>
            <div className="flex gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="shot" checked={revenueType === 'shot'} onChange={() => setRevenueType('shot')} className="accent-blue-600" />
                <span className="text-sm text-gray-700">スポット案件</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value="running" checked={revenueType === 'running'} onChange={() => setRevenueType('running')} className="accent-blue-600" />
                <span className="text-sm text-gray-700">月額継続</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">概算金額（円） <span className="text-gray-500 font-normal">（任意）</span></label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 5000000"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">受注見込み（%） <span className="text-gray-500 font-normal">（任意）</span></label>
            <select value={probability} onChange={(e) => setProbability(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              {['10', '20', '30', '40', '50', '60', '70', '80', '90', '100'].map((v) => (
                <option key={v} value={v}>{v}%</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">担当者</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none bg-white">
              {['柏樹 久美子', '犬飼 智之', '和泉 阿委璃', '小野 崇'].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">メモ <span className="text-gray-500 font-normal">（任意）</span></label>
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2}
              placeholder="初回ヒアリング内容など"
              className="w-full px-3 py-2 border border-gray-200 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none" />
          </div>
          <button type="submit"
            className="w-full py-2.5 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition-colors">
            案件を追加
          </button>
        </form>
      </div>
    </div>
  );
}

const ATTACK_DEALS_KEY = 'coaris_attack_to_deals';

function loadAttackDeals(): Deal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTACK_DEALS_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

function DealsInner() {
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get('deal');
  const [deals, setDeals] = useState<Deal[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadAllDeals();
  });
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(() => {
    if (!initialDealId || typeof window === 'undefined') return null;
    return loadAllDeals().find((d) => d.id === initialDealId) ?? null;
  });
  const urlFilter = (searchParams?.get('filter') as Filter) ?? 'active';
  const urlView = (searchParams?.get('view') as 'list' | 'pipeline') ?? 'list';
  const [filter, setFilterState] = useState<Filter>(urlFilter);
  const [view, setViewState] = useState<'list' | 'pipeline'>(urlView);
  const syncUrl = useCallback((nextFilter: Filter, nextView: 'list' | 'pipeline') => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('filter', nextFilter);
    params.set('view', nextView);
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  useEffect(() => { saveAllDeals(deals); }, [deals]);
  const setFilter = (f: Filter) => { setFilterState(f); syncUrl(f, view); };
  const setView = (v: 'list' | 'pipeline') => { setViewState(v); syncUrl(filter, v); };
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (id: string) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());
  const bulkUpdateStage = (stage: Stage) => {
    setDeals((prev) => prev.map((d) => selectedIds.has(d.id) ? { ...d, stage } : d));
    clearSelection();
  };
  const [newDealOpen, setNewDealOpen] = useState(false);

  const handleStageChange = (id: string, stage: Stage) => {
    setDeals((prev) => prev.map((d) => d.id === id ? { ...d, stage } : d));
    setSelectedDeal((prev) => prev?.id === id ? { ...prev, stage } : prev);
  };

  const filtered = deals.filter((d) => {
    if (filter === 'active') return ['lead', 'meeting', 'proposal'].includes(d.stage);
    if (filter === 'claim') return ['claim', 'claim_resolved'].includes(d.stage);
    if (filter === 'estimate') return ['estimate_sent', 'negotiation'].includes(d.stage);
    if (filter === 'ordered') return d.stage === 'ordered';
    if (filter === 'production') return ['in_production', 'delivered', 'acceptance'].includes(d.stage);
    if (filter === 'handed_off') return d.process?.committedToProduction === true;
    if (filter === 'billing') return ['invoiced', 'accounting', 'paid'].includes(d.stage);
    if (filter === 'running') return d.revenueType === 'running';
    return true;
  });

  const activePipeline = deals.filter((d) => ['lead', 'meeting', 'proposal', 'estimate_sent', 'negotiation'].includes(d.stage));
  const inProduction = deals.filter((d) => ['in_production', 'delivered', 'acceptance'].includes(d.stage));
  const ordered = deals.filter((d) => d.stage === 'ordered');

  const dealsWithClaims = new Set(
    Object.entries(MOCK_CLAIMS)
      .filter(([, claims]) => claims.some((c) => c.status !== 'resolved'))
      .map(([id]) => id)
  );

  if (selectedDeal) {
    return (
      <DealDetail
        deal={selectedDeal}
        onBack={() => setSelectedDeal(null)}
        onStageChange={handleStageChange}
      />
    );
  }

  return (
    <div className={`${view === 'pipeline' ? 'max-w-7xl' : 'max-w-3xl'} mx-auto px-4 py-5`}>

      <SectionHeader icon={<ChartBarIcon />} label="パイプラインサマリー" />
      <div className="grid grid-cols-4 divide-x divide-gray-200 border border-gray-200 rounded-lg mb-5 bg-white">
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-gray-900 tabular-nums">{activePipeline.length}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">営業中</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{ordered.length}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">受注</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-2xl font-semibold text-blue-600 tabular-nums">{inProduction.length}</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">制作中</p>
        </div>
        <div className="px-3 py-3 text-center">
          <p className="text-base font-semibold text-gray-900 tabular-nums">¥{(activePipeline.reduce((s, d) => s + d.amount, 0) / 10000).toFixed(0)}万</p>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mt-0.5">見込</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <SectionHeader icon={<ListBulletIcon />} label="案件一覧" />
        <div className="flex border-b border-gray-200 text-xs">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-1.5 font-medium transition-colors ${view === 'list' ? 'text-gray-900 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            リスト
          </button>
          <button
            onClick={() => setView('pipeline')}
            className={`px-3 py-1.5 font-medium transition-colors ${view === 'pipeline' ? 'text-gray-900 border-b-2 border-blue-600 -mb-px' : 'text-gray-500 hover:text-gray-700'}`}>
            パイプライン
          </button>
        </div>
      </div>

      {view === 'list' && (
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
          {([
            ['active', '商談中'],
            ['estimate', '見積中'],
            ['ordered', '受注'],
            ['production', '制作中'],
            ['handed_off', '制作引き渡し済'],
            ['billing', '請求・入金'],
            ['running', '継続'],
            ['claim', 'クレーム'],
            ['all', '全て'],
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${filter === k ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>
      )}

      {view === 'list' && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-1">案件がありません</p>
              <p className="text-xs text-gray-500">下のボタンから新規案件を追加してください</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 bg-white rounded-lg border border-gray-200 overflow-hidden">
              {selectedIds.size > 0 && (
                <div className="sticky top-0 z-20 bg-blue-600 text-white px-4 py-2.5 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{selectedIds.size}件選択中</span>
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => { if (e.target.value) { bulkUpdateStage(e.target.value as Stage); e.currentTarget.value = ''; } }}
                      className="text-sm font-semibold text-gray-900 rounded px-2 py-1 bg-white">
                      <option value="">ステージを一括変更...</option>
                      {(['lead','meeting','proposal','estimate_sent','negotiation','ordered','in_production','delivered','acceptance','invoiced','paid','lost'] as Stage[]).map((s) => (
                        <option key={s} value={s}>{STAGE_LABEL[s]}</option>
                      ))}
                    </select>
                    <button onClick={clearSelection} className="text-xs font-semibold text-white/90 hover:text-white">解除</button>
                  </div>
                </div>
              )}
              {filtered.map((deal) => (
                <div key={deal.id} className={`flex items-stretch ${
                    deal.stage === 'claim' ? 'border-l-4 border-l-red-500 bg-red-50/30' :
                    deal.stage === 'lost' ? 'border-l-4 border-l-gray-300 bg-gray-50/50 opacity-60' :
                    'border-l-4 border-l-transparent'
                  }`}>
                <label className="flex items-center pl-3 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(deal.id)}
                    onChange={() => toggleSelected(deal.id)}
                    className="w-4 h-4 accent-blue-600 cursor-pointer"
                  />
                </label>
                <button onClick={() => setSelectedDeal(deal)}
                  className={`flex-1 px-4 py-3.5 text-left transition-colors group hover:bg-gray-50`}>
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 mt-0.5 ${STAGE_BADGE[deal.stage]}`}>
                      {STAGE_LABEL[deal.stage]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">{deal.dealName}</p>
                        {dealsWithClaims.has(deal.id) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">クレーム</span>
                        )}
                        {(MOCK_COMMS[deal.id]?.flatMap((c) => c.needs ?? []).length ?? 0) > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                            ニーズ{MOCK_COMMS[deal.id]?.flatMap((c) => c.needs ?? []).length ?? 0}件
                          </span>
                        )}
                        {deal.stage === 'paid' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-500 shrink-0">完了</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{deal.clientName}</p>
                      {(['in_production', 'delivered', 'acceptance'] as Stage[]).includes(deal.stage) && deal.progress !== undefined && (
                        <div className="mt-1.5">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${deal.progress}%` }} />
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <Link
                              href="/production"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                              📥 制作カードを見る →
                            </Link>
                            <span className="text-[11px] text-gray-500 tabular-nums">{deal.progress}%</span>
                          </div>
                        </div>
                      )}
                      {!(['in_production', 'delivered', 'acceptance'] as Stage[]).includes(deal.stage) && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] font-semibold tabular-nums ${deal.probability >= 80 ? 'text-blue-600' : deal.probability >= 60 ? 'text-gray-700' : 'text-gray-500'}`}>{deal.probability}%</span>
                          <span className="text-[11px] text-gray-500 tabular-nums">{deal.lastDate.slice(5)}</span>
                        </div>
                      )}
                      <div className="mt-1">
                        <NextAction action={MOCK_NEXT_ACTIONS[deal.id] ?? null} onChange={() => {}} compact />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {deal.revenueType === 'shot' && deal.amount > 0 && (
                        <p className="text-base font-semibold text-gray-900 tabular-nums">¥{(deal.amount / 10000).toFixed(0)}万</p>
                      )}
                      {deal.revenueType === 'running' && deal.monthlyAmount && (
                        <div>
                          <p className="text-base font-semibold text-blue-600 tabular-nums">¥{(deal.monthlyAmount / 10000).toFixed(0)}万<span className="text-xs font-medium">/月</span></p>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">継続</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === 'pipeline' && (() => {
        const kanbanColumns: KanbanColumn[] = [
          { id: 'meeting',    label: '商談',  cards: deals.filter((d) => ['lead','meeting'].includes(d.stage)).map(dealToCard) },
          { id: 'estimate',   label: '見積',  cards: deals.filter((d) => ['proposal','estimate_sent','negotiation'].includes(d.stage)).map(dealToCard) },
          { id: 'ordered',    label: '受注',  cards: deals.filter((d) => d.stage === 'ordered').map(dealToCard) },
          { id: 'production', label: '制作中', cards: deals.filter((d) => ['in_production','delivered','acceptance'].includes(d.stage)).map(dealToCard) },
          { id: 'billing',    label: '請求',  cards: deals.filter((d) => ['invoiced','accounting'].includes(d.stage)).map(dealToCard) },
          { id: 'paid',       label: '入金',  cards: deals.filter((d) => d.stage === 'paid').map(dealToCard) },
        ];
        return (
          <div className="-mx-4 px-4 overflow-x-auto">
            <KanbanBoard
              columns={kanbanColumns}
              onCardClick={(cardId) => {
                const deal = deals.find((d) => d.id === cardId);
                if (deal) setSelectedDeal(deal);
              }}
            />
          </div>
        );
      })()}

      <button
        onClick={() => setNewDealOpen(true)}
        className="w-full mt-3 py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
        + 新規案件を追加
      </button>
      {newDealOpen && (
        <NewDealModal onClose={() => setNewDealOpen(false)} onAdd={(deal) => { setDeals((prev) => [...prev, deal]); setNewDealOpen(false); }} existingDeals={deals} />
      )}
    </div>
  );
}

export function DealsContent() {
  return <DealsInner />;
}
