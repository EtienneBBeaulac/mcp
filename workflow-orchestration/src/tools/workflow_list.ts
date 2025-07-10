import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';
import { StorageError } from '../core/error-handler';
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
  } catch (error: any) {
    // Wrap unexpected storage failures in a standardized MCP error
    // so the server can respond with a proper JSON-RPC error object.
    throw new StorageError(
      error?.message || 'Failed to list workflows',
      'listWorkflowSummaries'
    );
  }
} 