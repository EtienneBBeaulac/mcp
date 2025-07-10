import path from 'path';
import { RpcClient } from '../../helpers/rpc-client';
import { PerformanceBenchmark } from '../utils/benchmark';
import { generatePerformanceReport } from '../utils/statistics';

describe('workflow_validate Performance Tests', () => {
  const SERVER_PATH = path.resolve(__dirname, '../../../src/index.ts');
  const SAMPLE_WORKFLOW_ID = 'simple-auth-implementation';
  const PERFORMANCE_TARGETS = {
    p50: 50,
    p95: 120,
    p99: 250
  };

  let client: RpcClient;
  let benchmark: PerformanceBenchmark;

  beforeAll(async () => {
    client = new RpcClient(SERVER_PATH);
    benchmark = new PerformanceBenchmark();
    console.log('🚀 Starting workflow_validate performance tests');
  });

  afterAll(async () => {
    if (client) {
      await client.close();
    }
    console.log('🏁 Completed workflow_validate performance tests');
  });

  describe('workflow_validate endpoint performance', () => {
    it('should meet p95 < 120ms performance target', async () => {
      const result = await benchmark.measureEndpoint(
        client,
        'workflow_validate',
        { 
          workflowId: SAMPLE_WORKFLOW_ID,
          stepId: 'prep',
          output: 'Sample step output for validation'
        },
        {
          warmupIterations: 10,
          measurementIterations: 100,
          timeoutMs: 5000
        }
      );

      // Generate detailed report
      const report = generatePerformanceReport('workflow_validate', result, PERFORMANCE_TARGETS);
      console.log(report);

      // Validate against targets
      const validation = benchmark.validatePerformance(result, PERFORMANCE_TARGETS, 'workflow_validate');
      
      if (!validation.passed) {
        console.error('❌ Performance validation failed:', validation.failures);
      }

      // Jest assertions
      expect(result.p50).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p50);
      expect(result.p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p95);
      expect(result.p99).toBeLessThanOrEqual(PERFORMANCE_TARGETS.p99);
      expect(validation.passed).toBe(true);
    });

    it('should handle different output sizes efficiently', async () => {
      const outputSizes = [
        'Short output',
        'Medium length output that contains more detailed information about the step completion',
        'Very long output that simulates a comprehensive step completion report with extensive details, code snippets, explanations, and multiple paragraphs of content that would be typical in a real-world workflow validation scenario where users provide detailed information about their implementation progress'.repeat(3)
      ];

      const timings: number[] = [];
      
      for (const output of outputSizes) {
        const startTime = Date.now();
        const result = await client.send('workflow_validate', {
          workflowId: SAMPLE_WORKFLOW_ID,
          stepId: 'implement',
          output
        });
        const endTime = Date.now();
        
        timings.push(endTime - startTime);
        expect(result.result).toBeDefined();
        console.log(`📊 Output size ${output.length} chars: ${endTime - startTime}ms`);
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`📊 Variable output size test: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms`);

      // Performance should be consistent regardless of output size
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should validate different step types efficiently', async () => {
      const stepTypes = [
        { stepId: 'prep', output: 'Preparation completed successfully' },
        { stepId: 'implement', output: 'Implementation finished with tests' },
        { stepId: 'test', output: 'All tests passing, ready for review' },
        { stepId: 'review', output: 'Code reviewed and approved' }
      ];

      const timings: number[] = [];
      
      for (const step of stepTypes) {
        const startTime = Date.now();
        const result = await client.send('workflow_validate', {
          workflowId: SAMPLE_WORKFLOW_ID,
          ...step
        });
        const endTime = Date.now();
        
        timings.push(endTime - startTime);
        expect(result.result).toBeDefined();
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`📊 Different step types test: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms`);

      // Performance should be consistent across step types
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });

    it('should handle concurrent validation requests', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();
      
      const promises = Array(concurrentRequests).fill(null).map((_, index) => 
        client.send('workflow_validate', {
          workflowId: SAMPLE_WORKFLOW_ID,
          stepId: 'test',
          output: `Validation output ${index + 1} with unique content`
        })
      );

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / concurrentRequests;

      console.log(`📊 Concurrent validation: ${concurrentRequests} requests in ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms)`);

      // All requests should succeed
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.result).toBeDefined();
        expect(result.result.valid).toBeDefined();
      });

      // Average response time should be reasonable
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
    });

    it('should handle malformed validation requests efficiently', async () => {
      const malformedRequests = [
        { workflowId: SAMPLE_WORKFLOW_ID, stepId: '', output: 'valid output' },
        { workflowId: SAMPLE_WORKFLOW_ID, stepId: 'valid-step', output: '' },
        { workflowId: 'non-existent', stepId: 'prep', output: 'valid output' }
      ];

      const timings: number[] = [];
      
      for (const request of malformedRequests) {
        const startTime = Date.now();
        
        try {
          await client.send('workflow_validate', request);
        } catch (error) {
          // Expected to fail for malformed requests
        }
        
        const responseTime = Date.now() - startTime;
        timings.push(responseTime);
      }

      const averageTime = timings.reduce((a, b) => a + b, 0) / timings.length;
      const maxTime = Math.max(...timings);

      console.log(`📊 Malformed requests test: avg=${averageTime.toFixed(2)}ms, max=${maxTime}ms`);

      // Error handling should still be fast
      expect(averageTime).toBeLessThan(PERFORMANCE_TARGETS.p95);
      expect(maxTime).toBeLessThan(PERFORMANCE_TARGETS.p99);
    });
  });
}); 