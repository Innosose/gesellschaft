import type { Config } from 'jest'

const config: Config = {
  projects: [
    // Main 프로세스 테스트 (Node 환경)
    {
      displayName: 'main',
      testMatch: ['<rootDir>/tests/main/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.node.json' }],
      },
      moduleNameMapper: {
        '^../shared/constants$': '<rootDir>/src/shared/constants.ts',
        '^../../shared/constants$': '<rootDir>/src/shared/constants.ts',
      },
    },
    // Renderer 프로세스 테스트 (JSDOM 환경)
    {
      displayName: 'renderer',
      testMatch: ['<rootDir>/tests/renderer/**/*.test.{ts,tsx}'],
      testEnvironment: 'jest-environment-jsdom',
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.web.json' }],
      },
      moduleNameMapper: {
        '^../../../shared/constants$': '<rootDir>/src/shared/constants.ts',
        '\\.(css|less|scss)$': '<rootDir>/tests/__mocks__/fileMock.ts',
      },
    },
  ],
  collectCoverageFrom: [
    'src/main/**/*.ts',
    'src/renderer/src/**/*.{ts,tsx}',
    'src/shared/**/*.ts',
    '!src/**/*.d.ts',
  ],
}

export default config
