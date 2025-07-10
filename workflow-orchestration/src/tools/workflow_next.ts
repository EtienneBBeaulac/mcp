import { WorkflowNextRequest, WorkflowNextResponse, WorkflowStep } from '../types/mcp-types';

export async function workflowNextHandler(
  request: WorkflowNextRequest
): Promise<WorkflowNextResponse> {
  // TODO: Implement workflow next-step guidance logic
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      step: null,
      guidance: {
        prompt: '',
      },
      isComplete: false
    }
  };
} 