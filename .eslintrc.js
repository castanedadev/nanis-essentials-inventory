module.exports = {
  extends: ['react-app', 'react-app/jest', 'prettier'],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    // Disable console warnings in development
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    // Enforce consistent return statements (warn instead of error for flexibility)
    'consistent-return': 'warn',
    // Prefer const over let when possible
    'prefer-const': 'error',
    // Require === instead of ==
    eqeqeq: ['error', 'always'],
    // Disallow unused variables except for arguments with underscore prefix
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Enforce consistent spacing
    'object-curly-spacing': ['error', 'always'],
    // Enforce semicolons
    semi: ['error', 'always'],
    // Enforce single quotes
    quotes: ['error', 'single'],
    // React specific rules
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    // Testing Library rules
    'testing-library/prefer-screen-queries': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        // Allow console.log in tests
        'no-console': 'off',
      },
    },
  ],
};
