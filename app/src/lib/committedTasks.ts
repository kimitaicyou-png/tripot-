'use client';

export type CommittedTask = {
  id: string;
  dealId: string;
  dealName: string;
  clientName: string;
  title: string;
  assigneeId: string;
  assigneeName: string;
  dueDate?: string;
  status: 'todo' | 'doing' | 'done';
  committedAt: string;
};

const STORAGE_KEY = 'coaris_committed_production_tasks';
const STATUS_KEY = 'coaris_production_task_status';

function load(): CommittedTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CommittedTask[]) : [];
  } catch {
    return [];
  }
}

function save(list: CommittedTask[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getCommittedTasks(): CommittedTask[] {
  return load();
}

export function getCommittedTasksForMember(memberId: string): CommittedTask[] {
  const list = load();
  const statusMap = loadStatusMap();
  return list
    .filter((t) => t.assigneeId === memberId)
    .map((t) => ({ ...t, status: (statusMap[t.id] as CommittedTask['status']) ?? t.status }));
}

function loadStatusMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATUS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveStatusMap(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STATUS_KEY, JSON.stringify(map));
}

export function upsertCommittedTasks(tasks: CommittedTask[]): void {
  const existing = load();
  const map = new Map(existing.map((t) => [t.id, t]));
  tasks.forEach((t) => map.set(t.id, t));
  save(Array.from(map.values()));
  const statusMap = loadStatusMap();
  tasks.forEach((t) => {
    if (!statusMap[t.id]) statusMap[t.id] = 'todo';
  });
  saveStatusMap(statusMap);
}

export function updateCommittedTaskStatus(id: string, status: CommittedTask['status']): void {
  const map = loadStatusMap();
  map[id] = status;
  saveStatusMap(map);
}
