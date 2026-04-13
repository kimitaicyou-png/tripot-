'use client';

import { useState } from 'react';
import type { ProductionCard, ProductionAction, ActionType, IncidentStatus } from '@/lib/stores/types';
import { getMemberName } from '@/lib/constants/members';

const ACTION_TYPES: { id: ActionType; label: string; icon: string }[] = [
  { id: 'phone', label: '電話', icon: '📞' },
  { id: 'email', label: 'メール', icon: '✉️' },
  { id: 'meet', label: '会議', icon: '🤝' },
  { id: 'voice', label: '音声', icon: '🎙️' },
  { id: 'incident', label: '障害', icon: '⚠️' },
];

const INCIDENT_STATUSES: { id: IncidentStatus; label: string; color: string }[] = [
  { id: 'open', label: '対応中', color: 'bg-red-50 text-red-700' },
  { id: 'investigating', label: '調査中', color: 'bg-amber-50 text-amber-700' },
  { id: 'resolved', label: '解決済', color: 'bg-emerald-50 text-emerald-700' },
];

type Props = {
  card: ProductionCard;
  onUpdate: (id: string, patch: Partial<ProductionCard>) => void;
};

export function CustomerActionPanel({ card, onUpdate }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType>('phone');
  const [content, setContent] = useState('');
  const pmId = card.pmId ?? '';
  const teamMemberIds = card.teamMemberIds ?? [];
  const [assignee, setAssignee] = useState(pmId);
  const [incidentStatus, setIncidentStatus] = useState<IncidentStatus>('open');

  const actions = card.actions ?? [];

  const handleAdd = () => {
    if (!content.trim()) return;
    const now = new Date();
    const newAction: ProductionAction = {
      id: `act_${Date.now()}`,
      type: actionType,
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 5),
      content: content.trim(),
      assignee,
      createdAt: now.toISOString(),
      ...(actionType === 'incident' ? { incidentStatus } : {}),
    };
    onUpdate(card.id, { actions: [newAction, ...actions] });
    setContent('');
    setIsOpen(false);
  };

  const handleIncidentStatusChange = (actionId: string, status: IncidentStatus) => {
    const updated = actions.map((a) =>
      a.id === actionId ? { ...a, incidentStatus: status } : a
    );
    onUpdate(card.id, { actions: updated });
  };

  const handleRemove = (actionId: string) => {
    onUpdate(card.id, { actions: actions.filter((a) => a.id !== actionId) });
  };

  const openIncidents = actions.filter((a) => a.type === 'incident' && a.incidentStatus !== 'resolved');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">顧客対応ログ</h3>
        <div className="flex items-center gap-2">
          {openIncidents.length > 0 && (
            <span className="text-xs bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
              障害 {openIncidents.length}件
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-blue-600 hover:text-blue-700 active:scale-[0.98]"
          >
            {isOpen ? '閉じる' : '＋ 記録'}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50">
          <div className="flex gap-1 flex-wrap">
            {ACTION_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActionType(t.id)}
                className={`text-xs px-2.5 py-1.5 rounded-lg active:scale-[0.98] transition-colors ${
                  actionType === t.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {actionType === 'incident' && (
            <div className="flex gap-1">
              {INCIDENT_STATUSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setIncidentStatus(s.id)}
                  className={`text-xs px-2 py-1 rounded-lg active:scale-[0.98] ${
                    incidentStatus === s.id
                      ? `${s.color} border border-current`
                      : 'bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={actionType === 'incident' ? '障害内容・対応状況...' : '対応内容...'}
            className="w-full min-h-[60px] text-sm p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y text-gray-900 bg-white"
          />

          <div className="flex items-center justify-between">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white"
            >
              {[pmId, ...teamMemberIds.filter((id) => id !== pmId)].filter(Boolean).map((id) => (
                <option key={id} value={id}>{getMemberName(id)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!content.trim()}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              記録する
            </button>
          </div>
        </div>
      )}

      {actions.length === 0 ? (
        <p className="text-xs text-gray-500 py-4 text-center">対応記録はまだありません</p>
      ) : (
        <div className="space-y-2">
          {actions.map((a) => {
            const typeInfo = ACTION_TYPES.find((t) => t.id === a.type);
            return (
              <div key={a.id} className="flex gap-2 items-start group">
                <span className="text-sm mt-0.5">{typeInfo?.icon ?? '📝'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="tabular-nums">{a.date}</span>
                    {a.time && <span className="tabular-nums">{a.time}</span>}
                    <span>{getMemberName(a.assignee)}</span>
                    {a.type === 'incident' && a.incidentStatus && (
                      <select
                        value={a.incidentStatus}
                        onChange={(e) => handleIncidentStatusChange(a.id, e.target.value as IncidentStatus)}
                        className={`text-xs px-1.5 py-0.5 rounded border-0 ${
                          INCIDENT_STATUSES.find((s) => s.id === a.incidentStatus)?.color ?? ''
                        }`}
                      >
                        {INCIDENT_STATUSES.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 mt-0.5 whitespace-pre-wrap">{a.content}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 active:scale-[0.98] transition-all p-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
