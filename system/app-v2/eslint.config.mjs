import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      // Next.js 16 / React 19 で追加された新ルール
      // 既存コードの対応は別 issue で修正予定（react-hooks v5 系の移行作業）
      // ADR: docs/adr/0015-eslint-react-hooks-migration.md で管理
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
];
