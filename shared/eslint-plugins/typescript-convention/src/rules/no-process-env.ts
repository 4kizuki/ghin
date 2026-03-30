import { createRule } from '../utils/create-rule.js';

export const noProcessEnv = createRule({
  name: 'no-process-env',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow direct access to `process.env`. Use `@repo/env-picker` with runtime injection instead.',
    },
    messages: {
      noProcessEnv:
        '`process.env` の直接参照は禁止。`@repo/env-picker` の `EnvRequirementCollector` を使うこと。',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      MemberExpression(node) {
        if (
          node.object.type === 'Identifier' &&
          node.object.name === 'process' &&
          node.property.type === 'Identifier' &&
          node.property.name === 'env'
        ) {
          context.report({
            node,
            messageId: 'noProcessEnv',
          });
        }
      },
    };
  },
});
