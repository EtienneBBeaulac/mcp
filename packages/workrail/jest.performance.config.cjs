module.exports = {
  ...require('./jest.config.cjs'),
  testMatch: ['**/tests/performance/**/*.test.ts'],
  testTimeout: 60000, // 60 seconds for performance tests
  setupFilesAfterEnv: ['<rootDir>/tests/performance/setup.ts'],
  reporters: [
    'default'
  ],
  // Performance tests should run in band to avoid resource contention
  maxWorkers: 1,
  // Don't collect coverage for performance tests
  collectCoverage: false,
  // Increase memory limits for performance tests
  workerIdleMemoryLimit: '1GB'
}; 