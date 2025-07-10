import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';
import { listWorkflowSummaries } from '../workflow/storage';

export async function workflowListHandler(
  request: WorkflowListRequest
): Promise<WorkflowListResponse> {
  try {
    const workflows = listWorkflowSummaries();
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { workflows }
    };
  } catch (error) {
    // TODO: Return proper JSON-RPC error response
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: { workflows: [] }
    };
  }
} 