import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) =>
    `https://github.com/example/eslint-plugin-react-convention/blob/main/docs/rules/${name}.md`,
);
