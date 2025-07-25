import { describe, it, expect, beforeEach } from '@jest/globals';
import { DefaultWorkflowService } from '../../src/application/services/workflow-service';
import { InMemoryWorkflowStorage } from '../../src/infrastructure/storage/in-memory-storage';
import { Workflow, WorkflowStep } from '../../src/types/mcp-types';
import { LoopStep } from '../../src/types/workflow-types';

describe('Loop Execution Integration Tests', () => {
  let service: DefaultWorkflowService;
  let storage: InMemoryWorkflowStorage;

  beforeEach(() => {
    storage = new InMemoryWorkflowStorage();
    service = new DefaultWorkflowService(storage);
  });

  describe('End-to-End Loop Scenarios', () => {
    it('should execute a polling workflow with while loop', async () => {
      const pollingWorkflow: Workflow = {
        id: 'polling-workflow',
        name: 'Polling Workflow',
        description: 'Poll an API until data is ready',
        version: '0.1.0',
        steps: [
          {
            id: 'init',
            title: 'Initialize',
            prompt: 'Set up polling'
          },
          {
            id: 'poll-loop',
            type: 'loop',
            title: 'Poll for Data',
            prompt: 'Poll until data is ready',
            loop: {
              type: 'while',
              condition: { var: 'dataReady', equals: false },
              maxIterations: 10,
              iterationVar: 'pollAttempt'
            },
            body: [
              { id: 'check-api', title: 'Check API', prompt: 'Call API to check status' },
              { id: 'wait', title: 'Wait', prompt: 'Wait before next poll' }
            ]
          } as LoopStep,
          {
            id: 'process-data',
            title: 'Process Data',
            prompt: 'Process the received data'
          }
        ]
      };

      storage.setWorkflows([pollingWorkflow]);

      // Initial context
      let context: any = { dataReady: false, pollData: [] };
      let completedSteps: string[] = [];

      // Start workflow
      let result = await service.getNextStep('polling-workflow', completedSteps, context);
      expect(result.step?.id).toBe('init');
      completedSteps.push('init');

      // First poll iteration
      result = await service.getNextStep('polling-workflow', completedSteps, context);
      expect(result.step?.id).toBe('check-api');
      expect(result.context?.pollAttempt).toBe(1);
      
      // Continue through wait step
      context = result.context || context;
      completedSteps.push('check-api');
      result = await service.getNextStep('polling-workflow', completedSteps, context);
      expect(result.step?.id).toBe('wait');
      
      // Complete first iteration
      context = result.context || context;
      completedSteps.push('wait');

      // Second poll iteration - service clears body steps internally
      result = await service.getNextStep('polling-workflow', completedSteps, context);
      expect(result.step?.id).toBe('check-api');
      expect(result.context?.pollAttempt).toBe(2);

      // Now set data ready and complete the workflow
      context = result.context || context;
      context.dataReady = true;
      
      // Skip to after the loop by marking the loop as complete
      completedSteps = ['init', 'poll-loop'];
      result = await service.getNextStep('polling-workflow', completedSteps, context);
      expect(result.step?.id).toBe('process-data');
    });

    it('should execute a retry workflow with for loop', async () => {
      const retryWorkflow: Workflow = {
        id: 'retry-workflow',
        name: 'Retry Workflow',
        description: 'Retry an operation up to 3 times',
        version: '0.1.0',
        steps: [
          {
            id: 'retry-loop',
            type: 'loop',
            title: 'Retry Operation',
            prompt: 'Retry up to 3 times',
            loop: {
              type: 'for',
              count: 3,
              maxIterations: 5,
              iterationVar: 'attempt'
            },
            body: [
              { id: 'try-operation', title: 'Try Operation', prompt: 'Attempt the operation' },
              { 
                id: 'check-success', 
                title: 'Check Success', 
                prompt: 'Check if operation succeeded',
                runCondition: { var: 'operationFailed', equals: true }
              }
            ]
          } as LoopStep,
          {
            id: 'report-result',
            title: 'Report Result',
            prompt: 'Report final result'
          }
        ]
      };

      storage.setWorkflows([retryWorkflow]);

      let context: any = { operationFailed: true };
      let completedSteps: string[] = [];

      // First attempt
      let result = await service.getNextStep('retry-workflow', completedSteps, context);
      expect(result.step?.id).toBe('try-operation');
      expect(result.context?.attempt).toBe(1);
      completedSteps.push('try-operation');

      result = await service.getNextStep('retry-workflow', completedSteps, context);
      expect(result.step?.id).toBe('check-success'); // Runs because operationFailed is true
      completedSteps.push('check-success');

      // Second attempt - operation succeeds
      context = result.context || context;
      context.operationFailed = false;
      result = await service.getNextStep('retry-workflow', completedSteps, context);
      expect(result.step?.id).toBe('try-operation');
      expect(result.context?.attempt).toBe(2);
      completedSteps = ['try-operation'];

      // check-success should be skipped due to condition
      result = await service.getNextStep('retry-workflow', completedSteps, context);
      expect(result.step?.id).toBe('try-operation'); // Next iteration
      expect(result.context?.attempt).toBe(3);
    });

    it('should process batch data with forEach loop', async () => {
      const batchWorkflow: Workflow = {
        id: 'batch-workflow',
        name: 'Batch Processing',
        description: 'Process items in batches',
        version: '0.1.0',
        steps: [
          {
            id: 'load-data',
            title: 'Load Data',
            prompt: 'Load items to process'
          },
          {
            id: 'process-batch',
            type: 'loop',
            title: 'Process Batch',
            prompt: 'Process each item',
            loop: {
              type: 'forEach',
              items: 'batchItems',
              maxIterations: 100,
              itemVar: 'item',
              indexVar: 'itemIndex'
            },
            body: [
              { id: 'validate-item', title: 'Validate', prompt: 'Validate item' },
              { id: 'transform-item', title: 'Transform', prompt: 'Transform item' },
              { id: 'save-item', title: 'Save', prompt: 'Save processed item' }
            ]
          } as LoopStep,
          {
            id: 'generate-report',
            title: 'Generate Report',
            prompt: 'Generate batch processing report'
          }
        ]
      };

      storage.setWorkflows([batchWorkflow]);

      const items = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];
      let context: any = { batchItems: items, processedCount: 0 };
      let completedSteps: string[] = [];

      // Load data
      let result = await service.getNextStep('batch-workflow', completedSteps, context);
      expect(result.step?.id).toBe('load-data');
      completedSteps.push('load-data');

      // Process first item
      result = await service.getNextStep('batch-workflow', completedSteps, context);
      expect(result.step?.id).toBe('validate-item');
      expect(result.context?.item).toEqual({ id: 1, name: 'Item 1' });
      expect(result.context?.itemIndex).toBe(0);
      context = result.context || context;
      completedSteps.push('validate-item');

      result = await service.getNextStep('batch-workflow', completedSteps, context);
      expect(result.step?.id).toBe('transform-item');
      completedSteps.push('transform-item');

      result = await service.getNextStep('batch-workflow', completedSteps, context);
      expect(result.step?.id).toBe('save-item');
      completedSteps.push('save-item');

      // Should move to second item
      context = result.context || context;
      context.processedCount++;
      result = await service.getNextStep('batch-workflow', completedSteps, context);
      expect(result.step?.id).toBe('validate-item');
      expect(result.context?.item).toEqual({ id: 2, name: 'Item 2' });
      expect(result.context?.itemIndex).toBe(1);
    });

    it('should handle search workflow with until loop', async () => {
      const searchWorkflow: Workflow = {
        id: 'search-workflow',
        name: 'Search Workflow',
        description: 'Search until target found',
        version: '0.1.0',
        steps: [
          {
            id: 'search-loop',
            type: 'loop',
            title: 'Search Loop',
            prompt: 'Search until found',
            loop: {
              type: 'until',
              condition: { var: 'targetFound', equals: true },
              maxIterations: 20
            },
            body: 'search-next'
          } as LoopStep,
          { 
            id: 'search-next', 
            title: 'Search Next Location', 
            prompt: 'Search in next location'
          },
          {
            id: 'process-result',
            title: 'Process Result',
            prompt: 'Process search result'
          }
        ]
      };

      storage.setWorkflows([searchWorkflow]);

      let context: any = { targetFound: false, searchIndex: 0 };
      let completedSteps: string[] = [];

      // Search iterations
      for (let i = 0; i < 3; i++) {
        let result = await service.getNextStep('search-workflow', completedSteps, context);
        expect(result.step?.id).toBe('search-next');
        context = result.context || context;
        context.searchIndex++;
        
        if (i === 2) {
          context.targetFound = true; // Found on third search
        }
        
        completedSteps = ['search-next'];
      }

      // Should exit loop and process result
      let result = await service.getNextStep('search-workflow', completedSteps, context);
      expect(result.step?.id).toBe('process-result');
    });
  });

  describe('Loop Limits and Safety', () => {
    it('should respect max iterations limit', async () => {
      const infiniteWorkflow: Workflow = {
        id: 'infinite-workflow',
        name: 'Infinite Loop Test',
        description: 'Test max iterations safety',
        version: '0.1.0',
        steps: [
          {
            id: 'infinite-loop',
            type: 'loop',
            title: 'Infinite Loop',
            prompt: 'Loop forever',
            loop: {
              type: 'while',
              condition: { var: 'alwaysTrue', equals: true },
              maxIterations: 3
            },
            body: 'increment'
          } as LoopStep,
          { 
            id: 'increment', 
            title: 'Increment', 
            prompt: 'Increment counter'
          },
          {
            id: 'after-loop',
            title: 'After Loop',
            prompt: 'Should reach here after max iterations'
          }
        ]
      };

      storage.setWorkflows([infiniteWorkflow]);

      let context: any = { alwaysTrue: true, counter: 0 };
      let completedSteps: string[] = [];

      // Execute iterations and track what happens
      let lastResult;
      let executedIterations = 0;
      
      // Keep executing until we're not in the loop anymore
      while (executedIterations < 10) { // Safety limit
        lastResult = await service.getNextStep('infinite-workflow', completedSteps, context);
        
        if (lastResult.step?.id === 'increment') {
          executedIterations++;
          context = lastResult.context || context;
          context.counter++;
          completedSteps = ['increment'];
        } else if (lastResult.step?.id === 'after-loop') {
          // Successfully exited the loop
          break;
        } else {
          // Unexpected step
          break;
        }
      }

      // Should have executed exactly 3 iterations (maxIterations)
      expect(executedIterations).toBe(3);
      expect(lastResult!.step?.id).toBe('after-loop');
      
      // Check for warning from the loop state  
      if (lastResult!.context?._warnings?.loops?.['infinite-loop']) {
        expect(lastResult!.context._warnings.loops['infinite-loop'][0]).toContain('Maximum iterations');
      }
    });

    it('should handle context size limits', async () => {
      const contextGrowthWorkflow: Workflow = {
        id: 'context-growth-workflow',
        name: 'Context Growth Test',
        description: 'Test context size monitoring',
        version: '0.1.0',
        steps: [
          {
            id: 'grow-loop',
            type: 'loop',
            title: 'Growing Context Loop',
            prompt: 'Loop that grows context',
            loop: {
              type: 'for',
              count: 100,
              maxIterations: 100
            },
            body: 'add-data'
          } as LoopStep,
          { 
            id: 'add-data', 
            title: 'Add Data', 
            prompt: 'Add large data to context'
          }
        ]
      };

      storage.setWorkflows([contextGrowthWorkflow]);

      // Create a large string (10KB)
      const largeString = 'x'.repeat(10 * 1024);
      let context: any = { data: [] };
      let completedSteps: string[] = [];

      // Execute until warning threshold
      let warningFound = false;
      for (let i = 0; i < 25; i++) {
        try {
          let result = await service.getNextStep('context-growth-workflow', completedSteps, context);
          context = result.context || context;
          
          // Simulate adding data
          context.data.push(largeString);
          
          if (result.context?._warnings?.contextSize) {
            warningFound = true;
            expect(result.context._warnings.contextSize[0]).toContain('exceeds 80% of maximum');
            break;
          }
          
          completedSteps = ['add-data'];
        } catch (error: any) {
          // Should throw error if context exceeds max size during loop
          expect(error.message).toContain('exceeds maximum allowed size');
          break;
        }
      }

      expect(warningFound).toBe(true);
    });
  });

  describe('Nested Workflow Patterns', () => {
    it('should handle workflow with multiple sequential loops', async () => {
      const multiLoopWorkflow: Workflow = {
        id: 'multi-loop-workflow',
        name: 'Multiple Loops',
        description: 'Workflow with sequential loops',
        version: '0.1.0',
        steps: [
          {
            id: 'prep-loop',
            type: 'loop',
            title: 'Preparation Loop',
            prompt: 'Prepare items',
            loop: {
              type: 'for',
              count: 2,
              maxIterations: 10
            },
            body: 'prepare'
          } as LoopStep,
          { 
            id: 'prepare', 
            title: 'Prepare', 
            prompt: 'Prepare item'
          },
          {
            id: 'process-loop',
            type: 'loop',
            title: 'Process Loop',
            prompt: 'Process prepared items',
            loop: {
              type: 'forEach',
              items: 'preparedItems',
              maxIterations: 10,
              itemVar: 'prepItem'
            },
            body: 'process-prepared'
          } as LoopStep,
          { 
            id: 'process-prepared', 
            title: 'Process Prepared', 
            prompt: 'Process prepared item'
          },
          {
            id: 'cleanup-loop',
            type: 'loop',
            title: 'Cleanup Loop',
            prompt: 'Clean up',
            loop: {
              type: 'while',
              condition: { var: 'needsCleanup', equals: true },
              maxIterations: 5
            },
            body: 'cleanup'
          } as LoopStep,
          { 
            id: 'cleanup', 
            title: 'Cleanup', 
            prompt: 'Perform cleanup'
          },
          {
            id: 'complete',
            title: 'Complete',
            prompt: 'All done'
          }
        ]
      };

      storage.setWorkflows([multiLoopWorkflow]);

      let context: any = { preparedItems: ['A', 'B'], needsCleanup: true };
      
      // Track execution sequence
      const executionSequence: string[] = [];
      let completedSteps: string[] = [];
      let stepCount = 0;
      const maxSteps = 20; // Safety limit
      
      // Execute workflow and track all steps
      while (stepCount < maxSteps) {
        const result = await service.getNextStep('multi-loop-workflow', completedSteps, context);
        
        if (result.isComplete) {
          break;
        }
        
        if (result.step) {
          executionSequence.push(result.step.id);
          context = result.context || context;
          
          // Update context based on step
          if (result.step.id === 'cleanup' && stepCount > 5) {
            // After some iterations, stop cleanup
            context.needsCleanup = false;
          }
          
          // Add to completed
          if (!completedSteps.includes(result.step.id)) {
            completedSteps.push(result.step.id);
          }
        }
        
        stepCount++;
      }
      
      // Verify we executed all three loops
      expect(executionSequence).toContain('prepare');
      expect(executionSequence).toContain('process-prepared');
      expect(executionSequence).toContain('cleanup');
      expect(executionSequence[executionSequence.length - 1]).toBe('complete');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid loop configurations gracefully', async () => {
      const invalidWorkflow: Workflow = {
        id: 'invalid-loop-workflow',
        name: 'Invalid Loop',
        description: 'Workflow with invalid loop',
        version: '0.1.0',
        steps: [
          {
            id: 'bad-loop',
            type: 'loop',
            title: 'Bad Loop',
            prompt: 'Invalid loop config',
            loop: {
              type: 'while',
              // Missing required condition for while loop
              maxIterations: 10
            } as any,
            body: 'step'
          } as LoopStep,
          { id: 'step', title: 'Step', prompt: 'Step' }
        ]
      };

      storage.setWorkflows([invalidWorkflow]);

      await expect(
        service.getNextStep('invalid-loop-workflow', [], {})
      ).rejects.toThrow('Invalid workflow structure');
    });

    it('should handle missing forEach items gracefully', async () => {
      const missingItemsWorkflow: Workflow = {
        id: 'missing-items-workflow',
        name: 'Missing Items',
        description: 'ForEach with missing items',
        version: '0.1.0',
        steps: [
          {
            id: 'foreach-loop',
            type: 'loop',
            title: 'ForEach Loop',
            prompt: 'Process items',
            loop: {
              type: 'forEach',
              items: 'missingVariable',
              maxIterations: 10
            },
            body: 'process'
          } as LoopStep,
          { id: 'process', title: 'Process', prompt: 'Process item' },
          { id: 'done', title: 'Done', prompt: 'Complete' }
        ]
      };

      storage.setWorkflows([missingItemsWorkflow]);

      let result = await service.getNextStep('missing-items-workflow', [], {});
      
      // Should skip the loop and continue
      expect(result.step?.id).toBe('done');
      expect(result.context?._warnings?.loops?.['foreach-loop']).toBeDefined();
    });
  });
}); 