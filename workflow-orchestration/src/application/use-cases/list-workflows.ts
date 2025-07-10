import { WorkflowService } from '../services/workflow-service';
import { WorkflowSummary } from '../../types/mcp-types';

/**
 * Pure use-case: list all available workflow summaries.
 */
export async function listWorkflows(
  service: WorkflowService
): Promise<WorkflowSummary[]> {
  return service.listWorkflowSummaries();
} 