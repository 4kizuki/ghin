import { RuleTester } from '@typescript-eslint/rule-tester';
import { noDirectDefaultExport } from './no-direct-default-export.js';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;

const ruleTester = new RuleTester();

ruleTester.run('no-direct-default-export', noDirectDefaultExport, {
  valid: [
    { code: 'const Foo = () => {}; export default Foo;' },
    { code: 'const value = 42; export default value;' },
  ],
  invalid: [
    {
      code: 'export default function foo() {}',
      errors: [{ messageId: 'noDirectDefault' }],
    },
    {
      code: 'export default () => {}',
      errors: [{ messageId: 'noDirectDefault' }],
    },
    {
      code: 'export default function() {}',
      errors: [{ messageId: 'noDirectDefault' }],
    },
  ],
});
