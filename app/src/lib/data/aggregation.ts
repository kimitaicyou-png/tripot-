export type MemberKpi = {
  id: string;
  name: string;
  initial: string;
  color: string;
  role: string;
  revenue: number;
  revenueTarget: number;
  gross: number;
  grossTarget: number;
  meetings: number;
  newDeals: number;
  tasks: number;
  urgent: number;
  quote: string;
  joinedAt: string;
};

export type WeeklyKpi = {
  weekLabel: string;
  members: string[];
  revenue: number;
  revenueTarget: number;
  gross: number;
  grossTarget: number;
  meetings: number;
  bottleneck?: string;
};

export type MonthlyKpi = {
  monthLabel: string;
  companyId: string;
  companyName: string;
  revenue: number;
  revenueTarget: number;
  gross: number;
  grossTarget: number;
  op: number;
  opTarget: number;
  cashOnHand: number;
  cashWarning?: string;
  alertLevel: 'normal' | 'caution' | 'danger';
  alerts: string[];
};

export type CompanyKpi = {
  id: string;
  name: string;
  industry: string;
  revenue: number;
  revenueTarget: number;
  gross: number;
  grossTarget: number;
  op: number;
  opTarget: number;
  members: number;
  alertLevel: 'normal' | 'caution' | 'danger';
};

export const MEMBER_KPIS: MemberKpi[] = [];

export function getMemberKpi(id: string): MemberKpi | undefined {
  return MEMBER_KPIS.find((m) => m.id === id);
}

export function aggregateWeekly(memberIds: string[]): WeeklyKpi {
  const members = MEMBER_KPIS.filter((m) => memberIds.includes(m.id));
  return {
    weekLabel: '今週',
    members: members.map((m) => m.name),
    revenue: members.reduce((s, m) => s + m.revenue / 4, 0),
    revenueTarget: members.reduce((s, m) => s + m.revenueTarget / 4, 0),
    gross: members.reduce((s, m) => s + m.gross / 4, 0),
    grossTarget: members.reduce((s, m) => s + m.grossTarget / 4, 0),
    meetings: members.reduce((s, m) => s + m.meetings, 0),
  };
}

export function aggregateMonthly(companyId: string, companyName: string, monthLabel: string): MonthlyKpi {
  const all = MEMBER_KPIS;
  const revenue = all.reduce((s, m) => s + m.revenue, 0);
  const revenueTarget = all.reduce((s, m) => s + m.revenueTarget, 0);
  const gross = all.reduce((s, m) => s + m.gross, 0);
  const grossTarget = all.reduce((s, m) => s + m.grossTarget, 0);
  const op = Math.round(gross * 0.33);
  const opTarget = Math.round(grossTarget * 0.42);
  const opRate = (op / opTarget) * 100;
  const alertLevel = opRate < 70 ? 'danger' : opRate < 85 ? 'caution' : 'normal';
  const alerts: string[] = [];
  if (opRate < 70) alerts.push('営業利益達成率が70%未満');
  if (revenue < revenueTarget * 0.85) alerts.push('売上が予算の85%未満');
  return {
    monthLabel,
    companyId,
    companyName,
    revenue,
    revenueTarget,
    gross,
    grossTarget,
    op,
    opTarget,
    cashOnHand: 1840,
    cashWarning: 'W2に170万のショート見込み',
    alertLevel,
    alerts,
  };
}

