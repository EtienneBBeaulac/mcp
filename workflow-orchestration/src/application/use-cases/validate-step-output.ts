import { WorkflowService } from '../services/workflow-service';

export async function validateStepOutput(
  service: WorkflowService,
  workflowId: string,
  stepId: string,
  output: string
): Promise<{ valid: boolean; issues: string[]; suggestions: string[] }> {
  return service.validateStepOutput(workflowId, stepId, output);
} 