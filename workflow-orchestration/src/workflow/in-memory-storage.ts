import { Workflow, WorkflowSummary } from '../types/mcp-types';
import { IWorkflowStorage } from '../types/storage';

/**
 * Very lightweight, non-persistent storage implementation for unit tests
 * or ephemeral execution. Workflows are injected at construction time.
 */
export class InMemoryWorkflowStorage implements IWorkflowStorage {
  private workflows: Workflow[];

  constructor(workflows: Workflow[] = []) {
    this.workflows = [...workflows];
  }

  /** Replace the internal workflow list (useful for tests). */
  public setWorkflows(workflows: Workflow[]): void {
    this.workflows = [...workflows];
  }

  public loadAllWorkflows(): Workflow[] {
    return [...this.workflows];
  }

  public getWorkflowById(id: string): Workflow | null {
    return this.workflows.find((wf) => wf.id === id) || null;
  }

  public listWorkflowSummaries(): WorkflowSummary[] {
    return this.workflows.map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default',
      version: '1.0.0',
    }));
  }
} 