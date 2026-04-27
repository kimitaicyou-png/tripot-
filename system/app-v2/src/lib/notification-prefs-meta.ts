export const RULE_KEYS = [
  'budget_alert',
  'silence_detect',
  'stuck_deal',
  'overload',
  'mf_unmatched',
  'approval_request',
  'approval_decision',
  'task_due',
  'morning_brief',
] as const;

export const CHANNELS = ['app', 'slack', 'line', 'email'] as const;

export const RULE_LABELS: Record<string, string> = {
  budget_alert: '予算未達アラート',
  silence_detect: '沈黙顧客検知',
  stuck_deal: '案件詰まり検知',
  overload: '過負荷検知',
  mf_unmatched: 'MF 仕訳 未照合',
  approval_request: '承認申請',
  approval_decision: '承認結果',
  task_due: 'タスク期限',
  morning_brief: '朝ブリーフィング',
};

export const RULE_DESCRIPTIONS: Record<string, string> = {
  budget_alert: '月次目標未達が3回連続したら通知',
  silence_detect: '30日以上接触のない顧客があれば通知',
  stuck_deal: '案件が同じステージで14日以上停滞したら通知',
  overload: 'メンバーの稼働率が120%超えたら通知',
  mf_unmatched: 'MF仕訳と案件の照合漏れがあれば通知',
  approval_request: '自分宛ての承認申請があれば通知',
  approval_decision: '自分の申請に決裁がついたら通知',
  task_due: '担当タスクの期限が3日以内に迫ったら通知',
  morning_brief: '朝ブリーフィングを毎朝7時に通知',
};
