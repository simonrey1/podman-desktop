const MUTATING_ARRAY_METHODS = new Set(['copyWithin', 'fill', 'reverse', 'sort', 'splice']);

function sameExpression(left: unknown, right: unknown): boolean {
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') {
    return false;
  }

  const leftNode = left as { type?: string; [key: string]: unknown };
  const rightNode = right as { type?: string; [key: string]: unknown };

  if (leftNode.type !== rightNode.type) {
    return false;
  }

  if (leftNode.type === 'Identifier') {
    return leftNode.name === rightNode.name;
  }

  if (leftNode.type === 'MemberExpression' && rightNode.type === 'MemberExpression') {
    if (leftNode.computed !== rightNode.computed) {
      return false;
    }

    if (!sameExpression(leftNode.object, rightNode.object)) {
      return false;
    }

    if (leftNode.computed) {
      return sameExpression(leftNode.property, rightNode.property);
    }

    const leftProperty = leftNode.property as { type?: string; name?: string };
    const rightProperty = rightNode.property as { type?: string; name?: string };
    return (
      leftProperty.type === 'Identifier' &&
      rightProperty.type === 'Identifier' &&
      leftProperty.name === rightProperty.name
    );
  }

  if (leftNode.type === 'Literal' && rightNode.type === 'Literal') {
    return leftNode.value === rightNode.value;
  }

  return false;
}

type RuleContext = {
  report: (descriptor: { node: unknown; messageId: string }) => void;
};

const noAssignMutatedArrayRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow assigning the result of mutating array methods to the same target',
    },
    schema: [],
    messages: {
      noAssignMutatedArray:
        'Avoid assigning a mutated array back to itself. Use a non-mutating approach or mutate in place without reassignment.',
    },
  },
  create(context: RuleContext) {
    return {
      AssignmentExpression(node: {
        operator?: string;
        left?: unknown;
        right?: {
          type?: string;
          callee?: { type?: string; object?: unknown; property?: { type?: string; name?: string } };
        };
      }) {
        if (
          node.operator !== '=' ||
          node.right?.type !== 'CallExpression' ||
          node.right.callee?.type !== 'MemberExpression'
        ) {
          return;
        }

        const callee = node.right.callee;
        if (callee.property?.type !== 'Identifier' || !MUTATING_ARRAY_METHODS.has(callee.property.name ?? '')) {
          return;
        }

        if (sameExpression(node.left, callee.object)) {
          context.report({ node, messageId: 'noAssignMutatedArray' });
        }
      },
    };
  },
};

export default noAssignMutatedArrayRule;
