import { WorkflowValidateRequest, WorkflowValidateResponse, JSONRPCError, MCPErrorCodes } from '../types/mcp-types';
import { getWorkflowById } from '../workflow/storage';
import { validateWorkflow } from '../workflow/validation';

export async function workflowValidateHandler(
  request: WorkflowValidateRequest
): Promise<WorkflowValidateResponse> {
  const workflow = getWorkflowById(request.params.workflowId);
  if (!workflow) {
    throw {
      code: MCPErrorCodes.WORKFLOW_NOT_FOUND,
      message: `Workflow with id '${request.params.workflowId}' not found.`
    } as JSONRPCError;
  }
  const step = workflow.steps.find(s => s.id === request.params.stepId);
  if (!step) {
    throw {
      code: MCPErrorCodes.STEP_NOT_FOUND,
      message: `Step with id '${request.params.stepId}' not found in workflow.`
    } as JSONRPCError;
  }
  // TODO: Implement real output validation logic
  // For now, just check that output is a non-empty string
  const valid = typeof request.params.output === 'string' && request.params.output.trim().length > 0;
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      valid,
      issues: valid ? [] : ['Output is empty or invalid.'],
      suggestions: valid ? [] : ['Provide a non-empty output.']
    }
  };
} 