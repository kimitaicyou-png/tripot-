import { describe, expect, test, vi, beforeEach } from 'vitest';

/**
 * monthly-opex server action の単体テスト（DB / auth mock パターンの実証）。
 *
 * vi.mock factory は hoisted されるため、vi.hoisted で定義した変数のみ参照可能。
 * このパターン確立で他の server action にも同じ approach で展開可能。
 */

// vi.mock factory に渡す値は vi.hoisted で定義（top-level let は参照不可）
const { mockSession, dbMock, authMock, logAuditMock } = vi.hoisted(() => {
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
    },
    authMock: vi.fn().mockResolvedValue(session),
    logAuditMock: vi.fn().mockResolvedValue(undefined),
  };
});

// db の chain を返す factory（最後に then で resolved value を返す）
function makeDbChain(resolved: unknown) {
  const chain: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
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

// Next.js の revalidatePath / redirect は server context 専用、vitest では no-op で mock
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// import は vi.mock の後に
import { getMonthlyOpex, updateMonthlyOpex } from '@/lib/actions/monthly-opex';

describe('getMonthlyOpex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(mockSession);
  });

  test('session 無し → 0', async () => {
    authMock.mockResolvedValue(null);
    const result = await getMonthlyOpex('2026-05');
    expect(result).toBe(0);
  });

  test('companies.config に monthly_opex 無し → 0', async () => {
    dbMock.select.mockReturnValue(makeDbChain([{ config: { other: 'value' } }]));
    const result = await getMonthlyOpex('2026-05');
    expect(result).toBe(0);
  });

  test('monthly_opex[YYYY-MM] に値あり → その値を返す', async () => {
    dbMock.select.mockReturnValue(
      makeDbChain([{ config: { monthly_opex: { '2026-05': 1_500_000 } } }]),
    );
    const result = await getMonthlyOpex('2026-05');
    expect(result).toBe(1_500_000);
  });

  test('monthly_opex はあるが該当月なし → 0', async () => {
    dbMock.select.mockReturnValue(
      makeDbChain([{ config: { monthly_opex: { '2026-04': 1_000_000 } } }]),
    );
    const result = await getMonthlyOpex('2026-05');
    expect(result).toBe(0);
  });

  test('companies が 0 件 → 0', async () => {
    dbMock.select.mockReturnValue(makeDbChain([]));
    const result = await getMonthlyOpex('2026-05');
    expect(result).toBe(0);
  });
});

describe('updateMonthlyOpex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(mockSession);
  });

  test('session 無し → unauthorized', async () => {
    authMock.mockResolvedValue(null);
    const result = await updateMonthlyOpex('2026-05', 1_000_000);
    expect(result).toEqual({ ok: false, error: 'unauthorized' });
  });

  test('member ロール → forbidden', async () => {
    authMock.mockResolvedValue({
      user: { ...mockSession.user, role: 'member' },
    });
    const result = await updateMonthlyOpex('2026-05', 1_000_000);
    expect(result).toEqual({ ok: false, error: 'forbidden' });
  });

  test('president ロール + 正常入力 → ok: true', async () => {
    authMock.mockResolvedValue({
      user: { ...mockSession.user, role: 'president' },
    });
    dbMock.update.mockReturnValue(makeDbChain([]));
    const result = await updateMonthlyOpex('2026-05', 1_500_000);
    expect(result).toEqual({ ok: true });
    expect(dbMock.update).toHaveBeenCalled();
  });

  test('不正な YYYY-MM 形式 → invalid_input', async () => {
    authMock.mockResolvedValue({
      user: { ...mockSession.user, role: 'hq_member' },
    });
    const result = await updateMonthlyOpex('2026/05', 1_000_000);
    expect(result).toEqual({ ok: false, error: 'invalid_input' });
  });

  test('負の amount → invalid_input', async () => {
    authMock.mockResolvedValue({
      user: { ...mockSession.user, role: 'hq_member' },
    });
    const result = await updateMonthlyOpex('2026-05', -100);
    expect(result).toEqual({ ok: false, error: 'invalid_input' });
  });
});
