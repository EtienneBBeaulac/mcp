import { WorkflowGetRequest, WorkflowGetResponse, JSONRPCError, MCPErrorCodes } from '../types/mcp-types';
import { getWorkflowById } from '../workflow/storage';

export async function workflowGetHandler(
  request: WorkflowGetRequest
): Promise<WorkflowGetResponse> {
  const workflow = getWorkflowById(request.params.id);
  if (workflow) {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: workflow
    };
  } else {
    // Return JSON-RPC error response for not found
    throw {
      code: MCPErrorCodes.WORKFLOW_NOT_FOUND,
      message: `Workflow with id '${request.params.id}' not found.`
    } as JSONRPCError;
  }
} 