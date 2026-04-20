'use client';

export type Notification = {
  id: string;
  toMemberId: string;
  fromMemberId: string;
  fromName: string;
  type: 'mention' | 'review_request' | 'task_assigned' | 'deal_update' | 'general';
  title: string;
  body: string;
  link?: string;
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = 'coaris_notifications';
const DEMO_SEEDED_KEY = 'coaris_notifications_seeded_v1';

function load(): Notification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Notification[]) : [];
  } catch {
    return [];
  }
}

function save(list: Notification[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function seedDemoNotifications(currentMemberId: string): void {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(DEMO_SEEDED_KEY)) return;

  const demos: Notification[] = [];

  const existing = load();
  save([...demos, ...existing]);
  localStorage.setItem(DEMO_SEEDED_KEY, '1');
}

export function sendNotification(n: Omit<Notification, 'id' | 'createdAt' | 'read'>): void {
  const list = load();
  const newItem: Notification = {
    ...n,
    id: generateId(),
    createdAt: new Date().toISOString(),
    read: false,
  };
  save([newItem, ...list]);
}

export function getNotifications(memberId: string): Notification[] {
  return load()
    .filter((n) => n.toMemberId === memberId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function markAsRead(id: string): void {
  const list = load().map((n) => (n.id === id ? { ...n, read: true } : n));
  save(list);
}

export function markAllRead(memberId: string): void {
  const list = load().map((n) =>
    n.toMemberId === memberId ? { ...n, read: true } : n
  );
  save(list);
}

export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return '昨日';
  return `${diffD}日前`;
}
