export type EightCard = {
  id: string;
  name: string;
  company: string;
  position: string;
  department: string;
  industry: string;
  email: string;
  phone: string;
  exchangedDate: string;
  memo: string;
};

export type AttackTarget = EightCard & {
  score: number;
  reason: string;
  suggestedAction: string;
  priority: 'S' | 'A' | 'B' | 'C';
  status: 'new' | 'contacted' | 'meeting' | 'dealt';
};

export type TrackingEvent = {
  id: string;
  targetId: string;
  type: 'email_open' | 'link_click' | 'page_view';
  detail: string;
  timestamp: string;
};
