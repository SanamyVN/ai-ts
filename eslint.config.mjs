import { config as baseConfig } from '@sanamyvn/eslint-config';

/** @type {import("eslint").Linter.Config} */
export default [
  ...baseConfig,
  {
    ignores: ['.prettierrc.mjs', 'eslint.config.mjs'],
  },
  {
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
];
