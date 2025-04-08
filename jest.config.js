/** @type {import('jest').Config} */
export default {
  testPathIgnorePatterns: ['/node_modules/', '/local-docs/', '/dist/'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  setupFilesAfterEnv: ['./test/setup.ts'],
  reporters: [
    [
      'jest-silent-reporter',
      {
        useDots: true,
        showPaths: true,
        showInlineStatus: true,
        showWarnings: true,
      },
    ],
  ],
  verbose: true,
};
