import { WorkflowGetRequest, WorkflowGetResponse } from '../types/mcp-types';

export async function workflowGetHandler(
  request: WorkflowGetRequest
): Promise<WorkflowGetResponse> {
  // TODO: Implement workflow retrieval logic
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      id: '',
      name: '',
      description: '',
      steps: []
    }
  };
} 