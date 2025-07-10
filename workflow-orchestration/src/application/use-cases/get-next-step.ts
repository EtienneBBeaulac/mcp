import { WorkflowService } from '../services/workflow-service';
import { WorkflowStep, WorkflowGuidance } from '../../types/mcp-types';

/**
 * Factory function that creates a pure use-case for getting next workflow step.
 * Dependencies are injected at creation time, returning a pure function.
 */
export function createGetNextStep(service: WorkflowService) {
  return async (
    workflowId: string,
    completedSteps: string[]
  ): Promise<{
    step: WorkflowStep | null;
    guidance: WorkflowGuidance;
    isComplete: boolean;
  }> => {
    return service.getNextStep(workflowId, completedSteps);
  };
}

/**
 * @deprecated Use createGetNextStep factory function instead
 * Legacy export for backward compatibility
 */
export async function getNextStep(
  service: WorkflowService,
  workflowId: string,
  completedSteps: string[]
): Promise<{
  step: WorkflowStep | null;
  guidance: WorkflowGuidance;
  isComplete: boolean;
}> {
  return createGetNextStep(service)(workflowId, completedSteps);
} 