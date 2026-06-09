import { Linter } from 'eslint';
import { describe, expect, test } from 'vitest';

import noAssignMutatedArrayRule from './no-assign-mutated-array-rule';

function verify(code: string) {
  const linter = new Linter();
  return linter.verify(
    code,
    {
      languageOptions: {
        ecmaVersion: 2022,
      },
      plugins: {
        'podman-desktop-local': {
          rules: {
            'no-assign-mutated-array': noAssignMutatedArrayRule as never,
          },
        },
      },
      rules: {
        'podman-desktop-local/no-assign-mutated-array': 'error',
      },
    },
    'test.js',
  );
}

describe('no-assign-mutated-array-rule', () => {
  test('reports assignment of a mutated array to itself', () => {
    const messages = verify('data = data.sort((a, b) => a - b);');
    expect(messages).toHaveLength(1);
    expect(messages[0]?.ruleId).toBe('podman-desktop-local/no-assign-mutated-array');
  });

  test('reports member expression assignment to itself', () => {
    const messages = verify('obj.items = obj.items.reverse();');
    expect(messages).toHaveLength(1);
  });

  test('allows in-place mutation without reassignment', () => {
    const messages = verify('data.sort((a, b) => a - b);');
    expect(messages).toHaveLength(0);
  });

  test('allows assigning from a different array expression', () => {
    const messages = verify('data = [...data].sort((a, b) => a - b);');
    expect(messages).toHaveLength(0);
  });
});
