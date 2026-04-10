'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

type Survey = {
  good: string;
  bad: string;
  improve: string;
  next: string;
};

type Slide =
  | { type: 'cover'; title: string; subtitle: string; date: string }
  | { type: 'agenda'; items: string[] }
  | { type: 'pl'; revenue: number; revenueBudget: number; gross: number; grossBudget: number; op: number; opBudget: number }
  | { type: 'cf'; cashStart: number; cashEnd: number; ar: number; ap: number; warning?: string }
  | { type: 'trend'; data: { month: string; revenue: number; gross: number }[] }
  | { type: 'segment'; segments: { label: string; value: number; share: number }[] }
  | { type: 'analysis'; title: string; rate: number; positives: string[]; negatives: string[] }
  | { type: 'review'; title: string; userBullets: string[]; aiBullets: string[]; accent: string }
  | { type: 'action'; items: { title: string; due: string; owner: string }[] }
  | { type: 'forecast'; current: number; forecast: number; gapToYear: number; pct: number }
  | { type: 'philosophy'; quote: string; body: string }
  | { type: 'closing'; title: string };

const TAICHO_QUOTES = [
  '数字を追うな、行動を追え。行動すれば数字は出る。',
  '未達は許される。決めないことは許されない。',
  'AIで出来ることはAIでやる。人間は判断と修正だけ。',
  '報告を書かせない。行動入力するだけで上に吸い上がる。',
  '1画面で全部見える。3秒で判断できる。',
  '売上ではなく粗利を見ろ。粗利が出てなければ意味がない。',
];

function buildSlides(survey: Survey, monthLabel: string): Slide[] {
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  return [
    {
      type: 'cover',
      title: `${monthLabel} 月次報告会`,
      subtitle: 'トライポット株式会社',
      date: today,
    },
    {
      type: 'agenda',
      items: [
        '01 ・ 月次決算サマリー',
        '02 ・ 損益計算書（P/L）',
        '03 ・ 資金繰り（C/F）',
        '04 ・ 6ヶ月推移トレンド',
        '05 ・ セグメント別業績',
        '06 ・ 予実分析と未達要因',
        '07 ・ 良かった点・悪かった点',
        '08 ・ 改善点・来月アクション',
        '09 ・ 年間着地見通し',
        '10 ・ 経営方針',
      ],
    },
    {
      type: 'pl',
      revenue: 1050,
      revenueBudget: 1200,
      gross: 480,
      grossBudget: 600,
      op: 160,
      opBudget: 250,
    },
    {
      type: 'cf',
      cashStart: 2010,
      cashEnd: 1840,
      ar: 870,
      ap: 520,
      warning: 'W2に170万のショート見込み — 入金前倒し検討',
    },
    {
      type: 'trend',
      data: [
        { month: '11月', revenue: 920, gross: 415 },
        { month: '12月', revenue: 1080, gross: 490 },
        { month: '1月', revenue: 850, gross: 385 },
        { month: '2月', revenue: 980, gross: 445 },
        { month: '3月', revenue: 1100, gross: 505 },
        { month: '4月', revenue: 1050, gross: 480 },
      ],
    },
    {
      type: 'segment',
      segments: [
        { label: 'システム開発', value: 580, share: 55 },
        { label: 'コンサル',     value: 250, share: 24 },
        { label: '保守・運用',   value: 150, share: 14 },
        { label: 'その他',       value: 70,  share: 7  },
      ],
    },
    {
      type: 'analysis',
      title: '予実分析 ・ 未達要因',
      rate: 88,
      positives: [
        '既存顧客からの継続案件は予算超過（+8%）',
        '新規アポ獲得は前月比+12%と伸長',
        '粗利率は維持できている（45.7%）',
      ],
      negatives: [
        '提案フェーズ滞留案件が前月比+3件（提案→受注の転換率17%）',
        '販管費が予算比+8%（通信費・交際費の増加）',
        '入金遅延が3件発生（与信管理の見直しが必要）',
      ],
    },
    {
      type: 'review',
      title: '今月の良かった点',
      userBullets: survey.good ? survey.good.split('\n').filter(Boolean) : ['（記入なし）'],
      aiBullets: [
        '営業活動量が前月比+12% — 行動ベースのKPIが効いている',
        '粗利率45.7%を維持 — 単価交渉のスタンスは正しい',
        'クレーム0件 — 顧客対応の質が安定',
      ],
      accent: '#10B981',
    },
    {
      type: 'review',
      title: '今月の悪かった点',
      userBullets: survey.bad ? survey.bad.split('\n').filter(Boolean) : ['（記入なし）'],
      aiBullets: [
        '受注率が17%まで低下 — 提案で止まる案件が多い',
        '販管費が予算比+8% — コスト管理の緩み',
        '入金が遅延気味 — 与信管理と請求タイミングの再点検',
      ],
      accent: '#DC2626',
    },
    {
      type: 'review',
      title: '改善点',
      userBullets: survey.improve ? survey.improve.split('\n').filter(Boolean) : ['（記入なし）'],
      aiBullets: [
        '提案フェーズ案件レビュー会を週次で導入し、止まり案件を3件以内に',
        '販管費の上限ライン（月280万）を可視化、超過時はSlack自動アラート',
        '請求書送付ルールを「納品翌営業日まで」に統一',
      ],
      accent: '#F59E0B',
    },
    {
      type: 'action',
      items: [
        { title: '受注率を25%まで回復', due: '5月末', owner: '柏樹' },
        { title: '既存上位3社への四半期レビュー訪問', due: '5月中旬', owner: '犬飼' },
        { title: '新規アポ獲得 月18件以上', due: '5月末', owner: '小野' },
        { title: '販管費の月次上限を280万に設定', due: '5月初', owner: '石川' },
      ],
    },
    {
      type: 'forecast',
      current: 5520,
      forecast: 11800,
      gapToYear: 200,
      pct: 92,
    },
    {
      type: 'philosophy',
      quote: TAICHO_QUOTES[Math.floor(Math.random() * TAICHO_QUOTES.length)],
      body: '数字が悪い時こそ、行動の質を見るタイミング。\n結果は遅れて出るが、行動の積み重ねは裏切らない。\n今月の振り返りを、来月の「次の一手」に変える。',
    },
    {
      type: 'closing',
      title: '来月もよろしくお願いします',
    },
  ];
}

