import { WorkflowService } from '../../services/workflow-service';
import { Workflow } from '../../types/mcp-types';
import { WorkflowNotFoundError } from '../../core/error-handler';

/**
 * Pure use-case: retrieve a workflow by its identifier.
 * Throws {@link WorkflowNotFoundError} if the workflow does not exist.
 */
export async function getWorkflow(
  service: WorkflowService,
  workflowId: string
): Promise<Workflow> {
  const workflow = await service.getWorkflowById(workflowId);
  if (!workflow) {
    throw new WorkflowNotFoundError(workflowId);
  }
  return workflow;
} 