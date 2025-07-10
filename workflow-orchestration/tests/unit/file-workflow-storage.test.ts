import { createDefaultWorkflowStorage } from '../../src/workflow/storage';
import { Workflow } from '../../src/types/mcp-types';
import { describe, it, expect } from '@jest/globals';

describe('FileWorkflowStorage', () => {
  const storage = createDefaultWorkflowStorage();

  it('should load workflows from disk', () => {
    const workflows = storage.loadAllWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    const wf = workflows[0]! as Workflow;
    expect(wf).toHaveProperty('id');
    expect(wf).toHaveProperty('steps');
  });

  it('should cache workflows and provide hit/miss stats', () => {
    // Ensure cache is cold by resetting stats via internal API access
    const statsBefore = storage.getCacheStats();

    // First call – should be a miss or at least not decrease counts
    storage.loadAllWorkflows();
    const statsAfterFirst = storage.getCacheStats();
    expect(statsAfterFirst.misses).toBeGreaterThanOrEqual(statsBefore.misses);

    // Second call – should hit cache
    storage.loadAllWorkflows();
    const statsAfterSecond = storage.getCacheStats();
    expect(statsAfterSecond.hits).toBeGreaterThanOrEqual(statsAfterFirst.hits + 1);
  });
}); 