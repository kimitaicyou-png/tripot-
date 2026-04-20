'use client';

export type EmailLog = {
  id: string;
  sentAt: string;
  to: string;
  subject: string;
  contextType: 'deal' | 'contact' | 'customer' | 'invoice';
  contextId: string;
  actor?: string;
};

const STORAGE_KEY = 'coaris_email_logs';

function readLogs(): EmailLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EmailLog[];
  } catch {
    return [];
  }
}

export function logEmailSent(entry: Omit<EmailLog, 'id' | 'sentAt'>): void {
  if (typeof window === 'undefined') return;
  try {
    const logs = readLogs();
    const newLog: EmailLog = {
      ...entry,
      id: `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sentAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newLog, ...logs]));
  } catch {}
}

export function getEmailLogsByContext(contextType: EmailLog['contextType'], contextId: string): EmailLog[] {
  return readLogs().filter((l) => l.contextType === contextType && l.contextId === contextId);
}

export function getAllEmailLogs(): EmailLog[] {
  return readLogs();
}
