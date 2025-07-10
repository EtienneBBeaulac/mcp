import { WorkflowService } from '../../services/workflow-service';
import { WorkflowStep, WorkflowGuidance } from '../../types/mcp-types';

export async function getNextStep(
  service: WorkflowService,
  workflowId: string,
  completedSteps: string[]
): Promise<{
  step: WorkflowStep | null;
  guidance: WorkflowGuidance;
  isComplete: boolean;
}> {
  return service.getNextStep(workflowId, completedSteps);
} 