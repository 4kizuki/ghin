import { noProcessEnv } from './rules/no-process-env.js';
import { noTypeAssertion } from './rules/no-type-assertion.js';

const plugin = {
  meta: {
    name: '@repo/eslint-plugin-typescript-convention',
    version: '0.0.0',
  },
  rules: {
    'no-process-env': noProcessEnv,
    'no-type-assertion': noTypeAssertion,
  },
};

const recommended = {
  name: '@repo/typescript-convention/recommended',
  plugins: {
    '@repo/typescript-convention': plugin,
  },
  rules: {
    '@repo/typescript-convention/no-process-env': 'error',
    '@repo/typescript-convention/no-type-assertion': 'error',
  },
} as const;

export default {
  ...plugin,
  configs: {
    recommended,
  },
};