const COMPANY_OVERRIDES: Partial<Record<string, Partial<CompanyKpi>>> = {
  tripot:     { name: 'トライポット',     industry: 'IT・システム開発', members: 5 },
  deraforce:  { name: 'デラフォース',     industry: '製造支援',         revenue: 1850, revenueTarget: 2000, gross: 800, grossTarget: 900, op: 280, opTarget: 350, members: 12, alertLevel: 'normal'  },
  kuhaku:     { name: 'クウハク',         industry: 'マーケティング',   revenue: 1680, revenueTarget: 1500, gross: 720, grossTarget: 650, op: 320, opTarget: 280, members: 8,  alertLevel: 'normal'  },
  qoldesign:  { name: 'QOLdesign',        industry: 'ヘルスケア',       revenue: 1390, revenueTarget: 1500, gross: 600, grossTarget: 680, op: 220, opTarget: 280, members: 9,  alertLevel: 'caution' },
  dotsync:    { name: 'ドットシンク',     industry: 'AI・データ',       revenue: 1240, revenueTarget: 1400, gross: 540, grossTarget: 630, op: 180, opTarget: 250, members: 7,  alertLevel: 'caution' },
  anasys:     { name: 'アナシス',         industry: 'コンサル',         revenue: 980,  revenueTarget: 1100, gross: 480, grossTarget: 540, op: 200, opTarget: 240, members: 6,  alertLevel: 'normal'  },
  gyestate:   { name: 'GYエステート',     industry: '不動産',           revenue: 820,  revenueTarget: 1000, gross: 350, grossTarget: 460, op: 90,  opTarget: 180, members: 5,  alertLevel: 'danger'  },
  srplanning: { name: 'エスアール・プラニング', industry: '広告・PR',  revenue: 760,  revenueTarget: 900,  gross: 340, grossTarget: 410, op: 120, opTarget: 180, members: 5,  alertLevel: 'normal'  },
  eyecare:    { name: 'アイズケアネットワーク', industry: '介護・ケア', revenue: 1450, revenueTarget: 1500, gross: 580, grossTarget: 620, op: 240, opTarget: 270, members: 14, alertLevel: 'normal'  },
  wiseassist: { name: 'ワイズアシスト',   industry: 'BPO',              revenue: 680,  revenueTarget: 750,  gross: 290, grossTarget: 340, op: 110, opTarget: 150, members: 6,  alertLevel: 'normal'  },
  delicious:  { name: 'デリシャスラボ',   industry: '飲食・食品',       revenue: 920,  revenueTarget: 1100, gross: 380, grossTarget: 500, op: 130, opTarget: 220, members: 8,  alertLevel: 'caution' },
  vinaforce:  { name: 'VINA Force',       industry: 'グローバル',       revenue: 1100, revenueTarget: 1200, gross: 470, grossTarget: 540, op: 190, opTarget: 240, members: 10, alertLevel: 'normal'  },
  yuyukai:    { name: '優雄会',           industry: '医療',             revenue: 1320, revenueTarget: 1400, gross: 540, grossTarget: 620, op: 230, opTarget: 280, members: 11, alertLevel: 'normal'  },
};

export function getCompanyKpis(): CompanyKpi[] {
  const tripotMonthly = aggregateMonthly('tripot', 'トライポット', '2026年4月');
  const tripot: CompanyKpi = {
    id: 'tripot',
    name: 'トライポット',
    industry: COMPANY_OVERRIDES.tripot?.industry ?? 'IT',
    revenue: tripotMonthly.revenue,
    revenueTarget: tripotMonthly.revenueTarget,
    gross: tripotMonthly.gross,
    grossTarget: tripotMonthly.grossTarget,
    op: tripotMonthly.op,
    opTarget: tripotMonthly.opTarget,
    members: COMPANY_OVERRIDES.tripot?.members ?? 5,
    alertLevel: tripotMonthly.alertLevel,
  };

  const others: CompanyKpi[] = (Object.keys(COMPANY_OVERRIDES) as string[])
    .filter((k) => k !== 'tripot')
    .map((id) => {
      const o = COMPANY_OVERRIDES[id]!;
      return {
        id,
        name: o.name ?? id,
        industry: o.industry ?? '',
        revenue: o.revenue ?? 0,
        revenueTarget: o.revenueTarget ?? 0,
        gross: o.gross ?? 0,
        grossTarget: o.grossTarget ?? 0,
        op: o.op ?? 0,
        opTarget: o.opTarget ?? 0,
        members: o.members ?? 0,
        alertLevel: o.alertLevel ?? 'normal',
      };
    });

  return [tripot, ...others];
}

export function getHqSummary() {
  const companies = getCompanyKpis();
  const totalRevenue = companies.reduce((s, c) => s + c.revenue, 0);
  const totalRevenueTarget = companies.reduce((s, c) => s + c.revenueTarget, 0);
  const totalGross = companies.reduce((s, c) => s + c.gross, 0);
  const totalGrossTarget = companies.reduce((s, c) => s + c.grossTarget, 0);
  const totalOp = companies.reduce((s, c) => s + c.op, 0);
  const totalOpTarget = companies.reduce((s, c) => s + c.opTarget, 0);
  const totalMembers = companies.reduce((s, c) => s + c.members, 0);
  const dangerCompanies = companies.filter((c) => c.alertLevel === 'danger').length;
  const cautionCompanies = companies.filter((c) => c.alertLevel === 'caution').length;
  return {
    companies,
    totalRevenue,
    totalRevenueTarget,
    totalGross,
    totalGrossTarget,
    totalOp,
    totalOpTarget,
    totalMembers,
    dangerCompanies,
    cautionCompanies,
  };
}

export function getDaysSinceJoined(joinedAt: string): number {
  const joined = new Date(joinedAt);
  const today = new Date();
  return Math.floor((today.getTime() - joined.getTime()) / 86400000);
}
