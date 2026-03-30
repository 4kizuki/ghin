import type { TSESTree } from '@typescript-eslint/utils';

export const isPascalCase = (name: string): boolean =>
  /^[A-Z][a-zA-Z0-9]*$/.test(name);

export const returnsJSX = (node: TSESTree.ArrowFunctionExpression): boolean => {
  const { body } = node;

  if (body.type === 'JSXElement' || body.type === 'JSXFragment') {
    return true;
  }

  if (body.type === 'BlockStatement') {
    return body.body.some(
      (stmt) =>
        stmt.type === 'ReturnStatement' &&
        stmt.argument !== null &&
        stmt.argument !== undefined &&
        (stmt.argument.type === 'JSXElement' ||
          stmt.argument.type === 'JSXFragment' ||
          (stmt.argument.type === 'ConditionalExpression' &&
            (stmt.argument.consequent.type === 'JSXElement' ||
              stmt.argument.consequent.type === 'JSXFragment' ||
              stmt.argument.alternate.type === 'JSXElement' ||
              stmt.argument.alternate.type === 'JSXFragment')) ||
          (stmt.argument.type === 'LogicalExpression' &&
            (stmt.argument.right.type === 'JSXElement' ||
              stmt.argument.right.type === 'JSXFragment'))),
    );
  }

  return false;
};
