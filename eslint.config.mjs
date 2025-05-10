import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import sonarjs from 'eslint-plugin-sonarjs';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Custom plugin to detect JSX comments
const noJsxCommentsPlugin = {
  rules: {
    'no-jsx-comments': {
      create: function (context) {
        return {
          JSXExpressionContainer(node) {
            if (
              node.expression.type === 'Literal' &&
              typeof node.expression.value === 'string' &&
              node.expression.value.trim().startsWith('*')
            ) {
              context.report({
                node,
                message: 'JSX comments are not allowed',
              });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = [
  // Base configuration for TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { modules: true, jsx: true },
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      sonarjs,
      custom: noJsxCommentsPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true },
      ],
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      sonarjs,
      custom: noJsxCommentsPlugin,
    },
    rules: {
      // JavaScript rules
      'no-unneeded-ternary': ['error', { defaultAssignment: false }],
      'no-nested-ternary': 'error',
      'no-constant-binary-expression': 'error',
      complexity: ['warn', { max: 100 }],
      'max-lines-per-function': [
        'warn',
        { max: 1000, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      'no-unused-vars': 'off',
      'no-inline-comments': 'error',
      'spaced-comment': ['error', 'never'],
      'lines-around-comment': 'error',
      'multiline-comment-style': ['error', 'starred-block'],
      'sonarjs/no-duplicate-string': 'warn',
      'sonarjs/no-identical-functions': 'warn',

      // Custom rules
      'custom/no-jsx-comments': 'error',
    },
  },
];

export default eslintConfig;
