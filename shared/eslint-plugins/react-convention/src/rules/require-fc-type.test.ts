import { RuleTester } from '@typescript-eslint/rule-tester';
import { requireFcType } from './require-fc-type.js';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
  defaultFilenames: {
    ts: 'file.tsx',
    tsx: 'file.tsx',
  },
});

ruleTester.run('require-fc-type', requireFcType, {
  valid: [
    { code: 'const Foo: FC = () => <div />' },
    { code: 'const Foo: FunctionComponent = () => <div />' },
    { code: 'const Foo: React.FC = () => <div />' },
    { code: 'const Foo: React.FunctionComponent = () => <div />' },
    { code: 'const Foo: FC<Props> = () => <div />' },
    // non-PascalCase → ignored
    { code: 'const foo = () => <div />' },
    // no JSX → ignored
    { code: 'const Foo = () => 42' },
  ],
  invalid: [
    {
      code: 'const Foo = () => <div />',
      errors: [{ messageId: 'missingFcType' }],
    },
    {
      code: 'const Foo: MyType = () => <div />',
      errors: [{ messageId: 'wrongFcType' }],
    },
  ],
});
