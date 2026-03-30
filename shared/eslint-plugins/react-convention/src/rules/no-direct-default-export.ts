import { createRule } from '../utils/create-rule.js';

export const noDirectDefaultExport = createRule({
  name: 'no-direct-default-export',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow direct default export of function declarations or expressions. Use `const Foo = ...; export default Foo;` instead.',
    },
    messages: {
      noDirectDefault:
        'Do not use `export default function/arrow`. Define as `const` first, then `export default`.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      ExportDefaultDeclaration(node) {
        const { declaration } = node;
        if (
          declaration.type === 'FunctionDeclaration' ||
          declaration.type === 'ArrowFunctionExpression' ||
          declaration.type === 'FunctionExpression'
        ) {
          context.report({
            node,
            messageId: 'noDirectDefault',
          });
        }
      },
    };
  },
});
