import { describe, it, expect } from 'vitest';
import {
  getWeekMonday,
  toIsoDate,
  generateWeeks,
  getWeeksRangeStart,
  getWeeksRangeEnd,
  normalizeToWeekIso,
  emptyWeekCell,
  WEEKS_TOTAL,
  WEEKS_PAST,
  WEEKS_FUTURE,
} from '@/lib/deals/week-grid';

describe('week-grid helpers', () => {
  describe('getWeekMonday', () => {
    it('月曜日の日付はそのまま返す', () => {
      // 2026-05-25 は月曜日
      const monday = new Date('2026-05-25T12:00:00Z');
      const result = getWeekMonday(monday);
      expect(toIsoDate(result)).toBe('2026-05-25');
    });

    it('火曜日 → 前日の月曜', () => {
      // 2026-05-26 火曜
      const tuesday = new Date('2026-05-26T15:00:00Z');
      const result = getWeekMonday(tuesday);
      expect(toIsoDate(result)).toBe('2026-05-25');
    });

    it('日曜日 → 6 日前の月曜', () => {
      // 2026-05-31 日曜
      const sunday = new Date('2026-05-31T05:00:00Z');
      const result = getWeekMonday(sunday);
      expect(toIsoDate(result)).toBe('2026-05-25');
    });

    it('週またぎ 月曜 → そのまま', () => {
      const monday = new Date('2026-06-01T00:00:00Z');
      const result = getWeekMonday(monday);
      expect(toIsoDate(result)).toBe('2026-06-01');
    });
  });

  describe('generateWeeks', () => {
    it(`合計 ${WEEKS_TOTAL} 週生成（過去 ${WEEKS_PAST} + 今週 + 未来 ${WEEKS_FUTURE}）`, () => {
      const weeks = generateWeeks(new Date('2026-05-26T12:00:00Z'));
      expect(weeks.length).toBe(WEEKS_TOTAL);
    });

    it('isCurrent フラグは 1 件だけ', () => {
      const weeks = generateWeeks(new Date('2026-05-26T12:00:00Z'));
      const currentCount = weeks.filter((w) => w.isCurrent).length;
      expect(currentCount).toBe(1);
    });

    it('今週の startDate = 月曜日 ISO', () => {
      const weeks = generateWeeks(new Date('2026-05-26T12:00:00Z'));
      const current = weeks.find((w) => w.isCurrent);
      expect(current?.startDate).toBe('2026-05-25');
    });

    it('isMonthStart が月の頭の週に立つ', () => {
      const weeks = generateWeeks(new Date('2026-05-26T12:00:00Z'));
      const monthStarts = weeks.filter((w) => w.isMonthStart);
      // 12 週で 3-4 ヶ月またぐので、月始まりは 3-5 件くらい（最低 2 件）
      expect(monthStarts.length).toBeGreaterThanOrEqual(2);
    });

    it('週は時系列順', () => {
      const weeks = generateWeeks(new Date('2026-05-26T12:00:00Z'));
      for (let i = 1; i < weeks.length; i++) {
        expect(weeks[i]!.startDate > weeks[i - 1]!.startDate).toBe(true);
      }
    });
  });

  describe('getWeeksRangeStart / getWeeksRangeEnd', () => {
    it(`start = 今週月曜 - ${WEEKS_PAST} 週`, () => {
      const now = new Date('2026-05-26T12:00:00Z');
      const start = getWeeksRangeStart(now);
      expect(toIsoDate(start)).toBe('2026-04-27'); // 2026-05-25 - 28 日
    });

    it(`end = 今週月曜 + ${WEEKS_FUTURE + 1} 週 - 1 日`, () => {
      const now = new Date('2026-05-26T12:00:00Z');
      const end = getWeeksRangeEnd(now);
      // 2026-05-25 + 8 週 - 1 日 = 2026-07-19（日）
      expect(toIsoDate(end)).toBe('2026-07-19');
    });
  });

  describe('normalizeToWeekIso', () => {
    it('Date 引数 OK', () => {
      const d = new Date('2026-05-28T10:00:00Z');
      expect(normalizeToWeekIso(d)).toBe('2026-05-25');
    });

    it('ISO string 引数 OK', () => {
      expect(normalizeToWeekIso('2026-05-28')).toBe('2026-05-25');
    });
  });

  describe('emptyWeekCell', () => {
    it('全フィールド 0', () => {
      const cell = emptyWeekCell();
      expect(cell.actionCount).toBe(0);
      expect(cell.meetingCount).toBe(0);
      expect(cell.tasksDone).toBe(0);
      expect(cell.tasksTotal).toBe(0);
      expect(cell.actionsByType).toEqual({});
    });
  });
});
