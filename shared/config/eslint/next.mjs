import { createRequire } from 'node:module';
import reactConventionPlugin from '@repo/eslint-plugin-react-convention';
import typescriptConventionPlugin from '@repo/eslint-plugin-typescript-convention';

const require = createRequire(import.meta.url);

const coreWebVitalsConfig = require('eslint-config-next/core-web-vitals');

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...coreWebVitalsConfig,

  // Custom plugin recommended presets
  reactConventionPlugin.configs.recommended,
  typescriptConventionPlugin.configs.recommended,

  // Rule 1 supplement: enforce arrow function for components
  {
    files: ['**/*.tsx'],
    rules: {
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
    },
  },

  // Rule 2: named export by default
  {
    files: ['**/*.tsx', '**/*.ts'],
    rules: {
      'import/no-default-export': 'error',
    },
  },

  // Rule 2 exception: Next.js convention files
  {
    files: [
      '**/page.tsx',
      '**/layout.tsx',
      '**/loading.tsx',
      '**/error.tsx',
      '**/not-found.tsx',
      '**/template.tsx',
      '**/default.tsx',
      'next.config.*',
      '*.config.*',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // TypeScript convention rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message:
            'enum は使用禁止。union 型を使うこと。例: type Status = "active" | "inactive"',
        },
      ],
    },
  },

  // env-picker exception: process.env access is allowed inside the env-picker package
  {
    files: ['**/shared/env-picker/**'],
    rules: {
      '@repo/typescript-convention/no-process-env': 'off',
    },
  },
];

export default config;
