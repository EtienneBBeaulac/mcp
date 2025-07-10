import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';
import { fileWorkflowStorage } from '../workflow/storage';

export async function workflowListHandler(
  request: WorkflowListRequest
): Promise<WorkflowListResponse> {
  try {
    const workflows = fileWorkflowStorage.listWorkflowSummaries();
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