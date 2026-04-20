'use client';

export type ExternalPartner = {
  id: string;
  companyName: string;
  contactName: string;
  role?: string;
  email?: string;
};

const STORAGE_KEY = 'coaris_external_partners';

const SEED_PARTNERS: ExternalPartner[] = [
  { id: 'ep_vinaforce', companyName: 'Vinaforce', contactName: 'Vinh', role: 'バックエンド', email: 'vinh@vinaforce.example.com' },
  { id: 'ep_della', companyName: 'DellaPartners', contactName: 'Nguyen', role: 'コーダー' },
  { id: 'ep_nagoya_design', companyName: '名古屋デザイン工房', contactName: '松本', role: 'デザイン' },
];

function load(): ExternalPartner[] {
  if (typeof window === 'undefined') return SEED_PARTNERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PARTNERS));
      return SEED_PARTNERS;
    }
    return JSON.parse(raw) as ExternalPartner[];
  } catch {
    return SEED_PARTNERS;
  }
}

function save(list: ExternalPartner[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getPartners(): ExternalPartner[] {
  return load();
}

export function addPartner(p: Omit<ExternalPartner, 'id'>): ExternalPartner {
  const list = load();
  const newPartner: ExternalPartner = { ...p, id: `ep_${Date.now()}` };
  save([...list, newPartner]);
  return newPartner;
}

export function removePartner(id: string): void {
  save(load().filter((p) => p.id !== id));
}
