import { RuleTester } from '@typescript-eslint/rule-tester';
import { noProcessEnv } from './no-process-env.js';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;

const ruleTester = new RuleTester();

ruleTester.run('no-process-env', noProcessEnv, {
  valid: [{ code: 'const x = process.cwd()' }, { code: 'const x = env.FOO' }],
  invalid: [
    {
      code: 'const x = process.env.FOO',
      errors: [{ messageId: 'noProcessEnv' }],
    },
    {
      code: 'const x = process.env',
      errors: [{ messageId: 'noProcessEnv' }],
    },
  ],
});
