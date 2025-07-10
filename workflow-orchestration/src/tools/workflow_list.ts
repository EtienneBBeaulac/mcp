import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';

export async function workflowListHandler(
  request: WorkflowListRequest
): Promise<WorkflowListResponse> {
  // TODO: Implement workflow listing logic
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: { workflows: [] }
  };
} 