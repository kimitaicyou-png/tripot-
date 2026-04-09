import type { Vendor } from '@/lib/stores/types';

export const VENDORS: Vendor[] = [
  { id: 'v_yamada',     name: '山田デザイン事務所',  specialty: 'UIデザイン・LP制作',     defaultRate: '25,000円/日', note: '反応早い、納期守る',      email: 'yamada-design@example.com',   rating: 4.5, pastProjects: 12, onTimeRate: 95, internalOwnerId: 'izumi' },
  { id: 'v_sato',       name: '佐藤フロントエンド',  specialty: 'React / Next.js実装',    defaultRate: '5,000円/時',  note: '単価やや高め、品質◎',    email: 'sato-fe@example.com',         rating: 4.8, pastProjects: 8,  onTimeRate: 100, internalOwnerId: 'inukai' },
  { id: 'v_coderush',   name: 'コードラッシュ合同',  specialty: 'バックエンド・API',       defaultRate: '見積依頼',    note: '大規模向け、チーム対応可', email: 'info@coderush.example.com',   rating: 4.0, pastProjects: 3,  onTimeRate: 85, internalOwnerId: 'ono', backupVendorId: 'v_sato' },
  { id: 'v_takai',      name: '高井イラストスタジオ', specialty: 'キャラ・アイコン作成',    defaultRate: '1点1万〜',    note: '和風タッチ得意',          email: 'takai-illust@example.com',    rating: 4.2, pastProjects: 6,  onTimeRate: 90, internalOwnerId: 'izumi' },
  { id: 'v_voicepro',   name: '声プロ・ナレーション', specialty: 'ナレーション・動画音声',   defaultRate: '30,000円〜',  note: '男性/女性両対応',         email: 'voicepro@example.com',        rating: 3.8, pastProjects: 2,  onTimeRate: 80, internalOwnerId: 'kashiwagi' },
  { id: 'v_qualityqa',  name: 'クオリティQA',        specialty: 'テスト・QA受託',          defaultRate: '日額40,000円', note: '',                        email: 'qa@qualityqa.example.com',    rating: 4.6, pastProjects: 5,  onTimeRate: 98, internalOwnerId: 'inukai', backupVendorId: 'v_sato' },
];

export function getVendorByName(name: string): Vendor | undefined {
  return VENDORS.find((v) => v.name === name);
}
