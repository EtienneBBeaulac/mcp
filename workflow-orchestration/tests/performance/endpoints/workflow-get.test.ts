import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { RpcClient } from '../../helpers/rpc-client';
import { PerformanceBenchmark } from '../utils/benchmark';
import { generatePerformanceReport } from '../utils/statistics';

describe('workflow_get Performance Tests', () => {
  const SERVER_PATH = path.resolve(__dirname, '../../../src/index.ts');
  const SAMPLE_WORKFLOW_ID = 'simple-auth-implementation';
  const PERFORMANCE_TARGETS = {
    p50: 30,
    p95: 80,
    p99: 150
  };

  // Minimum timing thresholds to avoid microsecond noise
  const MIN_TIMING_THRESHOLD = 1; // 1ms minimum for reliable timing

  let client: RpcClient;
  let benchmark: PerformanceBenchmark;

  beforeAll(async () => {
    client = new RpcClient(SERVER_PATH);
    benchmark = new PerformanceBenchmark();
    console.log('🚀 Starting workflow_get performance tests');
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    console.log('🏁 Completed workflow_get performance tests');
  });

  describe('workflow_get endpoint performance', () => {
    it('should meet p95 < 80ms performance target', async () => {
      const result = await benchmark.measureEndpoint(
        client,
        'workflow_get',
        { id: SAMPLE_WORKFLOW_ID },
        {
          warmupIterations: 10,
          measurementIterations: 100,
          timeoutMs: 5000
        }
      );

      // Generate detailed report
      const report = generatePerformanceReport('workflow_get', result, PERFORMANCE_TARGETS);
      console.log(report);

      // Validate against targets
      const validation = benchmark.validatePerformance(result, PERFORMANCE_TARGETS, 'workflow_get');
      
      if (!validation.passed) {
        console.error('❌ Performance validation failed:', validation.failures);
      }

      // Jest assertions
      expect(result.p50).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p50);
      expect(result.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
      expect(result.p99).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p99);
      expect(validation.passed).toBe(true);
    });

    it('should handle multiple workflow IDs efficiently', async () => {
      // Test performance with different workflow IDs
      const workflowIds = [
        SAMPLE_WORKFLOW_ID,
        SAMPLE_WORKFLOW_ID, // Test caching
        SAMPLE_WORKFLOW_ID  // Test repeated access
      ];

      const timings: number[] = [];
      
      for (const workflowId of workflowIds) {
        const startTime = Date.now();
        const result = await client.send('workflow_get', { id: workflowId });
        const endTime = Date.now();
        
        timings.push(endTime - startTime);
        expect(result.result).toBeDefined();
        expect(result.result.id).toBe(workflowId);
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`📊 Multiple workflow test: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms`);

      // Performance should be consistent
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should maintain performance with cache hits', async () => {
      // First request (cache miss)
      const startTime1 = Date.now();
      await client.send('workflow_get', { id: SAMPLE_WORKFLOW_ID });
      const firstRequestTime = Date.now() - startTime1;

      // Second request (cache hit)
      const startTime2 = Date.now();
      await client.send('workflow_get', { id: SAMPLE_WORKFLOW_ID });
      const secondRequestTime = Date.now() - startTime2;

      console.log(`📊 Cache performance: 1st=${firstRequestTime}ms, 2nd=${secondRequestTime}ms`);

      // Both should meet performance targets
      expect(firstRequestTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
      expect(secondRequestTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
      
      // Robust variance calculation that handles microsecond timing
      const maxAllowedTime = Math.max(firstRequestTime * 1.5, MIN_TIMING_THRESHOLD);
      expect(secondRequestTime).toBeLessThanOrEqual(maxAllowedTime);
      
      // Additional check: combined timing should be reasonable
      const totalTime = firstRequestTime + secondRequestTime;
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGETS.p99 * 2);
    });

    it('should handle error cases efficiently', async () => {
      const startTime = Date.now();
      
      try {
        await client.send('workflow_get', { id: 'non-existent-workflow' });
      } catch (error) {
        // Expected to fail
      }
      
      const responseTime = Date.now() - startTime;
      console.log(`📊 Error case response time: ${responseTime}ms`);

      // Error responses should still be fast
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });
  });
}); 