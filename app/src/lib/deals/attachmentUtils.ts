import type { AttachmentKind } from './types';

export function detectKind(url: string): AttachmentKind {
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

export function getHostLabel(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}
