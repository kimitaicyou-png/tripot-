/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

/**
 * vitest 設定。
 *
 * 隊長 goal 4/4：テスト基盤セットアップ。
 * Next.js 16 / React 19 / drizzle-orm 環境で server actions と純粋関数の単体テスト用。
 *
 * 方針：
 * - jsdom 環境（React component と Web API モック対応）
 * - path alias '@/' を tsconfig と整合（src/）
 * - DB / auth / Anthropic SDK 依存は各 test 内で mock（test setup 重くしない）
 * - .next / node_modules は除外
 */

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'dist'],
    // 各 server-side module が import 時に require する env を mock。
    // test では実 DB に繋がない、unit test 用のダミー値。
    env: {
      DATABASE_URL: 'postgres://test:test@localhost:5432/test_db',
      AUTH_SECRET: 'test-secret-for-vitest-only-not-for-prod',
      NEXTAUTH_URL: 'http://localhost:3100',
      ANTHROPIC_API_KEY: 'sk-test-dummy-for-vitest',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.spec.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
