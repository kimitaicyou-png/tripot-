import type { Deal, Member, MonthlyTarget, MonthlyActual, MemberActual } from './types';

export const COMPANY = {
  id: 'tripot',
  name: 'トライポット株式会社',
  logo: '/logos/tripot.svg',
};

export const MEMBERS: Member[] = [
  { id: 'ono',       name: '小野 崇',     role: '代表取締役',       initial: '小' },
  { id: 'kashiwagi', name: '柏樹 久美子', role: '営業/ディレクター', initial: '柏' },
  { id: 'inukai',    name: '犬飼 智之',   role: 'エンジニア',        initial: '犬' },
  { id: 'izumi',     name: '和泉 阿委璃', role: 'ディレクター',      initial: '和' },
];

export const MONTHLY_TARGETS: Record<string, MonthlyTarget> = {
  '2026-04': {
    revenue:          12000000,
    cogs:              6480000,
    grossProfit:       5520000,
    sga:               3500000,
    operatingProfit:   2020000,
    ordinaryProfit:    1920000,
  },
};

export const DEALS: Deal[] = [
  { id: 'd1',  clientName: 'トライポット株式会社',      dealName: 'SaaSプラットフォーム開発', revenueType: 'shot',    industry: '製造業',       stage: 'proposal',      amount: 6500000, probability: 55,  assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: 'CTO同席で技術提案。先方の反応良好。' },
  { id: 'd2',  clientName: '株式会社中京メディカル',     dealName: '電子カルテAPI連携',        revenueType: 'shot',    industry: '医療',         stage: 'meeting',       amount: 0,       probability: 70,  assignee: '柏樹 久美子', lastDate: '2026-04-03', memo: '' },
  { id: 'd3',  clientName: '名古屋市教育委員会',         dealName: '学習管理システム',          revenueType: 'shot',    industry: '官公庁・教育', stage: 'estimate_sent', amount: 8900000, probability: 80,  assignee: '柏樹 久美子', lastDate: '2026-04-02', memo: '見積書送付済み。先方担当者が社内稟議中。' },
  { id: 'd4',  clientName: '愛知県信用金庫',             dealName: '内部管理ツール開発',        revenueType: 'shot',    industry: '金融',         stage: 'negotiation',   amount: 2100000, probability: 85,  assignee: '柏樹 久美子', lastDate: '2026-04-01', memo: '価格交渉中' },
  { id: 'd5',  clientName: '株式会社東海ロジスティクス', dealName: '配送管理システム',          revenueType: 'shot',    industry: '物流',         stage: 'ordered',       amount: 3500000, probability: 100, assignee: '柏樹 久美子', lastDate: '2026-03-31', memo: '受注確定。キックオフ来週。' },
  { id: 'd6',  clientName: '株式会社名港工業',           dealName: '生産管理DX',               revenueType: 'shot',    industry: '製造業',       stage: 'lead',          amount: 0,       probability: 50,  assignee: '柏樹 久美子', lastDate: '2026-03-30', memo: '' },
  { id: 'd7',  clientName: '有限会社スマート農業',       dealName: 'IoT農業センサー管理',       revenueType: 'shot',    industry: '農業',         stage: 'meeting',       amount: 0,       probability: 60,  assignee: '柏樹 久美子', lastDate: '2026-03-29', memo: '実証実験の提案へ進む予定。' },
  { id: 'd8',  clientName: '医療法人碧会',               dealName: '病院向け患者管理アプリ',    revenueType: 'shot',    industry: '医療',         stage: 'estimate_sent', amount: 5200000, probability: 45,  assignee: '柏樹 久美子', lastDate: '2026-03-27', memo: '見積書提出済み。回答待ち。' },
  { id: 'd9',  clientName: '愛知トヨタ協力工場',         dealName: 'QC管理システム追加開発',    revenueType: 'shot',    industry: '製造業',       stage: 'ordered',       amount: 4200000, probability: 100, assignee: '犬飼 智之',   lastDate: '2026-03-26', memo: '受注済み。制作パイプラインに移行。' },
  { id: 'd10', clientName: '名古屋市教育委員会',         dealName: '学習管理システム保守',      revenueType: 'running', industry: '官公庁・教育', stage: 'ordered',       amount: 0,       probability: 100, assignee: '犬飼 智之',   lastDate: '2026-04-02', memo: '開発完了後に自動開始', monthlyAmount: 150000, runningStartDate: '2026-07' },
  { id: 'd11', clientName: '愛知トヨタ協力工場',         dealName: 'QC管理システム保守',        revenueType: 'running', industry: '製造業',       stage: 'ordered',       amount: 0,       probability: 100, assignee: '犬飼 智之',   lastDate: '2026-03-26', memo: '月額保守', monthlyAmount: 80000, runningStartDate: '2026-05' },
  { id: 'd12', clientName: '株式会社豊田精工',           dealName: 'ITコンサルティング',        revenueType: 'running', industry: '製造業',       stage: 'ordered',       amount: 0,       probability: 100, assignee: '柏樹 久美子', lastDate: '2026-04-04', memo: '月額コンサル。4月より開始。', monthlyAmount: 300000, runningStartDate: '2026-04' },
  { id: 'd13', clientName: '和泉クリエイティブ',         dealName: 'ブランドサイト制作',        revenueType: 'shot',    industry: 'IT',           stage: 'ordered',       amount: 2270000, probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '受注済み。デザイン着手中。' },
  { id: 'd14', clientName: '三河電機サービス',           dealName: 'Webサイト運用保守',         revenueType: 'running', industry: '製造業',       stage: 'ordered',       amount: 0,       probability: 100, assignee: '和泉 阿委璃', lastDate: '2026-04-01', memo: '月額運用サポート。4月より開始。', monthlyAmount: 230000, runningStartDate: '2026-04' },
  { id: 'd15', clientName: '株式会社セントラル商事',     dealName: 'BIダッシュボード企画提案',  revenueType: 'shot',    industry: '商社',         stage: 'meeting',       amount: 0,       probability: 40,  assignee: '和泉 阿委璃', lastDate: '2026-04-03', memo: '' },
];

