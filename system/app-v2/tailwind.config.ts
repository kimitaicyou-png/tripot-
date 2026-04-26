import type { Config } from 'tailwindcss';

/**
 * tripot v2 Tailwind 設定
 *
 * ❄️美冬 設計コンセプト準拠：
 * - shadow-md 以上は物理的に封印（DEFAULT を sm 相当に上書き）
 * - フォント Manrope + Noto Sans JP（Geist 脱却）
 * - 角丸 rounded-2xl 以上禁止
 * - カラーは slate 系統一、濃紺 #1a1f36 廃止
 */

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ❄️美冬 デザインシステム
        ink: {
          DEFAULT: '#0F172A', // slate-900
          mid: '#1E293B',     // slate-800
        },
        muted: '#475569',     // slate-600
        subtle: '#64748B',    // slate-500、グレー最小値
        surface: '#FAFAFA',
        border: '#E2E8F0',
        // KPI色
        'kpi-up': '#16A34A',    // green-600
        'kpi-down': '#DC2626',  // red-600
      },

      fontFamily: {
        // ❄️美冬 選定（Geist 脱却）
        sans: ['Manrope', 'Noto Sans JP', 'sans-serif'],
        serif: ['"Instrument Serif"', '"Noto Serif JP"', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      // shadow-md 以上を封印（DEFAULT を sm 相当に上書き、md 以上は extend で undefined）
      boxShadow: {
        sm: '0 1px 3px rgba(0, 0, 0, 0.04)',
        DEFAULT: '0 1px 3px rgba(0, 0, 0, 0.04)',
      },

      // 角丸：rounded-lg(8px) / rounded-xl(12px) のみ運用
      borderRadius: {
        lg: '8px',
        xl: '12px',
      },

      // モーション
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
