import config from '@repo/config/eslint/base';

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [{ ignores: ['generated/'] }, ...config];

export default eslintConfig;
