import type { EightCard, AttackTarget, TrackingEvent } from './types';

export function isWithin48h(timestamp: string): boolean {
  const now = Date.now();
  return now - new Date(timestamp).getTime() < 48 * 60 * 60 * 1000;
}

export function isWithin24h(timestamp: string): boolean {
  const now = Date.now();
  return now - new Date(timestamp).getTime() < 24 * 60 * 60 * 1000;
}

export function relativeTime(timestamp: string): string {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}分前`;
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

export function scoreCards(cards: EightCard[], tracking: TrackingEvent[]): AttackTarget[] {
  return cards.map((card) => {
    let score = 0;
    let reasons: string[] = [];

    if (card.memo.includes('検討') || card.memo.includes('計画') || card.memo.includes('希望')) {
      score += 40;
      reasons.push('導入検討中');
    }
    if (card.memo.includes('DX') || card.memo.includes('システム') || card.memo.includes('クラウド') || card.memo.includes('デジタル')) {
      score += 25;
      reasons.push('DX/システム化ニーズ');
    }
    if (card.position.includes('取締役') || card.position.includes('代表') || card.position.includes('部長') || card.position.includes('室長') || card.position.includes('理事')) {
      score += 20;
      reasons.push('決裁権者');
    }
    if (['製造業', '医療', '物流'].includes(card.industry)) {
      score += 15;
      reasons.push(`${card.industry}（実績あり）`);
    }
    const daysSince = Math.floor((Date.now() - new Date(card.exchangedDate).getTime()) / 86400000);
    if (daysSince <= 7) {
      score += 10;
      reasons.push('直近交換（ホットリード）');
    }

    const cardTracking = tracking.filter((e) => e.targetId === card.id);
    let hasEmailOpen = false;
    let hasLinkClick = false;
    let hasPageView = false;
    let hasRecent24h = false;

    for (const event of cardTracking) {
      if (event.type === 'email_open') { score += 10; hasEmailOpen = true; }
      if (event.type === 'link_click') { score += 15; hasLinkClick = true; }
      if (event.type === 'page_view') { score += 20; hasPageView = true; }
      if (isWithin24h(event.timestamp)) hasRecent24h = true;
    }
    if (hasRecent24h) score += 10;
    if (hasEmailOpen) reasons.push('メール開封');
    if (hasLinkClick) reasons.push('リンククリック');
    if (hasPageView) reasons.push('Webサイト閲覧あり');

    if (reasons.length === 0) {
      score = 20;
      reasons.push('情報収集段階');
    }

    const priority: AttackTarget['priority'] = score >= 70 ? 'S' : score >= 50 ? 'A' : score >= 30 ? 'B' : 'C';

    const defaultActions: Record<string, string> = {
      'S': '今週中にアポイントを取る。課題ヒアリング+事例紹介で初回訪問。',
      'A': '1週間以内にメールで接触。セミナー招待or事例資料送付。',
      'B': '2週間以内にメールでフォロー。業界レポート送付で関係構築。',
      'C': 'メルマガ登録を促す。中長期でナーチャリング。',
    };

    let suggestedAction = defaultActions[priority];
    if (hasEmailOpen && hasPageView) {
      suggestedAction = 'ホットリード！今すぐ電話を。料金ページを見ています。';
    } else if (hasEmailOpen && hasLinkClick) {
      suggestedAction = 'ホットリード！今すぐ電話を。資料をダウンロードしています。';
    } else if (hasEmailOpen) {
      suggestedAction = '関心あり。追加情報を送信して反応を見ましょう。';
    }

    return {
      ...card,
      score,
      reason: reasons.join(' / '),
      suggestedAction,
      priority,
      status: 'new' as const,
    };
  }).sort((a, b) => b.score - a.score);
}
