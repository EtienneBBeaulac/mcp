import { WorkflowValidateRequest, WorkflowValidateResponse } from '../types/mcp-types';
import { defaultWorkflowService } from '../services/workflow-service';

export async function workflowValidateHandler(
  request: WorkflowValidateRequest
): Promise<WorkflowValidateResponse> {
  const { valid, issues, suggestions } = await defaultWorkflowService.validateStepOutput(
    request.params.workflowId,
    request.params.stepId,
    request.params.output
  );

  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      valid,
      issues,
      suggestions
    }
  };
} 