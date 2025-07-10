import { WorkflowService } from '../services/workflow-service';
import { Workflow } from '../../types/mcp-types';
import { WorkflowNotFoundError } from '../../core/error-handler';

/**
 * Factory function that creates a pure use-case for retrieving workflows.
 * Dependencies are injected at creation time, returning a pure function.
 */
export function createGetWorkflow(service: WorkflowService) {
  return async (workflowId: string): Promise<Workflow> => {
    const workflow = await service.getWorkflowById(workflowId);
    if (!workflow) {
      throw new WorkflowNotFoundError(workflowId);
    }
    return workflow;
  };
}

/**
 * @deprecated Use createGetWorkflow factory function instead
 * Legacy export for backward compatibility
 */
export async function getWorkflow(
  service: WorkflowService,
  workflowId: string
): Promise<Workflow> {
  return createGetWorkflow(service)(workflowId);
} 