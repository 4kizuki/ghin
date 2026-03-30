import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule.js';

export const noUnexportedPropsType = createRule({
  name: 'no-unexported-props-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when a Props type alias is defined but not exported. Prefer inline typing in FunctionComponent<{...}>.',
    },
    messages: {
      unexportedProps:
        "Props type '{{ name }}' is not exported. Prefer inline typing in FunctionComponent<{...}> (YAGNI).",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const propsTypes: TSESTree.TSTypeAliasDeclaration[] = [];
    const exportedNames = new Set<string>();

    return {
      TSTypeAliasDeclaration(node) {
        if (node.id.name.endsWith('Props')) {
          propsTypes.push(node);
        }
      },
      ExportNamedDeclaration(node) {
        if (
          node.declaration &&
          node.declaration.type === 'TSTypeAliasDeclaration'
        ) {
          exportedNames.add(node.declaration.id.name);
        }
        for (const specifier of node.specifiers) {
          if (specifier.local.type === 'Identifier') {
            exportedNames.add(specifier.local.name);
          }
        }
      },
      'Program:exit'() {
        for (const propsType of propsTypes) {
          if (!exportedNames.has(propsType.id.name)) {
            context.report({
              node: propsType.id,
              messageId: 'unexportedProps',
              data: { name: propsType.id.name },
            });
          }
        }
      },
    };
  },
});
