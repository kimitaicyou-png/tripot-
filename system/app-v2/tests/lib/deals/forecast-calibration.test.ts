import { describe, it, expect } from 'vitest';
import type { CalibrationResult } from '@/lib/deals/forecast-calibration';

/**
 * forecast-calibration の型と export 存在の smoke test。
 * 実際のロジックは DB 統合が必要なため、3-6 ヶ月運用後の cron job 実装時に integration test 追加予定。
 */
describe('forecast-calibration', () => {
  it('CalibrationResult 型の shape が期待通り', () => {
    // 型のみテスト（runtime 値はダミー）
    const sample: CalibrationResult = {
      byConfidence: [
        {
          confidence: 'a',
          totalSampleSize: 50,
          actualWonCount: 42,
          actualWonRate: 0.84,
          currentDefaultWeight: 1.0,
          suggestedWeight: 0.84,
          deviation: -0.16,
        },
      ],
      periodStart: '2026-02-26',
      periodEnd: '2026-05-26',
      totalDealsAnalyzed: 50,
      warnings: [],
    };
    expect(sample.byConfidence[0]?.confidence).toBe('a');
    expect(sample.byConfidence[0]?.deviation).toBeLessThan(0);
  });

  it('A=1.0 と実測 0.84 のような乖離が業界共通の罠の典型例', () => {
    // forecastio.ai / HubSpot 元 CRO Mark Roberge の指摘：
    // 「デフォルト % は convention（慣習）、実測値で書き換えるべき」
    const defaultWeight = 1.0;
    const actualWonRate = 0.84;
    const deviation = actualWonRate - defaultWeight;
    expect(deviation).toBeLessThan(0);
    expect(Math.abs(deviation)).toBeGreaterThan(0.1);
  });
});
