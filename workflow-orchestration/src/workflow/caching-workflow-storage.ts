import { IWorkflowStorage } from '../types/storage';
import { Workflow, WorkflowSummary } from '../types/mcp-types';

interface Cached<T> {
  value: T;
  timestamp: number;
}

/**
 * Decorator that adds simple in-memory TTL caching to any IWorkflowStorage.
 */
export class CachingWorkflowStorage implements IWorkflowStorage {
  private cache: Cached<Workflow[]> | null = null;
  private stats = { hits: 0, misses: 0 };

  constructor(private readonly inner: IWorkflowStorage, private readonly ttlMs: number) {}

  public getCacheStats() {
    return { ...this.stats };
  }

  private isFresh(): boolean {
    return this.cache !== null && Date.now() - this.cache.timestamp < this.ttlMs;
  }

  loadAllWorkflows(): Workflow[] {
    if (this.isFresh()) {
      this.stats.hits += 1;
      return this.cache!.value;
    }
    this.stats.misses += 1;
    const workflows = this.inner.loadAllWorkflows();
    this.cache = { value: workflows, timestamp: Date.now() };
    return workflows;
  }

  getWorkflowById(id: string): Workflow | null {
    return this.loadAllWorkflows().find((wf) => wf.id === id) || null;
  }

  listWorkflowSummaries(): WorkflowSummary[] {
    return this.loadAllWorkflows().map((wf) => ({
      id: wf.id,
      name: wf.name,
      description: wf.description,
      category: 'default',
      version: '1.0.0'
    }));
  }
} 