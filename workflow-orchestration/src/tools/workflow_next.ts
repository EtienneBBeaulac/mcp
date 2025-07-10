import { WorkflowNextRequest, WorkflowNextResponse } from '../types/mcp-types';
import { defaultWorkflowService } from '../services/workflow-service';

export async function workflowNextHandler(
  request: WorkflowNextRequest
): Promise<WorkflowNextResponse> {
  const { step, guidance, isComplete } = await defaultWorkflowService.getNextStep(
    request.params.workflowId,
    request.params.completedSteps || []
  );
  return {
    jsonrpc: '2.0',
    id: request.id,
    result: {
      step,
      guidance,
      isComplete
    }
  };
} 