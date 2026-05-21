import { describe, expect, test, vi, beforeEach } from 'vitest';

/**
 * maybeAdvanceDealStage の境界網羅テスト（DB mock + 自動進行ロジック）。
 *
 * 隊長思想「行動 → 全自動でステージ → PL/CF」の安全弁。
 * 「後退しないルール」と「lost からの保護」は CRITICAL ロジック、
 * バグると prod の deal.stage が誤って戻る / 進む可能性があり、PL/CF を狂わせる。
 */

const { dbMock, logAuditMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    update: vi.fn(),
  },
  logAuditMock: vi.fn().mockResolvedValue(undefined),
}));

function makeDbChain(resolved: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    then: vi.fn((cb: (v: unknown) => unknown) => Promise.resolve(cb(resolved))),
  };
  return chain;
}

vi.mock('@/lib/db', () => ({
  db: dbMock,
  logAudit: logAuditMock,
}));

import { maybeAdvanceDealStage } from '@/lib/deals/stage-advance';

const baseParams = {
  dealId: 'test-deal',
  companyId: 'test-company',
  memberId: 'test-member',
  triggeredBy: 'test.trigger',
};

describe('maybeAdvanceDealStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('target が lost → invalid_target で何もしない', async () => {
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'lost',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('invalid_target');
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('target が不正な stage → invalid_target', async () => {
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'unknown_stage',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('invalid_target');
  });

  test('deal が見つからない → not_found', async () => {
    dbMock.select.mockReturnValue(makeDbChain([])); // 0 件
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'ordered',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('not_found');
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('現 stage が lost → lost_terminal で何もしない（自動進行は lost を上書きしない）', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'lost' }]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'ordered',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('lost_terminal');
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('現 stage と target が同じ order → already_forward（後退しないルール）', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'ordered' }]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'ordered',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('already_forward');
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('現 stage が target より進んでいる → already_forward（後退ブロック）', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'paid' }]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'ordered',
    });
    expect(result.advanced).toBe(false);
    expect(result.reason).toBe('already_forward');
    expect(result.from).toBe('paid');
    expect(result.to).toBe('ordered');
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('正常前進: prospect → proposing → advanced + update + audit', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'prospect' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'proposing',
    });
    expect(result.advanced).toBe(true);
    expect(result.from).toBe('prospect');
    expect(result.to).toBe('proposing');
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(logAuditMock).toHaveBeenCalledTimes(1);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deal.stage_auto_advance',
        metadata: expect.objectContaining({
          from: 'prospect',
          to: 'proposing',
          triggered_by: 'test.trigger',
        }),
      }),
    );
  });

  test('スキップ前進: prospect → paid → advanced（複数段先行 OK）', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'prospect' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'paid',
    });
    expect(result.advanced).toBe(true);
    expect(result.from).toBe('prospect');
    expect(result.to).toBe('paid');
  });

  test('正常前進: ordered → in_production', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'ordered' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'in_production',
    });
    expect(result.advanced).toBe(true);
  });

  test('audit_logs に triggered_by が記録される', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'delivered' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    await maybeAdvanceDealStage({
      ...baseParams,
      targetStage: 'acceptance',
      triggeredBy: 'meeting.marked_acceptance',
    });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deal.stage_auto_advance',
        resource_type: 'deal',
        resource_id: 'test-deal',
        metadata: expect.objectContaining({
          triggered_by: 'meeting.marked_acceptance',
        }),
      }),
    );
  });
});
