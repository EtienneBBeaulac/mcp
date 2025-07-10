import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';
import { defaultWorkflowService } from '../services/workflow-service';

export async function workflowListHandler(
  request: WorkflowListRequest
): Promise<WorkflowListResponse> {
  const workflows = await defaultWorkflowService.listWorkflowSummaries();
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: { workflows }
  };
} 