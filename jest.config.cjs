module.exports = {
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': [
      '@swc/jest',
      {
        jsc: {
          parser: {
            syntax: 'typescript',
            tsx: false,
            decorators: false,
            dynamicImport: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
          },
          target: 'es2022',
          loose: false,
          externalHelpers: false,
        },
        module: {
          type: 'es6',
          noInterop: false,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    // Attempt to ensure @hashgraphonline and @langchain packages are transformed
    '/node_modules/(?!(.*@hashgraphonline/.*)|(.*@langchain/.*)|(.*langchain/.*))',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup-env.ts'],
  collectCoverage: false,
  testTimeout: 60000,
};
