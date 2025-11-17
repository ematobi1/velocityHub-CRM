module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js',
    '**/*.spec.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
