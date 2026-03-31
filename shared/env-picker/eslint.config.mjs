import config from '@repo/config/eslint/base';

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...config,
  {
    files: ['**/*.test.ts'],
    rules: {
      '@repo/typescript-convention/no-process-env': 'off',
    },
  },
];

export default eslintConfig;
