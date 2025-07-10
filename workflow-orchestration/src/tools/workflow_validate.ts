import { WorkflowValidateRequest, WorkflowValidateResponse } from '../types/mcp-types';
import { fileWorkflowStorage } from '../workflow/storage';
import { WorkflowNotFoundError, StepNotFoundError } from '../core/error-handler';

export async function workflowValidateHandler(
  request: WorkflowValidateRequest
): Promise<WorkflowValidateResponse> {
  const workflow = fileWorkflowStorage.getWorkflowById(request.params.workflowId);
  if (!workflow) {
    throw new WorkflowNotFoundError(request.params.workflowId);
  }
  const step = workflow.steps.find(s => s.id === request.params.stepId);
  if (!step) {
    throw new StepNotFoundError(request.params.stepId, request.params.workflowId);
  }
  // TODO: Implement real output validation logic
  // For now, just check that output is a non-empty string
  const valid = typeof request.params.output === 'string' && request.params.output.trim().length > 0;
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      valid,
      issues: valid ? [] : ['Output is empty or invalid.'],
      suggestions: valid ? [] : ['Provide a non-empty output.']
    }
  };
} 