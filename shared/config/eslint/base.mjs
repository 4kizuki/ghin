import importPlugin from 'eslint-plugin-import';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';
import typescriptEslintParser from '@typescript-eslint/parser';
import typescriptConventionPlugin from '@repo/eslint-plugin-typescript-convention';

/** @type {import("eslint").Linter.Config[]} */
const config = [
  // Custom plugin recommended presets
  typescriptConventionPlugin.configs.recommended,

  // Rule 2: named export by default
  {
    files: ['**/*.tsx', '**/*.ts'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-default-export': 'error',
    },
  },

  // TypeScript convention rules
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptEslintParser,
    },
    plugins: {
      '@typescript-eslint': typescriptEslintPlugin,
    },
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

  // Test files exception: allow type assertions in test files
  {
    files: [
      '**/tests/**',
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
    ],
    rules: {
      '@repo/typescript-convention/no-type-assertion': 'off',
    },
  },

  // Config files exception: allow default exports
  {
    files: ['*.config.ts', '*.config.mjs', '*.config.js'],
    rules: {
      'import/no-default-export': 'off',
    },
  },

  // Ignore dist directory
  {
    ignores: ['**/dist/**'],
  },
];

export default config;
