import { createAppContainer } from '../../src/container';
import { Workflow } from '../../src/types/mcp-types';
import { InMemoryWorkflowStorage } from '../../src/infrastructure/storage/in-memory-storage';

describe('Loop Optimization Integration', () => {
  let container: ReturnType<typeof createAppContainer>;
  let storage: InMemoryWorkflowStorage;

  beforeEach(() => {
    storage = new InMemoryWorkflowStorage();
    container = createAppContainer({ storage });
  });

  describe('Progressive Context Disclosure', () => {
    it('should provide full context on first iteration and minimal on subsequent', async () => {
      const workflow: Workflow = {
        id: 'test-workflow',
        name: 'Test Workflow',
        description: 'Test workflow with optimized loop',
        version: '1.0.0',
        steps: [
          {
            id: 'setup',
            title: 'Setup',
            prompt: 'Initialize data'
          },
          {
            id: 'process-loop',
            type: 'loop',
            title: 'Process Items Loop',
            loop: {
              type: 'forEach',
              items: 'dataItems',
              itemVar: 'currentDataItem',
              indexVar: 'itemIndex'
            },
            body: [
              {
                id: 'validate-item',
                title: 'Validate Item',
                prompt: 'Validate {{currentDataItem}} at index {{itemIndex}}'
              },
              {
                id: 'process-item',
                title: 'Process Item',
                prompt: 'Process the validated item'
              }
            ],
            functionDefinitions: [
              {
                name: 'validateFormat',
                definition: 'Check if item matches expected format: { id: string, value: number }'
              }
            ]
          },
          {
            id: 'finish',
            title: 'Finish',
            prompt: 'Complete the workflow'
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      // Initial context with data
      const initialContext = {
        dataItems: [
          { id: 'a', value: 1 },
          { id: 'b', value: 2 },
          { id: 'c', value: 3 }
        ]
      };

      // First call - should get the setup step
      let result = await container.workflowService.getNextStep(
        'test-workflow',
        [],
        initialContext
      );
      expect(result.step?.id).toBe('setup');

      // Second call - first loop iteration, should get full context
      result = await container.workflowService.getNextStep(
        'test-workflow',
        ['setup'],
        initialContext
      );
      
      expect(result.step?.id).toBe('validate-item');
      expect(result.guidance.prompt).toContain('Loop Context');
      expect(result.guidance.prompt).toContain('Iteration: 1');
      expect(result.guidance.prompt).toContain('Total Items: 3');
      expect(result.context).toHaveProperty('currentDataItem');
      expect(result.context?.currentDataItem).toEqual({ id: 'a', value: 1 });

      // Verify full array is in context for first iteration
      expect(result.context).toHaveProperty('dataItems');
      expect(result.context?.dataItems).toHaveLength(3);

      // Third call - still first iteration, second step
      result = await container.workflowService.getNextStep(
        'test-workflow',
        ['setup', 'validate-item'],
        result.context || initialContext
      );
      
      expect(result.step?.id).toBe('process-item');

      // Fourth call - second iteration, should get minimal context
      result = await container.workflowService.getNextStep(
        'test-workflow',
        ['setup', 'validate-item', 'process-item'],
        result.context || initialContext
      );
      
      expect(result.step?.id).toBe('validate-item');
      expect(result.guidance.prompt).toContain('Loop Context');
      expect(result.guidance.prompt).toContain('Iteration: 2');
      expect(result.guidance.prompt).toContain('Refer to the phase overview');
      
      // Should have minimal context
      expect(result.context).toHaveProperty('currentDataItem');
      expect(result.context?.currentDataItem).toEqual({ id: 'b', value: 2 });
      
      // Large array should be minimized or removed
      if (result.context?.dataItems) {
        expect(result.context.dataItems).toHaveLength(1); // Only current item
      }
    });

    it('should skip empty loops entirely', async () => {
      const workflow: Workflow = {
        id: 'empty-loop-workflow',
        name: 'Empty Loop Workflow',
        description: 'Test skipping empty loops',
        version: '1.0.0',
        steps: [
          {
            id: 'start',
            title: 'Start',
            prompt: 'Starting workflow'
          },
          {
            id: 'empty-loop',
            type: 'loop',
            title: 'Process Empty Array',
            loop: {
              type: 'forEach',
              items: 'emptyArray'
            },
            body: {
              id: 'never-executed',
              title: 'Never Executed',
              prompt: 'This should never run'
            }
          },
          {
            id: 'end',
            title: 'End',
            prompt: 'Workflow complete'
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      const context = {
        emptyArray: []
      };

      // First step
      let result = await container.workflowService.getNextStep(
        'empty-loop-workflow',
        [],
        context
      );
      expect(result.step?.id).toBe('start');

      // Second call should skip the empty loop and go to end
      result = await container.workflowService.getNextStep(
        'empty-loop-workflow',
        ['start'],
        context
      );
      expect(result.step?.id).toBe('end');
      
      // Should not have any loop context
      expect(result.context?._currentLoop).toBeUndefined();
    });
  });

  describe('Context Size Reduction', () => {
    it('should significantly reduce context size in subsequent iterations', async () => {
      const workflow: Workflow = {
        id: 'size-test-workflow',
        name: 'Size Test Workflow',
        description: 'Test context size reduction',
        version: '1.0.0',
        steps: [
          {
            id: 'large-loop',
            type: 'loop',
            title: 'Process Large Dataset',
            loop: {
              type: 'forEach',
              items: 'largeDataset'
            },
            body: {
              id: 'process',
              title: 'Process Item',
              prompt: 'Process {{currentItem}}'
            }
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      // Create a large dataset
      const largeDataset = Array(100).fill(null).map((_, i) => ({
        id: i,
        data: 'x'.repeat(1000) // 1KB per item
      }));

      const context = { largeDataset };

      // First iteration
      const firstResult = await container.workflowService.getNextStep(
        'size-test-workflow',
        [],
        context
      );
      
      const firstContextSize = JSON.stringify(firstResult.context).length;

      // Complete first iteration
      const secondResult = await container.workflowService.getNextStep(
        'size-test-workflow',
        ['process'],
        firstResult.context || context
      );
      
      const secondContextSize = JSON.stringify(secondResult.context).length;

      // Second iteration should have significantly smaller context
      expect(secondContextSize).toBeLessThan(firstContextSize * 0.2); // At least 80% reduction
      
      // But should still have the current item
      expect(secondResult.context).toHaveProperty('currentItem');
      expect(secondResult.context?.currentItem).toHaveProperty('id');
    });
  });

  describe('Function DSL Integration', () => {
    it('should include function definitions in appropriate contexts', async () => {
      const workflow: Workflow = {
        id: 'dsl-workflow',
        name: 'DSL Workflow',
        description: 'Test function DSL',
        version: '1.0.0',
        functionDefinitions: [
          {
            name: 'globalValidate',
            definition: 'Validates any item against global rules'
          }
        ],
        steps: [
          {
            id: 'dsl-loop',
            type: 'loop',
            title: 'DSL Loop',
            loop: {
              type: 'for',
              count: 3
            },
            body: {
              id: 'use-functions',
              title: 'Use Functions',
              prompt: 'Apply validation using functions',
              functionReferences: ['globalValidate()']
            },
            functionDefinitions: [
              {
                name: 'loopSpecificProcess',
                definition: 'Process items within this loop context',
                scope: 'loop'
              }
            ]
          }
        ]
      };

      await storage.saveWorkflow(workflow);

      const result = await container.workflowService.getNextStep(
        'dsl-workflow',
        [],
        {}
      );

      // First iteration should include function definitions
      expect(result.step?.id).toBe('use-functions');
      
      // The step should have access to function references
      expect(result.step?.functionReferences).toContain('globalValidate()');
    });
  });
});