import { requireFcType } from './rules/require-fc-type.js';
import { noDirectDefaultExport } from './rules/no-direct-default-export.js';
import { noUnexportedPropsType } from './rules/no-unexported-props-type.js';

const plugin = {
  meta: {
    name: '@repo/eslint-plugin-react-convention',
    version: '0.0.0',
  },
  rules: {
    'require-fc-type': requireFcType,
    'no-direct-default-export': noDirectDefaultExport,
    'no-unexported-props-type': noUnexportedPropsType,
  },
};

const recommended = {
  name: '@repo/react-convention/recommended',
  plugins: {
    '@repo/react-convention': plugin,
  },
  rules: {
    '@repo/react-convention/require-fc-type': 'error',
    '@repo/react-convention/no-direct-default-export': 'error',
    '@repo/react-convention/no-unexported-props-type': 'warn',
  },
} as const;

export default {
  ...plugin,
  configs: {
    recommended,
  },
};
