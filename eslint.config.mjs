import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/test-output'],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: '*',
              onlyDependOnLibsWithTags: ['*'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Override or add rules here
    rules: {
      'max-lines': ['error', 400],
      'complexity': ['error', 10],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
      'eqeqeq': ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/no-magic-numbers': ['error', { ignoreEnums: true, ignoreNumericLiteralTypes: true, ignoreReadonlyClassProperties: true, ignore: [-1, 0, 1] }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error'
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', '**/test-setup.ts', '**/e2e/**/*.ts'],
    rules: {
      'max-lines': 'off',
      'max-params': 'off',
      'complexity': 'off',
      'max-lines-per-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-magic-numbers': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
];
