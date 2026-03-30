import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/example/eslint-plugin-typescript-convention/blob/main/docs/rules/${name}.md`,
);
