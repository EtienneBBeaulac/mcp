import { WorkflowGetRequest, WorkflowGetResponse } from '../types/mcp-types';
import { WorkflowNotFoundError } from '../core/error-handler';
import { defaultWorkflowService } from '../services/workflow-service';

export async function workflowGetHandler(
  request: WorkflowGetRequest
): Promise<WorkflowGetResponse> {
  const workflow = await defaultWorkflowService.getWorkflowById(request.params.id);
  if (workflow) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: workflow
    };
  }
  // If not found, throw standardized error
  throw new WorkflowNotFoundError(request.params.id);
} 