function FadeIn({ delay = 0, children, className = '' }: { delay?: number; children: React.ReactNode; className?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`}>
      {children}
    </div>
  );
}

function CountUp({ end, duration = 1500, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    setVal(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(end * ease));
      if (t < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [end, duration]);
  return <span>{prefix}{val.toLocaleString()}{suffix}</span>;
}

function AnimatedBar({ width, color, delay = 0, height = 8 }: { width: number; color: string; delay?: number; height?: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(width), delay + 100);
    return () => clearTimeout(t);
  }, [width, delay]);
  return (
    <div className="bg-white/10 rounded-full overflow-hidden" style={{ height }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

function SlideRenderer({ slide, slideKey }: { slide: Slide; slideKey: string }) {
  if (slide.type === 'cover') {
    return (
      <div key={slideKey} className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl bg-blue-600 animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl bg-purple-600" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <FadeIn delay={200}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <p className="text-xs font-semibold text-blue-300/80 uppercase tracking-[0.3em]">Monthly Review Meeting</p>
          </div>
        </FadeIn>
        <div className="relative">
          <FadeIn delay={500}>
            <h1 className="text-6xl md:text-8xl font-semibold text-white tracking-tight leading-[1.05]">{slide.title}</h1>
          </FadeIn>
          <FadeIn delay={800}>
            <p className="text-2xl text-white/50 mt-6">{slide.subtitle}</p>
          </FadeIn>
        </div>
        <FadeIn delay={1100}>
          <div className="flex items-end justify-between">
            <p className="text-sm text-white/40 tracking-wider">{slide.date}</p>
            <p className="text-xs text-white/30 uppercase tracking-[0.2em]">Coaris AI</p>
          </div>
        </FadeIn>
      </div>
    );
  }

  if (slide.type === 'agenda') {
    return (
      <div key={slideKey} className="w-full h-full bg-white flex p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] opacity-[0.03] bg-blue-600 rounded-full blur-3xl" />
        <div className="w-1/3 flex flex-col justify-center">
          <FadeIn delay={200}>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-3">Agenda</p>
          </FadeIn>
          <FadeIn delay={400}>
            <h2 className="text-5xl font-semibold text-gray-900 leading-tight tracking-tight">本日の<br />アジェンダ</h2>
          </FadeIn>
          <FadeIn delay={600}>
            <div className="w-12 h-[3px] bg-blue-600 mt-6" />
          </FadeIn>
        </div>
        <div className="w-2/3 grid grid-cols-2 gap-x-8 gap-y-4 content-center pl-12">
          {slide.items.map((item, i) => (
            <FadeIn key={i} delay={500 + i * 80}>
              <div className="flex items-baseline gap-3 group">
                <div className="w-1 h-1 rounded-full bg-blue-600 mt-2 group-hover:scale-150 transition-transform" />
                <p className="text-base text-gray-800 font-medium">{item}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'pl') {
    const rRate = Math.round((slide.revenue / slide.revenueBudget) * 100);
    const gRate = Math.round((slide.gross / slide.grossBudget) * 100);
    const oRate = Math.round((slide.op / slide.opBudget) * 100);
    return (
      <div key={slideKey} className="w-full h-full bg-gradient-to-br from-gray-950 to-gray-900 text-white p-16 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl bg-blue-600" />
        <FadeIn delay={200}>
          <div className="flex items-center gap-3 mb-2">
            <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-[0.2em]">02 ・ Profit & Loss</p>
          </div>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold tracking-tight mb-12">損益計算書</h2>
        </FadeIn>
        <div className="flex-1 grid grid-cols-3 gap-8 relative">
          {[
            { label: '売上高',     actual: slide.revenue,    budget: slide.revenueBudget, rate: rRate, color: '#60A5FA' },
            { label: '売上総利益', actual: slide.gross,      budget: slide.grossBudget,   rate: gRate, color: '#A78BFA' },
            { label: '営業利益',   actual: slide.op,         budget: slide.opBudget,      rate: oRate, color: oRate < 80 ? '#F87171' : '#34D399' },
          ].map((item, i) => (
            <FadeIn key={item.label} delay={600 + i * 250} className="flex flex-col">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">{item.label}</p>
              <p className="text-6xl font-semibold tabular-nums leading-none">¥<CountUp end={item.actual} /><span className="text-2xl text-white/40 ml-1">万</span></p>
              <p className="text-sm text-white/50 mt-3 tabular-nums">予算 ¥{item.budget}万</p>
              <div className="mt-4">
                <AnimatedBar width={Math.min(item.rate, 100)} color={item.color} delay={800 + i * 250} height={6} />
              </div>
              <p className={`text-sm font-semibold mt-2 tabular-nums`} style={{ color: item.color }}>
                達成率 {item.rate}%
              </p>
            </FadeIn>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'cf') {
    const diff = slide.cashEnd - slide.cashStart;
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">03 ・ Cash Flow</p>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold text-gray-900 tracking-tight mb-10">資金繰り</h2>
        </FadeIn>
        <div className="flex-1 grid grid-cols-12 gap-6">
          <FadeIn delay={600} className="col-span-7">
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-3xl p-8 h-full flex flex-col">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-4">月末キャッシュ残高</p>
              <p className="text-7xl font-semibold text-gray-900 tabular-nums leading-none">
                ¥<CountUp end={slide.cashEnd} />
                <span className="text-3xl text-gray-500 ml-1">万</span>
              </p>
              <div className="mt-8 flex items-baseline gap-3">
                <span className={`text-2xl font-semibold tabular-nums ${diff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {diff >= 0 ? '+' : ''}{diff}万
                </span>
                <span className="text-sm text-gray-500">前月比</span>
              </div>
              {slide.warning && (
                <div className="mt-auto pt-8">
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-1">⚠ 警告</p>
                    <p className="text-sm font-semibold text-red-900">{slide.warning}</p>
                  </div>
                </div>
              )}
            </div>
          </FadeIn>
          <FadeIn delay={800} className="col-span-5 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-widest mb-2">売掛金</p>
              <p className="text-3xl font-semibold text-blue-900 tabular-nums">¥<CountUp end={slide.ar} /><span className="text-sm text-blue-600 ml-1">万</span></p>
              <p className="text-xs text-blue-600/70 mt-1">回収予定</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">買掛金</p>
              <p className="text-3xl font-semibold text-amber-900 tabular-nums">¥<CountUp end={slide.ap} /><span className="text-sm text-amber-600 ml-1">万</span></p>
              <p className="text-xs text-amber-600/70 mt-1">支払予定</p>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (slide.type === 'trend') {
    const max = Math.max(...slide.data.map((d) => d.revenue));
    const w = 800;
    const h = 280;
    const padL = 60;
    const padR = 30;
    const padT = 30;
    const padB = 40;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const stepX = innerW / (slide.data.length - 1);
    const xy = slide.data.map((d, i) => ({
      x: padL + i * stepX,
      yRev: padT + innerH - (d.revenue / max) * innerH,
      yGross: padT + innerH - (d.gross / max) * innerH,
      ...d,
    }));
    const revPath = `M ${xy.map((p) => `${p.x},${p.yRev}`).join(' L ')}`;
    const grossPath = `M ${xy.map((p) => `${p.x},${p.yGross}`).join(' L ')}`;
    const revArea = `${revPath} L ${xy[xy.length - 1].x},${padT + innerH} L ${padL},${padT + innerH} Z`;
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">04 ・ 6-Month Trend</p>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold text-gray-900 tracking-tight mb-2">6ヶ月推移</h2>
        </FadeIn>
        <FadeIn delay={500}>
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-sm text-gray-700 font-medium">売上</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-700 font-medium">粗利</span>
            </div>
          </div>
        </FadeIn>
        <FadeIn delay={700} className="flex-1">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
            <defs>
              <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <line key={r} x1={padL} x2={w - padR} y1={padT + innerH * r} y2={padT + innerH * r} stroke="#f3f4f6" strokeWidth="1" />
            ))}
            <path d={revArea} fill="url(#rev-grad)" className="animate-[fadeIn_1.2s_ease-out]" />
            <path d={revPath} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d={grossPath} fill="none" stroke="#A78BFA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 4" />
            {xy.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.yRev} r="6" fill="#2563eb" stroke="#fff" strokeWidth="3" />
                <circle cx={p.x} cy={p.yGross} r="4" fill="#A78BFA" stroke="#fff" strokeWidth="2" />
                <text x={p.x} y={p.yRev - 14} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 12, fontWeight: 600 }}>
                  {p.revenue}
                </text>
                <text x={p.x} y={h - 8} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 12 }}>
                  {p.month}
                </text>
              </g>
            ))}
          </svg>
        </FadeIn>
      </div>
    );
  }

  if (slide.type === 'segment') {
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">05 ・ Segment Performance</p>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold text-gray-900 tracking-tight mb-12">セグメント別業績</h2>
        </FadeIn>
        <div className="flex-1 grid grid-cols-2 gap-8 content-center">
          <FadeIn delay={600}>
            <svg viewBox="0 0 200 200" className="w-full max-w-[280px] mx-auto">
              {(() => {
                let cumulative = 0;
                const colors = ['#2563eb', '#A78BFA', '#34D399', '#FBBF24'];
                return slide.segments.map((seg, i) => {
                  const startAngle = (cumulative / 100) * 360 - 90;
                  cumulative += seg.share;
                  const endAngle = (cumulative / 100) * 360 - 90;
                  const startRad = (startAngle * Math.PI) / 180;
                  const endRad = (endAngle * Math.PI) / 180;
                  const largeArc = seg.share > 50 ? 1 : 0;
                  const x1 = 100 + 80 * Math.cos(startRad);
                  const y1 = 100 + 80 * Math.sin(startRad);
                  const x2 = 100 + 80 * Math.cos(endRad);
                  const y2 = 100 + 80 * Math.sin(endRad);
                  return (
                    <path
                      key={seg.label}
                      d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={colors[i]}
                      className="origin-center"
                      style={{ animation: `fadeIn 0.6s ease-out ${0.7 + i * 0.15}s both` }}
                    />
                  );
                });
              })()}
              <circle cx="100" cy="100" r="48" fill="white" />
              <text x="100" y="95" textAnchor="middle" className="fill-gray-900" style={{ fontSize: 24, fontWeight: 600 }}>
                ¥1,050
              </text>
              <text x="100" y="115" textAnchor="middle" className="fill-gray-500" style={{ fontSize: 11 }}>万円</text>
            </svg>
          </FadeIn>
          <div className="space-y-4">
            {slide.segments.map((seg, i) => (
              <FadeIn key={seg.label} delay={800 + i * 150}>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ['#2563eb', '#A78BFA', '#34D399', '#FBBF24'][i] }} />
                  <div className="flex-1">
                    <p className="text-base font-semibold text-gray-900">{seg.label}</p>
                  </div>
                  <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{seg.value}<span className="text-sm text-gray-500 ml-1">万</span></p>
                  <p className="text-sm font-semibold text-gray-500 w-12 text-right tabular-nums">{seg.share}%</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (slide.type === 'analysis') {
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">06 ・ Variance Analysis</p>
        </FadeIn>
        <FadeIn delay={400}>
          <div className="flex items-baseline gap-6">
            <h2 className="text-5xl font-semibold text-gray-900 tracking-tight">{slide.title}</h2>
            <span className="text-3xl font-semibold text-gray-500 tabular-nums">{slide.rate}%</span>
          </div>
        </FadeIn>
        <div className="flex-1 grid grid-cols-2 gap-8 mt-12">
          <FadeIn delay={600}>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-6 h-full">
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-4">+ Positive</p>
              <div className="space-y-3">
                {slide.positives.map((p, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <p className="text-sm text-gray-800 leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={800}>
            <div className="bg-red-50/50 border border-red-100 rounded-2xl p-6 h-full">
              <p className="text-xs font-semibold text-red-700 uppercase tracking-widest mb-4">− Negative</p>
              <div className="space-y-3">
                {slide.negatives.map((n, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <p className="text-sm text-gray-800 leading-relaxed">{n}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (slide.type === 'review') {
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-[0.04] blur-3xl" style={{ backgroundColor: slide.accent }} />
        <FadeIn delay={200}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-[3px]" style={{ backgroundColor: slide.accent }} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: slide.accent }}>07 ・ Review</p>
          </div>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold text-gray-900 tracking-tight mb-12">{slide.title}</h2>
        </FadeIn>
        <div className="flex-1 grid grid-cols-2 gap-12">
          <div>
            <FadeIn delay={500}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-5">あなたの記入</p>
            </FadeIn>
            <div className="space-y-4">
              {slide.userBullets.map((b, i) => (
                <FadeIn key={i} delay={700 + i * 200}>
                  <div className="flex items-start gap-4">
                    <span className="text-base font-semibold tabular-nums shrink-0" style={{ color: slide.accent }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="text-lg text-gray-800 font-medium leading-relaxed">{b}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
          <FadeIn delay={1000}>
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-7 h-full border border-purple-100">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs">✦</span>
                <p className="text-xs font-semibold text-purple-700 uppercase tracking-widest">AI の意見</p>
              </div>
              <div className="space-y-4">
                {slide.aiBullets.map((b, i) => (
                  <FadeIn key={i} delay={1200 + i * 200}>
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2.5 shrink-0" />
                      <p className="text-sm text-gray-700 leading-relaxed">{b}</p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (slide.type === 'action') {
    return (
      <div key={slideKey} className="w-full h-full bg-gradient-to-br from-gray-950 to-blue-950 text-white p-16 flex flex-col relative overflow-hidden">
        <div className="absolute -bottom-20 right-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl bg-blue-600" />
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-300/80 uppercase tracking-[0.2em] mb-2">08 ・ Next Actions</p>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold tracking-tight mb-12">来月のアクションプラン</h2>
        </FadeIn>
        <div className="flex-1 space-y-4 relative">
          {slide.items.map((item, i) => (
            <FadeIn key={i} delay={600 + i * 200}>
              <div className="flex items-center gap-6 p-5 bg-white/5 backdrop-blur border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                <div className="w-12 h-12 rounded-2xl border-2 border-blue-400/30 flex items-center justify-center text-blue-300 font-semibold text-lg shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1">
                  <p className="text-xl text-white font-semibold">{item.title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-300 font-semibold">{item.due}</p>
                  <p className="text-xs text-white/40">{item.owner}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === 'forecast') {
    return (
      <div key={slideKey} className="w-full h-full bg-white p-16 flex flex-col relative overflow-hidden">
        <FadeIn delay={200}>
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mb-2">09 ・ Year-End Forecast</p>
        </FadeIn>
        <FadeIn delay={400}>
          <h2 className="text-5xl font-semibold text-gray-900 tracking-tight mb-12">年間着地見通し</h2>
        </FadeIn>
        <div className="flex-1 flex flex-col justify-center">
          <FadeIn delay={600}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">通期着地見込</p>
          </FadeIn>
          <FadeIn delay={700}>
            <p className="text-8xl font-semibold text-gray-900 tabular-nums leading-none">
              ¥<CountUp end={slide.forecast} duration={2000} /><span className="text-3xl text-gray-500 ml-2">万</span>
            </p>
          </FadeIn>
          <FadeIn delay={1000}>
            <div className="mt-8 max-w-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">年度進捗</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">{slide.pct}%</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-500 rounded-full transition-all duration-1500 ease-out" style={{ width: `${slide.pct}%`, animation: 'fadeIn 1.5s ease-out' }} />
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={1300}>
            <div className="mt-10 grid grid-cols-3 gap-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">現時点</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{slide.current}万</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">残り必要</p>
                <p className="text-2xl font-semibold text-gray-900 tabular-nums">¥{slide.forecast - slide.current}万</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">目標差</p>
                <p className={`text-2xl font-semibold tabular-nums ${slide.gapToYear > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {slide.gapToYear > 0 ? '−' : '+'}¥{Math.abs(slide.gapToYear)}万
                </p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    );
  }

  if (slide.type === 'philosophy') {
    return (
      <div key={slideKey} className="w-full h-full bg-gray-950 flex items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.06] bg-blue-500 blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-12 right-12 w-px h-24 bg-blue-400/30" />
        <div className="absolute bottom-12 left-12 w-px h-24 bg-blue-400/30" />
        <div className="relative max-w-3xl text-center">
          <FadeIn delay={300}>
            <p className="text-xs font-semibold text-blue-300/70 uppercase tracking-[0.3em] mb-10">10 ・ Philosophy</p>
          </FadeIn>
          <FadeIn delay={600}>
            <p className="text-3xl md:text-4xl font-semibold text-white leading-relaxed whitespace-pre-line mb-12">
              {slide.body}
            </p>
          </FadeIn>
          <FadeIn delay={1100}>
            <div className="w-12 h-[2px] bg-blue-400 mx-auto mb-6" />
            <p className="text-xl text-blue-300 italic">「{slide.quote}」</p>
            <p className="text-xs text-white/30 mt-3 tracking-widest">— 隊長</p>
          </FadeIn>
        </div>
      </div>
    );
  }

  return (
    <div key={slideKey} className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 flex flex-col items-center justify-center p-16 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-10 blur-3xl bg-blue-600 animate-pulse" style={{ animationDuration: '5s' }} />
      <FadeIn delay={300}>
        <div className="w-12 h-[2px] mx-auto mb-8 bg-blue-400" />
      </FadeIn>
      <FadeIn delay={500}>
        <h1 className="text-5xl md:text-7xl font-semibold text-white tracking-tight mb-6">{slide.title}</h1>
      </FadeIn>
      <FadeIn delay={800}>
        <p className="text-base text-white/40 tracking-widest">トライポット株式会社 ・ Coaris AI</p>
      </FadeIn>
    </div>
  );
}

function PresentationView({ slides, onClose }: { slides: Slide[]; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [renderKey, setRenderKey] = useState(0);

  const goTo = useCallback((idx: number, dir: 'next' | 'prev') => {
    if (transitioning) return;
    setDirection(dir);
    setTransitioning(true);
    setTimeout(() => {
      setCurrent(idx);
      setRenderKey((k) => k + 1);
      setTransitioning(false);
    }, 350);
  }, [transitioning]);

  const prev = useCallback(() => { if (current > 0) goTo(current - 1, 'prev'); }, [current, goTo]);
  const next = useCallback(() => { if (current < slides.length - 1) goTo(current + 1, 'next'); }, [current, slides.length, goTo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [prev, next, onClose]);

  const progress = slides.length > 1 ? ((current + 1) / slides.length) * 100 : 100;

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5 z-10">
        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between px-6 py-3 z-10">
        <button onClick={onClose} className="text-xs text-white/40 hover:text-white font-semibold tracking-widest uppercase transition-colors">
          ← Close
        </button>
        <span className="text-xs text-white/30 tabular-nums tracking-widest">
          {String(current + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center relative px-12 pb-12">
        <button onClick={prev} disabled={current === 0} className="absolute left-6 z-10 w-14 h-14 bg-white/0 hover:bg-white/5 disabled:opacity-0 rounded-full flex items-center justify-center text-white/40 hover:text-white text-3xl transition-all">‹</button>
        <div
          className={`w-full max-w-7xl rounded-3xl overflow-hidden transition-all duration-350 ease-out ${
            transitioning
              ? direction === 'next'
                ? 'opacity-0 translate-x-12 scale-[0.98]'
                : 'opacity-0 -translate-x-12 scale-[0.98]'
              : 'opacity-100 translate-x-0 scale-100'
          }`}
          style={{ aspectRatio: '16/9', boxShadow: '0 0 100px rgba(59, 130, 246, 0.15), 0 30px 60px rgba(0,0,0,0.6)' }}
        >
          <SlideRenderer slide={slides[current]} slideKey={`s-${renderKey}`} />
        </div>
        <button onClick={next} disabled={current === slides.length - 1} className="absolute right-6 z-10 w-14 h-14 bg-white/0 hover:bg-white/5 disabled:opacity-0 rounded-full flex items-center justify-center text-white/40 hover:text-white text-3xl transition-all">›</button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goTo(i, i > current ? 'next' : 'prev')} className={`rounded-full transition-all ${i === current ? 'w-8 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`} />
        ))}
      </div>
    </div>
  );
}

export default function MonthlyReportGenerator({ onClose, monthLabel }: { onClose: () => void; monthLabel: string }) {
  const [step, setStep] = useState<'survey' | 'generating' | 'present'>('survey');
  const [survey, setSurvey] = useState<Survey>({ good: '', bad: '', improve: '', next: '' });
  const [slides, setSlides] = useState<Slide[]>([]);

  const handleGenerate = async () => {
    setStep('generating');
    try {
      const deals = typeof window !== 'undefined'
        ? (() => { try { const r = localStorage.getItem('tripot_deals_all'); return r ? JSON.parse(r) : []; } catch { return []; } })()
        : [];
      const orderedStages = ['ordered', 'in_production', 'delivered', 'acceptance', 'invoiced', 'accounting', 'paid'];
      const ordered = deals.filter((d: { stage: string }) => orderedStages.includes(d.stage));
      const totalRevenue = ordered.reduce((s: number, d: { amount: number }) => s + d.amount, 0);
      const kpiSummary = `総案件数: ${deals.length}件\n受注済: ${ordered.length}件\n総売上: ¥${Math.round(totalRevenue / 10000)}万\n粗利率: 約46%`;

      const res = await fetch('/api/deals/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-monthly-report',
          monthLabel,
          survey,
          kpiSummary,
        }),
      });
      const data = await res.json();
      if (data.slides && data.slides.length > 0) {
        const aiSlides = data.slides;
        const merged = mergeAiSlides(survey, monthLabel, aiSlides);
        setSlides(merged);
      } else {
        setSlides(buildSlides(survey, monthLabel));
      }
    } catch {
      setSlides(buildSlides(survey, monthLabel));
    }
    setStep('present');
  };

  function mergeAiSlides(s: Survey, ml: string, aiData: Record<string, unknown>[]): Slide[] {
    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const base = buildSlides(s, ml);
    for (const ai of aiData) {
      if (ai.type === 'pl' && typeof ai.revenue === 'number') {
        const idx = base.findIndex((sl) => sl.type === 'pl');
        if (idx !== -1) base[idx] = { type: 'pl', revenue: ai.revenue as number, revenueBudget: (ai.revenueBudget as number) ?? 1200, gross: (ai.gross as number) ?? 480, grossBudget: (ai.grossBudget as number) ?? 600, op: (ai.op as number) ?? 160, opBudget: (ai.opBudget as number) ?? 250 };
      }
      if (ai.type === 'analysis' && ai.positives) {
        const idx = base.findIndex((sl) => sl.type === 'analysis');
        if (idx !== -1) base[idx] = { type: 'analysis', title: (ai.title as string) ?? '予実分析', rate: (ai.rate as number) ?? 88, positives: ai.positives as string[], negatives: (ai.negatives as string[]) ?? [] };
      }
      if (ai.type === 'review_good' && ai.bullets) {
        const idx = base.findIndex((sl) => sl.type === 'review' && 'accent' in sl && sl.accent === '#10B981');
        if (idx !== -1) { const sl = base[idx]; if (sl.type === 'review') sl.aiBullets = ai.bullets as string[]; }
      }
      if (ai.type === 'review_bad' && ai.bullets) {
        const idx = base.findIndex((sl) => sl.type === 'review' && 'accent' in sl && sl.accent === '#DC2626');
        if (idx !== -1) { const sl = base[idx]; if (sl.type === 'review') sl.aiBullets = ai.bullets as string[]; }
      }
      if (ai.type === 'review_improve' && ai.bullets) {
        const idx = base.findIndex((sl) => sl.type === 'review' && 'accent' in sl && sl.accent === '#F59E0B');
        if (idx !== -1) { const sl = base[idx]; if (sl.type === 'review') sl.aiBullets = ai.bullets as string[]; }
      }
      if (ai.type === 'action' && ai.items) {
        const idx = base.findIndex((sl) => sl.type === 'action');
        if (idx !== -1) base[idx] = { type: 'action', items: ai.items as { title: string; due: string; owner: string }[] };
      }
      if (ai.type === 'forecast' && typeof ai.current === 'number') {
        const idx = base.findIndex((sl) => sl.type === 'forecast');
        if (idx !== -1) base[idx] = { type: 'forecast', current: ai.current as number, forecast: (ai.forecast as number) ?? 11800, gapToYear: (ai as Record<string, number>).gapToYear ?? 200, pct: (ai.pct as number) ?? 92 };
      }
    }
    return base;
  }

  if (step === 'present' && slides.length > 0) {
    return <PresentationView slides={slides} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-3xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col shadow-sm">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em]">月次報告会</p>
            <h2 className="text-lg font-semibold text-gray-900 mt-0.5">{monthLabel} の振り返りアンケート</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-2 -mr-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'survey' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <p className="text-sm text-gray-600 leading-relaxed bg-blue-50/60 border border-blue-100 rounded-2xl px-4 py-3">
                記入内容とAIの分析を組み合わせて、<span className="font-semibold">14ページの本格報告会スライド</span>を生成します。<br />
                <span className="text-xs text-gray-500">空欄でもAIの意見のみで作成可能です。</span>
              </p>

              <div>
                <label className="block text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-2">良かった点</label>
                <textarea
                  value={survey.good}
                  onChange={(e) => setSurvey({ ...survey, good: e.target.value })}
                  rows={3}
                  placeholder="例: 既存顧客から追加発注をもらえた / 新しい提案が刺さった"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none resize-none placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-red-700 uppercase tracking-widest mb-2">悪かった点</label>
                <textarea
                  value={survey.bad}
                  onChange={(e) => setSurvey({ ...survey, bad: e.target.value })}
                  rows={3}
                  placeholder="例: 提案フェーズで止まる案件が増えた / 受注率が落ちた"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none resize-none placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-amber-700 uppercase tracking-widest mb-2">改善点</label>
                <textarea
                  value={survey.improve}
                  onChange={(e) => setSurvey({ ...survey, improve: e.target.value })}
                  rows={3}
                  placeholder="例: 提案レビュー会を週次で / 経費の使い方を見直す"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none resize-none placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-sky-700 uppercase tracking-widest mb-2">来月すること</label>
                <textarea
                  value={survey.next}
                  onChange={(e) => setSurvey({ ...survey, next: e.target.value })}
                  rows={3}
                  placeholder="例: 既存上位5社に訪問 / 新規アポを15件以上"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 focus:outline-none resize-none placeholder:text-gray-500"
                />
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-2 rounded-b-3xl">
              <button onClick={onClose} className="flex-1 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                キャンセル
              </button>
              <button onClick={handleGenerate} className="flex-1 py-3 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all active:scale-[0.98]">
                ✦ 報告会を生成
              </button>
            </div>
          </>
        )}

        {step === 'generating' && (
          <div className="p-16 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-gray-100 rounded-full" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-blue-600 border-r-purple-600 rounded-full animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-base font-semibold text-gray-900">報告会を生成中</p>
              <p className="text-xs text-gray-500">数字を読み取り、AIが意見をまとめています...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
