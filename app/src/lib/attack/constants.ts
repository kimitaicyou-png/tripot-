export const CURRENT_USER = {
  name: '',
  companyName: 'トライポット株式会社',
  companyShort: 'トライポット',
};

export const PRIORITY_CONFIG = {
  S: { label: 'S', bg: 'bg-red-600', text: 'text-white' },
  A: { label: 'A', bg: 'bg-orange-500', text: 'text-white' },
  B: { label: 'B', bg: 'bg-blue-500', text: 'text-white' },
  C: { label: 'C', bg: 'bg-gray-400', text: 'text-white' },
};

export const STATUS_CONFIG = {
  new: { label: '未着手', bg: 'bg-gray-200', color: 'text-gray-800' },
  contacted: { label: '連絡済', bg: 'bg-blue-200', color: 'text-blue-800' },
  meeting: { label: '商談化', bg: 'bg-green-200', color: 'text-green-800' },
  dealt: { label: '案件化', bg: 'bg-purple-200', color: 'text-purple-800' },
};

export const TRACKING_TYPE_CONFIG = {
  email_open: { label: 'メール開封' },
  link_click: { label: 'リンククリック' },
  page_view: { label: 'ページ閲覧' },
};

export const MOCK_EIGHT_CARDS: [] = [];
export const MOCK_TRACKING: [] = [];
