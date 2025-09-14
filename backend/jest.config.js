/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|js)',
    '**/*.(test|spec).(ts|js)'
  ],
  
  // TypeScript configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module resolution
  moduleFileExtensions: ['ts', 'js', 'json'],
  
  // Coverage configuration
  collectCoverage: false, // Disable initially
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/config/database.ts',
    '!src/__tests__/**',
    '!src/scripts/**'
  ],
  
  // Coverage thresholds (disabled initially)
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 70,
  //     lines: 70,
  //     statements: 70
  //   }
  // },
  
  // Setup and teardown (disabled to avoid database issues)
  // setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Test timeout
  testTimeout: 30000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true
};