export function calculateShotRevenue(deals: Deal[], month: string): number {
  return deals
    .filter((d) => d.revenueType === 'shot')
    .filter((d) => ['ordered', 'invoiced', 'paid'].includes(d.stage))
    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
}

export function calculateRunningRevenue(deals: Deal[], month: string): number {
  return deals
    .filter((d) => d.revenueType === 'running' && d.stage === 'ordered')
    .filter((d) => d.runningStartDate != null && d.runningStartDate <= month)
    .reduce((sum, d) => sum + (d.monthlyAmount ?? 0), 0);
}

export function calculateMonthlyActual(month: string): MonthlyActual {
  const shotRevenue     = calculateShotRevenue(DEALS, month);
  const runningRevenue  = calculateRunningRevenue(DEALS, month);
  const totalRevenue    = shotRevenue + runningRevenue;
  const cogs            = Math.round(totalRevenue * 0.543);
  const grossProfit     = totalRevenue - cogs;
  const grossMarginRate = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
  const sga             = 3200000;
  const operatingProfit = grossProfit - sga;
  const ordinaryProfit  = operatingProfit - 100000;

  return {
    shotRevenue,
    runningRevenue,
    totalRevenue,
    cogs,
    grossProfit,
    grossMarginRate,
    sga,
    operatingProfit,
    ordinaryProfit,
  };
}

export function calculateMemberActuals(month: string): MemberActual[] {
  const memberNames = ['柏樹 久美子', '犬飼 智之', '和泉 阿委璃'];

  return memberNames.map((name) => {
    const memberDeals = DEALS.filter((d) => d.assignee === name);
    const shotRevenue     = calculateShotRevenue(memberDeals, month);
    const runningRevenue  = calculateRunningRevenue(memberDeals, month);
    const totalRevenue    = shotRevenue + runningRevenue;
    const cost            = Math.round(totalRevenue * 0.543);
    const grossProfit     = totalRevenue - cost;
    const grossMarginRate = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;
    const member          = MEMBERS.find((m) => m.name === name);

    return {
      memberId: member?.id ?? name,
      memberName: name,
      shotRevenue,
      runningRevenue,
      totalRevenue,
      cost,
      grossProfit,
      grossMarginRate,
    };
  });
}

export function checkDataConsistency(month: string): void {
  const actual  = calculateMonthlyActual(month);
  const members = calculateMemberActuals(month);
  const target  = MONTHLY_TARGETS[month];

  const memberTotalRevenue    = members.reduce((s, m) => s + m.totalRevenue, 0);
  const memberTotalGrossProfit = members.reduce((s, m) => s + m.grossProfit, 0);

  console.log(`=== データ整合チェック (${month}) ===`);
  console.log(`会社PL 総売上:  ¥${actual.totalRevenue.toLocaleString()}`);
  console.log(`個人別 総売上:  ¥${memberTotalRevenue.toLocaleString()}`);
  console.log(`差異（売上）:   ¥${(memberTotalRevenue - actual.totalRevenue).toLocaleString()}`);
  console.log(`会社PL 粗利:    ¥${actual.grossProfit.toLocaleString()}`);
  console.log(`個人別 粗利計:  ¥${memberTotalGrossProfit.toLocaleString()}`);
  console.log(`差異（粗利）:   ¥${(memberTotalGrossProfit - actual.grossProfit).toLocaleString()}`);
  if (target) {
    console.log(`目標 売上:      ¥${target.revenue.toLocaleString()}`);
    console.log(`目標 粗利:      ¥${target.grossProfit.toLocaleString()}`);
  }
}
