import { createRule } from '../utils/create-rule.js';

export const noTypeAssertion = createRule({
  name: 'no-type-assertion',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow type assertions (`as`) except `as const`. Use runtime validation (e.g. zod) instead.',
    },
    messages: {
      noTypeAssertion:
        '`as` による型アサーションは禁止。zod などのランタイムバリデーションを使うこと。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAsExpression(node) {
        if (
          node.typeAnnotation.type === 'TSTypeReference' &&
          node.typeAnnotation.typeName.type === 'Identifier' &&
          node.typeAnnotation.typeName.name === 'const'
        ) {
          return;
        }

        context.report({
          node,
          messageId: 'noTypeAssertion',
        });
      },
    };
  },
});
