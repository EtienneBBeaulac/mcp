import { WorkflowNextRequest, WorkflowNextResponse } from '../types/mcp-types';
import { WorkflowService } from '../services/workflow-service';

export async function workflowNextHandler(
  request: WorkflowNextRequest,
  workflowService: WorkflowService
): Promise<WorkflowNextResponse> {
  const { step, guidance, isComplete } = await workflowService.getNextStep(
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