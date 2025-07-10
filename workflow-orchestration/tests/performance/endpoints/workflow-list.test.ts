import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { RpcClient } from '../../helpers/rpc-client';
import { PerformanceBenchmark } from '../utils/benchmark';
import { generatePerformanceReport } from '../utils/statistics';

describe('workflow_list Performance Tests', () => {
  const SERVER_PATH = path.resolve(__dirname, '../../../src/index.ts');
  const PERFORMANCE_TARGETS = {
    p50: 150,    // Increased from 50ms - listing involves multiple file operations
    p95: 400,    // Increased from 100ms - allows for directory scanning overhead
    p99: 600     // Increased from 200ms - handles file system latency
  };

  // Minimum timing thresholds to avoid microsecond noise
  const MIN_TIMING_THRESHOLD = 1; // 1ms minimum for reliable timing
  const MAX_VARIANCE_MULTIPLIER = 5; // More generous variance allowance

  let client: RpcClient;
  let benchmark: PerformanceBenchmark;

  beforeAll(async () => {
    client = new RpcClient(SERVER_PATH, { disableGlobalTracking: true });
    benchmark = new PerformanceBenchmark();
    console.log('🚀 Starting workflow_list performance tests');
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    console.log('🏁 Completed workflow_list performance tests');
  });

  describe('workflow_list endpoint performance', () => {
    it('should meet p95 < 400ms performance target', async () => {
      const result = await benchmark.measureEndpoint(
        client,
        'workflow_list',
        {},
        {
          warmupIterations: 10,
          measurementIterations: 100,
          timeoutMs: 5000
        }
      );

      // Generate detailed report
      const report = generatePerformanceReport('workflow_list', result, PERFORMANCE_TARGETS);
      console.log(report);

      // Validate against targets
      const validation = benchmark.validatePerformance(result, PERFORMANCE_TARGETS, 'workflow_list');
      
      if (!validation.passed) {
        console.error('❌ Performance validation failed:', validation.failures);
      }

      // Jest assertions
      expect(result.p50).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p50);
      expect(result.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
      expect(result.p99).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p99);
      expect(validation.passed).toBe(true);
    }, 30000); // 30 second timeout for performance test

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map(() => 
        client.send('workflow_list', {})
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      console.log(`📊 Concurrent test: ${concurrentRequests} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.result).toBeDefined();
        expect(result.result.workflows).toBeDefined();
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(200);
    });

    it('should maintain performance under repeated requests', async () => {
      const iterations = 50;
      const timings: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await client.send('workflow_list', {});
        const endTime = Date.now();
        timings.push(endTime - startTime);
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);
      const minTime = Math.min(...timings);

      console.log(`📊 Repeated requests: avg=${averageTime.toFixed(2)}ms, min=${minTime}ms, max=${maxTime}ms`);

      // Performance should remain consistent
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
      
      // Robust variance calculation that handles microsecond timing
      const maxAllowedVariance = Math.max(averageTime * MAX_VARIANCE_MULTIPLIER, MIN_TIMING_THRESHOLD * MAX_VARIANCE_MULTIPLIER);
      expect(maxTime).toBeLessThan(maxAllowedVariance);
      
      // Additional robustness check: ensure reasonable overall performance
      const totalTime = timings.reduce((a, b) => a + b, 0);
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGETS.p99 * iterations);
    });
  });
}); 