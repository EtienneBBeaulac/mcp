import { WorkflowListRequest, WorkflowListResponse } from '../types/mcp-types';
import { WorkflowService } from '../services/workflow-service';

export async function workflowListHandler(
  request: WorkflowListRequest,
  workflowService: WorkflowService
): Promise<WorkflowListResponse> {
  const workflows = await workflowService.listWorkflowSummaries();
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: { workflows }
  };
} 