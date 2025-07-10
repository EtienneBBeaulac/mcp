import { WorkflowNextRequest, WorkflowNextResponse } from '../types/mcp-types';
import { fileWorkflowStorage } from '../workflow/storage';
import { WorkflowNotFoundError } from '../core/error-handler';

export async function workflowNextHandler(
  request: WorkflowNextRequest
): Promise<WorkflowNextResponse> {
  const workflow = fileWorkflowStorage.getWorkflowById(request.params.workflowId);
  if (!workflow) {
    throw new WorkflowNotFoundError(request.params.workflowId);
  }
  const completed = request.params.completedSteps || [];
  const nextStep = workflow.steps.find(step => !completed.includes(step.id)) || null;
  const isComplete = !nextStep;
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      step: nextStep,
      guidance: {
        prompt: nextStep ? nextStep.prompt : 'Workflow complete.',
      },
      isComplete
    }
  };
} 