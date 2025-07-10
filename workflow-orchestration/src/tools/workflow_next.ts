import { WorkflowNextRequest, WorkflowNextResponse, JSONRPCError, MCPErrorCodes } from '../types/mcp-types';
import { getWorkflowById } from '../workflow/storage';

export async function workflowNextHandler(
  request: WorkflowNextRequest
): Promise<WorkflowNextResponse> {
  const workflow = getWorkflowById(request.params.workflowId);
  if (!workflow) {
    throw {
      code: MCPErrorCodes.WORKFLOW_NOT_FOUND,
      message: `Workflow with id '${request.params.workflowId}' not found.`
    } as JSONRPCError;
  }
  const completed = request.params.completedSteps || [];
  const nextStep = workflow.steps.find(step => !completed.includes(step.id)) || null;
  const isComplete = !nextStep;
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      step: nextStep,
      guidance: {
        prompt: nextStep ? nextStep.prompt : 'Workflow complete.',
      },
      isComplete
    }
  };
} 