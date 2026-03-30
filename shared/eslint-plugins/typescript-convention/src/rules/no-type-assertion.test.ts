import { RuleTester } from '@typescript-eslint/rule-tester';
import { noTypeAssertion } from './no-type-assertion.js';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;

const ruleTester = new RuleTester();

ruleTester.run('no-type-assertion', noTypeAssertion, {
  valid: [
    { code: 'const x = [1, 2, 3] as const' },
    { code: 'const x: number = 42' },
  ],
  invalid: [
    {
      code: 'const x = foo as string',
      errors: [{ messageId: 'noTypeAssertion' }],
    },
    {
      code: 'const x = foo as unknown',
      errors: [{ messageId: 'noTypeAssertion' }],
    },
  ],
});
