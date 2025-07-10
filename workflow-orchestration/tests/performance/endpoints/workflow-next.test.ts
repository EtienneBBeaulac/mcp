import path from 'path';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { RpcClient } from '../../helpers/rpc-client';
import { PerformanceBenchmark } from '../utils/benchmark';
import { generatePerformanceReport } from '../utils/statistics';

describe('workflow_next Performance Tests', () => {
  const SERVER_PATH = path.resolve(__dirname, '../../../src/index.ts');
  const SAMPLE_WORKFLOW_ID = 'simple-auth-implementation';
  const PERFORMANCE_TARGETS = {
    p50: 100,
    p95: 200,
    p99: 400
  };

  let client: RpcClient;
  let benchmark: PerformanceBenchmark;

  beforeAll(async () => {
    client = new RpcClient(SERVER_PATH);
    benchmark = new PerformanceBenchmark();
    console.log('🚀 Starting workflow_next performance tests');
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    console.log('🏁 Completed workflow_next performance tests');
  });

  describe('workflow_next endpoint performance', () => {
    it('should meet p95 < 200ms performance target', async () => {
      const result = await benchmark.measureEndpoint(
        client,
        'workflow_next',
        { 
          workflowId: SAMPLE_WORKFLOW_ID,
          completedSteps: []
        },
        {
          warmupIterations: 10,
          measurementIterations: 100,
          timeoutMs: 10000
        }
      );

      // Generate detailed report
      const report = generatePerformanceReport('workflow_next', result, PERFORMANCE_TARGETS);
      console.log(report);

      // Validate against targets
      const validation = benchmark.validatePerformance(result, PERFORMANCE_TARGETS, 'workflow_next');
      
      if (!validation.passed) {
        console.error('❌ Performance validation failed:', validation.failures);
      }

      // Jest assertions
      expect(result.p50).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p50);
      expect(result.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
      expect(result.p99).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p99);
      expect(validation.passed).toBe(true);
    });

    it('should handle workflow progression efficiently', async () => {
      // Test performance as workflow progresses through steps
      const progressionStates = [
        { completedSteps: [] },
        { completedSteps: ['prep'] },
        { completedSteps: ['prep', 'implement'] },
        { completedSteps: ['prep', 'implement', 'test'] }
      ];

      const timings: number[] = [];
      
      for (const state of progressionStates) {
        const startTime = Date.now();
        const result = await client.send('workflow_next', {
          workflowId: SAMPLE_WORKFLOW_ID,
          ...state
        });
        const endTime = Date.now();
        
        timings.push(endTime - startTime);
        expect(result.result).toBeDefined();
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`📊 Progression test: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms`);

      // Performance should be consistent across workflow states
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should handle large completed steps arrays efficiently', async () => {
      // Test with many completed steps to simulate long-running workflows
      const manySteps = Array.from({ length: 20 }, (_, i) => `step-${i + 1}`);
      
      const startTime = Date.now();
      const result = await client.send('workflow_next', {
        workflowId: SAMPLE_WORKFLOW_ID,
        completedSteps: manySteps
      });
      const responseTime = Date.now() - startTime;

      console.log(`📊 Large steps array test: ${responseTime}ms with ${manySteps.length} completed steps`);

      expect(result.result).toBeDefined();
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should maintain performance with context data', async () => {
      const largeContext = {
        userInput: 'A'.repeat(1000), // 1KB of data
        sessionData: { userId: '12345', timestamp: Date.now() },
        metadata: { version: '1.0', source: 'test' }
      };

      const startTime = Date.now();
      const result = await client.send('workflow_next', {
        workflowId: SAMPLE_WORKFLOW_ID,
        completedSteps: ['prep'],
        context: largeContext
      });
      const responseTime = Date.now() - startTime;

      console.log(`📊 Large context test: ${responseTime}ms with ${JSON.stringify(largeContext).length} bytes`);

      expect(result.result).toBeDefined();
      expect(responseTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should handle concurrent workflow progression requests', async () => {
      const concurrentRequests = 5;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map((_, index) => 
        client.send('workflow_next', {
          workflowId: SAMPLE_WORKFLOW_ID,
          completedSteps: index % 2 === 0 ? [] : ['prep']
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      console.log(`📊 Concurrent workflow_next: ${concurrentRequests} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.result).toBeDefined();
        expect(result.result.step).toBeDefined();
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
    });
  });
}); 