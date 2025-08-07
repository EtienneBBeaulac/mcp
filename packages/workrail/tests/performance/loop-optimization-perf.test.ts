import { createAppContainer } from '../../src/container';
import { Workflow } from '../../src/types/mcp-types';
import { InMemoryWorkflowStorage } from '../../src/infrastructure/storage/in-memory-storage';

describe('Loop Optimization Performance', () => {
  let container: ReturnType<typeof createAppContainer>;
  let storage: InMemoryWorkflowStorage;

  beforeEach(() => {
    storage = new InMemoryWorkflowStorage();
    container = createAppContainer({ storage });
  });

  describe('Context Size Reduction Benchmarks', () => {
    it('should achieve 60-80% context size reduction for large forEach loops', async () => {
      const workflow: Workflow = {
        id: 'perf-test-workflow',
        name: 'Performance Test Workflow',
        description: 'Benchmark context size reduction',
        version: '1.0.0',
        steps: [
          {
            id: 'large-foreach-loop',
            type: 'loop',
            title: 'Process Large Array',
            loop: {
              type: 'forEach',
              items: 'bigDataArray',
              itemVar: 'item',
              indexVar: 'idx'
            },
            body: {
              id: 'process-item',
              title: 'Process Item',
              prompt: 'Process item {{idx}}: {{item.name}}'
            }
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      // Create large dataset
      const bigDataArray = Array(1000).fill(null).map((_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        description: 'A'.repeat(100),
        metadata: {
          created: new Date().toISOString(),
          tags: ['tag1', 'tag2', 'tag3'],
          properties: { a: 1, b: 2, c: 3 }
        }
      }));

      const context = {
        bigDataArray,
        otherLargeData: Array(500).fill('X'.repeat(50))
      };

      // Measure first iteration (full context)
      const firstIterationResult = await container.workflowService.getNextStep(
        'perf-test-workflow',
        [],
        context
      );
      
      const firstIterationSize = JSON.stringify(firstIterationResult.context).length;

      // Measure second iteration (optimized context)
      const secondIterationResult = await container.workflowService.getNextStep(
        'perf-test-workflow',
        ['process-item'],
        firstIterationResult.context || context
      );
      
      const secondIterationSize = JSON.stringify(secondIterationResult.context).length;

      // Calculate reduction
      const reduction = ((firstIterationSize - secondIterationSize) / firstIterationSize) * 100;

      console.log(`First iteration size: ${(firstIterationSize / 1024).toFixed(2)}KB`);
      console.log(`Second iteration size: ${(secondIterationSize / 1024).toFixed(2)}KB`);
      console.log(`Size reduction: ${reduction.toFixed(2)}%`);

      // Verify reduction is within target range
      expect(reduction).toBeGreaterThanOrEqual(60);
      expect(reduction).toBeLessThanOrEqual(90); // Some overhead is expected

      // Verify essential data is preserved
      expect(secondIterationResult.context).toHaveProperty('item');
      expect(secondIterationResult.context?.item).toHaveProperty('id', 'item-1');
      expect(secondIterationResult.context).toHaveProperty('idx', 1);
    });

    it('should handle multiple concurrent loops efficiently', async () => {
      const workflow: Workflow = {
        id: 'nested-loops-workflow',
        name: 'Nested Loops Workflow',
        description: 'Test optimization with nested loops',
        version: '1.0.0',
        steps: [
          {
            id: 'outer-loop',
            type: 'loop',
            title: 'Outer Loop',
            loop: {
              type: 'forEach',
              items: 'outerItems',
              itemVar: 'outerItem'
            },
            body: [
              {
                id: 'inner-loop',
                type: 'loop',
                title: 'Inner Loop',
                loop: {
                  type: 'forEach',
                  items: 'outerItem.innerItems',
                  itemVar: 'innerItem'
                },
                body: {
                  id: 'process-nested',
                  title: 'Process Nested Item',
                  prompt: 'Process {{outerItem.id}} - {{innerItem}}'
                }
              }
            ]
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      const context = {
        outerItems: Array(10).fill(null).map((_, i) => ({
          id: `outer-${i}`,
          innerItems: Array(100).fill(`inner-${i}`)
        }))
      };

      // Execute several iterations
      const contextSizes: number[] = [];
      let currentContext = context;
      const completed: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await container.workflowService.getNextStep(
          'nested-loops-workflow',
          completed,
          currentContext
        );

        if (result.step) {
          completed.push(result.step.id);
          currentContext = result.context || currentContext;
          contextSizes.push(JSON.stringify(currentContext).length);
        }
      }

      // Verify that context sizes stabilize after first iteration
      expect(contextSizes[0]).toBeGreaterThan(contextSizes[2]); // First is larger
      expect(Math.abs(contextSizes[2] - contextSizes[3])).toBeLessThan(1000); // Subsequent are similar
    });

    it('should measure optimization overhead', async () => {
      const workflow: Workflow = {
        id: 'overhead-test',
        name: 'Overhead Test',
        description: 'Measure processing overhead',
        version: '1.0.0',
        steps: [
          {
            id: 'simple-loop',
            type: 'loop',
            title: 'Simple Loop',
            loop: {
              type: 'for',
              count: 100
            },
            body: {
              id: 'simple-step',
              title: 'Simple Step',
              prompt: 'Step {{currentIteration}}'
            }
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      // Measure with optimization
      const startWith = Date.now();
      for (let i = 0; i < 10; i++) {
        await container.workflowService.getNextStep(
          'overhead-test',
          Array(i).fill('simple-step'),
          {}
        );
      }
      const timeWith = Date.now() - startWith;

      // Create container without optimizer
      const containerWithout = createAppContainer({
        storage,
        loopContextOptimizer: undefined
      });

      // Measure without optimization
      const startWithout = Date.now();
      for (let i = 0; i < 10; i++) {
        await containerWithout.workflowService.getNextStep(
          'overhead-test',
          Array(i).fill('simple-step'),
          {}
        );
      }
      const timeWithout = Date.now() - startWithout;

      console.log(`Time with optimization: ${timeWith}ms`);
      console.log(`Time without optimization: ${timeWithout}ms`);
      console.log(`Overhead: ${((timeWith - timeWithout) / timeWithout * 100).toFixed(2)}%`);

      // Optimization overhead should be minimal (less than 20%)
      expect(timeWith).toBeLessThan(timeWithout * 1.2);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should prevent memory accumulation in long-running loops', async () => {
      const workflow: Workflow = {
        id: 'memory-test',
        name: 'Memory Test',
        description: 'Test memory usage patterns',
        version: '1.0.0',
        steps: [
          {
            id: 'long-loop',
            type: 'loop',
            title: 'Long Running Loop',
            loop: {
              type: 'for',
              count: 1000
            },
            body: {
              id: 'accumulator-step',
              title: 'Accumulator Step',
              prompt: 'Process iteration {{currentIteration}}'
            }
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      // Track context sizes across many iterations
      const sizes: number[] = [];
      let context = { accumulatedData: [] as any[] };
      const completed: string[] = [];

      // Run 50 iterations
      for (let i = 0; i < 50; i++) {
        const result = await container.workflowService.getNextStep(
          'memory-test',
          completed,
          context
        );

        if (result.step) {
          completed.push(result.step.id);
          context = result.context as any || context;
          
          // Simulate accumulation (which should be prevented)
          if (context.accumulatedData) {
            context.accumulatedData.push({ iteration: i, data: 'X'.repeat(100) });
          }
          
          sizes.push(JSON.stringify(context).length);
        }
      }

      // Context size should stabilize, not grow linearly
      const earlyAvg = sizes.slice(5, 10).reduce((a, b) => a + b, 0) / 5;
      const lateAvg = sizes.slice(45, 50).reduce((a, b) => a + b, 0) / 5;

      console.log(`Early average size: ${(earlyAvg / 1024).toFixed(2)}KB`);
      console.log(`Late average size: ${(lateAvg / 1024).toFixed(2)}KB`);

      // Late average should not be significantly larger than early
      expect(lateAvg).toBeLessThan(earlyAvg * 1.5);
    });
  });
});