import { describe, expect, test, vi, beforeEach } from 'vitest';

/**
 * deals server action の単体テスト（updateDealStage 中心）。
 *
 * updateDealStage は InlineStageChanger（バッジクリック → dropdown）の保存先で、
 * 手動オーバーライド用。stage 変更時に audit_logs に記録される。
 * 自動進行（maybeAdvanceDealStage）と並列で動く、両方の境界を別途テスト済。
 */

const { mockSession, dbMock, authMock, logAuditMock, requirePermissionMock } =
  vi.hoisted(() => {
    const session = {
      user: {
        member_id: 'test-member-id',
        company_id: 'test-company-id',
        role: 'member',
      },
    };
    return {
      mockSession: session,
      dbMock: {
        select: vi.fn(),
        update: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
      },
      authMock: vi.fn().mockResolvedValue(session),
      logAuditMock: vi.fn().mockResolvedValue(undefined),
      requirePermissionMock: vi.fn().mockResolvedValue({ ok: true, session }),
    };
  });

function makeDbChain(resolved: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    then: vi.fn((cb: (v: unknown) => unknown) => Promise.resolve(cb(resolved))),
  };
  return chain;
}

vi.mock('@/lib/db', () => ({
  db: dbMock,
  logAudit: logAuditMock,
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/rbac', () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { updateDealStage } from '@/lib/actions/deals';

describe('updateDealStage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(mockSession);
    requirePermissionMock.mockResolvedValue({ ok: true, session: mockSession });
  });

  test('requirePermission denied (session 無し含む) → guard.error', async () => {
    requirePermissionMock.mockResolvedValue({ ok: false, error: 'unauthorized' });
    const result = await updateDealStage('test-deal-id', 'proposing');
    expect(result).toEqual({ ok: false, error: 'unauthorized' });
    expect(dbMock.select).not.toHaveBeenCalled();
  });

  test('不正な stage 値 → invalid_stage', async () => {
    const result = await updateDealStage('test-deal-id', 'unknown_stage');
    expect(result).toEqual({ ok: false, error: 'invalid_stage' });
  });

  test('deal が見つからない → deal_not_found', async () => {
    dbMock.select.mockReturnValue(makeDbChain([])); // 0 件
    const result = await updateDealStage('nonexistent-id', 'proposing');
    expect(result).toEqual({ ok: false, error: 'deal_not_found' });
    expect(dbMock.update).not.toHaveBeenCalled();
  });

  test('正常: stage 更新 + audit_log 記録', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'prospect' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await updateDealStage('test-deal-id', 'proposing');
    expect(result).toEqual({ ok: true });
    expect(dbMock.update).toHaveBeenCalledTimes(1);
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'deal.stage_manual_change',
        resource_type: 'deal',
        resource_id: 'test-deal-id',
        metadata: expect.objectContaining({
          from: 'prospect',
          to: 'proposing',
          source: 'inline_stage_changer',
        }),
      }),
    );
  });

  test('lost への手動変更も許可（自動進行と別軸）', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'proposing' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await updateDealStage('test-deal-id', 'lost');
    expect(result).toEqual({ ok: true });
  });

  test('後退（paid → ordered）も手動許可（オーバーライド用途）', async () => {
    // updateDealStage は「後退しないルール」を適用しない（オーバーライド用途）
    // 自動進行 maybeAdvanceDealStage 側でブロックされる、これは別関数
    dbMock.select.mockReturnValue(makeDbChain([{ stage: 'paid' }]));
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await updateDealStage('test-deal-id', 'ordered');
    expect(result).toEqual({ ok: true });
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ from: 'paid', to: 'ordered' }),
      }),
    );
  });

  test('requirePermission denied → error', async () => {
    requirePermissionMock.mockResolvedValue({ ok: false, error: 'forbidden' });
    const result = await updateDealStage('test-deal-id', 'proposing');
    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(dbMock.update).not.toHaveBeenCalled();
  });
});
