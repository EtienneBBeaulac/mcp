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

const mockWorkflowWithAgentRole: Workflow = {
  id: 'test-workflow-agent-role',
  name: 'Test Workflow with Agent Role',
  description: 'A workflow for testing agentRole functionality.',
  version: '0.0.1',
  steps: [
    { 
      id: 'step1', 
      title: 'Step 1', 
      prompt: 'User-facing prompt for step 1',
      agentRole: 'You are a helpful coding assistant. Focus on best practices.'
    },
    {
      id: 'step2',
      title: 'Step 2',
      prompt: 'User-facing prompt for step 2',
      agentRole: 'Act as a code reviewer. Be thorough and constructive.',
      guidance: ['Check for bugs', 'Verify style guidelines'],
    },
    { 
      id: 'step3', 
      title: 'Step 3', 
      prompt: 'User-facing prompt for step 3'
      // No agentRole - should work normally
    },
    {
      id: 'step4',
      title: 'Step 4',
      prompt: 'User-facing prompt for step 4',
      agentRole: '', // Empty agentRole should be handled gracefully
      guidance: ['Handle empty agentRole']
    },
  ],
};

const mockStorage: IWorkflowStorage = {
  getWorkflowById: async (id: string): Promise<Workflow | null> => {
    if (id === mockWorkflow.id) {
      return Promise.resolve(mockWorkflow);
    }
    if (id === mockWorkflowWithAgentRole.id) {
      return Promise.resolve(mockWorkflowWithAgentRole);
    }
    return Promise.resolve(null);
  },
  listWorkflowSummaries: async (): Promise<WorkflowSummary[]> => {
    return Promise.resolve([]);
  },
  loadAllWorkflows: async (): Promise<Workflow[]> => {
    return Promise.resolve([mockWorkflow, mockWorkflowWithAgentRole]);
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

  describe('getNextStep with agentRole', () => {
    it('should include agentRole instructions at the top of guidance prompt', async () => {
      const result = await service.getNextStep('test-workflow-agent-role', []);
      expect(result.step?.id).toBe('step1');
      expect(result.step?.agentRole).toBe('You are a helpful coding assistant. Focus on best practices.');
      
      const expectedPrompt = 
        '## Agent Role Instructions\n' +
        'You are a helpful coding assistant. Focus on best practices.\n\n' +
        'User-facing prompt for step 1';
      expect(result.guidance.prompt).toBe(expectedPrompt);
      expect(result.isComplete).toBe(false);
    });

    it('should include agentRole with guidance when both are present', async () => {
      const result = await service.getNextStep('test-workflow-agent-role', ['step1']);
      expect(result.step?.id).toBe('step2');
      expect(result.step?.agentRole).toBe('Act as a code reviewer. Be thorough and constructive.');
      
      const expectedPrompt = 
        '## Agent Role Instructions\n' +
        'Act as a code reviewer. Be thorough and constructive.\n\n' +
        '## Step Guidance\n' +
        '- Check for bugs\n' +
        '- Verify style guidelines\n\n' +
        'User-facing prompt for step 2';
      expect(result.guidance.prompt).toBe(expectedPrompt);
    });

    it('should work normally for steps without agentRole', async () => {
      const result = await service.getNextStep('test-workflow-agent-role', ['step1', 'step2']);
      expect(result.step?.id).toBe('step3');
      expect(result.step?.agentRole).toBeUndefined();
      expect(result.guidance.prompt).toBe('User-facing prompt for step 3');
      expect(result.guidance.prompt).not.toContain('Agent Role Instructions');
    });

    it('should handle empty agentRole gracefully', async () => {
      const result = await service.getNextStep('test-workflow-agent-role', ['step1', 'step2', 'step3']);
      expect(result.step?.id).toBe('step4');
      expect(result.step?.agentRole).toBe('');
      
      // Empty agentRole should not add the Agent Role Instructions header
      const expectedPrompt = 
        '## Step Guidance\n' +
        '- Handle empty agentRole\n\n' +
        'User-facing prompt for step 4';
      expect(result.guidance.prompt).toBe(expectedPrompt);
      expect(result.guidance.prompt).not.toContain('Agent Role Instructions');
    });

    it('should maintain backward compatibility with existing workflows', async () => {
      // Test that the original workflow still works exactly as before
      const result = await service.getNextStep('test-workflow', []);
      expect(result.step?.id).toBe('step1');
      expect(result.step?.agentRole).toBeUndefined();
      expect(result.guidance.prompt).toBe('Prompt for step 1');
      expect(result.guidance.prompt).not.toContain('Agent Role Instructions');
    });
  });
}); 