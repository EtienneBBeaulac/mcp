import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DefaultWorkflowService } from '../../src/application/services/workflow-service';
import { IWorkflowStorage } from '../../src/types/storage';
import { Workflow, WorkflowSummary } from '../../src/types/mcp-types';

const mockWorkflow: Workflow = {
  id: 'test-workflow',
  name: 'Test Workflow',
  description: 'A workflow for testing.',
      version: '0.0.1',
  steps: [
    { id: 'step1', title: 'Step 1', prompt: 'Prompt for step 1' },
    {
      id: 'step2',
      title: 'Step 2',
      prompt: 'Prompt for step 2',
      guidance: ['Guidance 1 for step 2', 'Guidance 2 for step 2'],
    },
    { id: 'step3', title: 'Step 3', prompt: 'Prompt for step 3' },
  ],
};

const mockStorage: IWorkflowStorage = {
  getWorkflowById: async (id: string): Promise<Workflow | null> => {
    if (id === mockWorkflow.id) {
      return Promise.resolve(mockWorkflow);
    }
    return Promise.resolve(null);
  },
  listWorkflowSummaries: async (): Promise<WorkflowSummary[]> => {
    return Promise.resolve([]);
  },
  loadAllWorkflows: async (): Promise<Workflow[]> => {
    return Promise.resolve([mockWorkflow]);
  },
};

describe('DefaultWorkflowService', () => {
  let service: DefaultWorkflowService;

  beforeEach(() => {
    service = new DefaultWorkflowService(mockStorage);
    jest.clearAllMocks();
  });

  describe('getNextStep', () => {
    it('should return the first step if no steps are completed', async () => {
      const result = await service.getNextStep('test-workflow', []);
      expect(result.step?.id).toBe('step1');
      expect(result.guidance.prompt).toBe('Prompt for step 1');
      expect(result.isComplete).toBe(false);
    });

    it('should return the next step based on completed steps', async () => {
      const result = await service.getNextStep('test-workflow', ['step1']);
      expect(result.step?.id).toBe('step2');
    });

    it('should prepend guidance to the prompt if it exists', async () => {
      const result = await service.getNextStep('test-workflow', ['step1']);
      const expectedPrompt =
        '## Step Guidance\n- Guidance 1 for step 2\n- Guidance 2 for step 2\n\nPrompt for step 2';
      expect(result.guidance.prompt).toBe(expectedPrompt);
    });

    it('should not prepend guidance if it does not exist', async () => {
      const result = await service.getNextStep('test-workflow', ['step1', 'step2']);
      expect(result.step?.id).toBe('step3');
      expect(result.guidance.prompt).toBe('Prompt for step 3');
    });

    it('should indicate completion when all steps are done', async () => {
      const result = await service.getNextStep('test-workflow', ['step1', 'step2', 'step3']);
      expect(result.step).toBeNull();
      expect(result.isComplete).toBe(true);
      expect(result.guidance.prompt).toBe('Workflow complete.');
    });
  });
}); 