import type { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule.js';
import { isPascalCase, returnsJSX } from '../utils/jsx-utils.js';

const FC_NAMES = new Set([
  'FunctionComponent',
  'FC',
  'React.FunctionComponent',
  'React.FC',
]);

const getTypeName = (annotation: TSESTree.TypeNode): string | undefined => {
  if (annotation.type === 'TSTypeReference') {
    const { typeName } = annotation;
    if (typeName.type === 'Identifier') {
      return typeName.name;
    }
    if (
      typeName.type === 'TSQualifiedName' &&
      typeName.left.type === 'Identifier' &&
      typeName.right.type === 'Identifier'
    ) {
      return `${typeName.left.name}.${typeName.right.name}`;
    }
  }
  return undefined;
};

export const requireFcType = createRule({
  name: 'require-fc-type',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require React components to use FunctionComponent type annotation',
    },
    messages: {
      missingFcType:
        "React component '{{ name }}' should be typed with FunctionComponent or FC.",
      wrongFcType:
        "React component '{{ name }}' should use FunctionComponent or FC, not '{{ actual }}'.",
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      VariableDeclarator(node) {
        if (
          node.id.type !== 'Identifier' ||
          !isPascalCase(node.id.name) ||
          !node.init ||
          node.init.type !== 'ArrowFunctionExpression'
        ) {
          return;
        }

        if (!returnsJSX(node.init)) {
          return;
        }

        const { typeAnnotation } = node.id;

        if (!typeAnnotation) {
          context.report({
            node: node.id,
            messageId: 'missingFcType',
            data: { name: node.id.name },
          });
          return;
        }

        const typeName = getTypeName(typeAnnotation.typeAnnotation);

        if (!typeName || !FC_NAMES.has(typeName)) {
          context.report({
            node: node.id,
            messageId: 'wrongFcType',
            data: {
              name: node.id.name,
              actual: typeName ?? typeAnnotation.typeAnnotation.type,
            },
          });
        }
      },
    };
  },
});
