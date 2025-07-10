// Performance test configuration and constants
export const PERFORMANCE_CONFIG = {
  WARMUP_ITERATIONS: 10,
  MEASUREMENT_ITERATIONS: 100,
  STATISTICAL_ITERATIONS: 200,
  TIMEOUT_MS: 5000,
  MAX_ACCEPTABLE_VARIANCE: 0.3 // 30%
};

export const PERFORMANCE_TARGETS = {
  workflow_list: {
    p50: 50,
    p95: 100,
    p99: 200
  },
  workflow_get: {
    p50: 30,
    p95: 80,
    p99: 150
  },
  workflow_next: {
    p50: 100,
    p95: 200,
    p99: 400
  },
  workflow_validate: {
    p50: 50,
    p95: 120,
    p99: 250
  }
} as const;

export type EndpointName = keyof typeof PERFORMANCE_TARGETS;

// Performance test environment setup
export function setupPerformanceEnvironment() {
  // Set environment variables for performance testing
  process.env['NODE_ENV'] = 'performance';
  process.env['CACHE_TTL'] = '300000'; // 5 minutes cache for consistent performance
  
  console.log('🚀 Performance test environment initialized');
}

export function cleanupPerformanceEnvironment() {
  console.log('🏁 Performance test environment cleanup completed');
} 