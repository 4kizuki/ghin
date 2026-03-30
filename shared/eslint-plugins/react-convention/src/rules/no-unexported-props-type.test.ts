import { RuleTester } from '@typescript-eslint/rule-tester';
import { noUnexportedPropsType } from './no-unexported-props-type.js';
import * as vitest from 'vitest';

RuleTester.afterAll = vitest.afterAll;
RuleTester.describe = vitest.describe;
RuleTester.it = vitest.it;

const ruleTester = new RuleTester();

ruleTester.run('no-unexported-props-type', noUnexportedPropsType, {
  valid: [
    { code: 'export type FooProps = { x: number }' },
    { code: 'type FooProps = { x: number }; export { FooProps }' },
    // not ending with Props → ignored
    { code: 'type Foo = { x: number }' },
  ],
  invalid: [
    {
      code: 'type FooProps = { x: number }',
      errors: [{ messageId: 'unexportedProps' }],
    },
  ],
});
