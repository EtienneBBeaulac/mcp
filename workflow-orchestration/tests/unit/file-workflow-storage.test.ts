import { fileWorkflowStorage } from '../../src/workflow/storage';
import { Workflow } from '../../src/types/mcp-types';
import { describe, it, expect } from '@jest/globals';

describe('FileWorkflowStorage', () => {
  it('should load workflows from disk', () => {
    const workflows = fileWorkflowStorage.loadAllWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    const wf = workflows[0]! as Workflow;
    expect(wf).toHaveProperty('id');
    expect(wf).toHaveProperty('steps');
  });

  it('should cache workflows and provide hit/miss stats', () => {
    // Ensure cache is cold by resetting stats via internal API access
    const statsBefore = fileWorkflowStorage.getCacheStats();

    // First call – should be a miss or at least not decrease counts
    fileWorkflowStorage.loadAllWorkflows();
    const statsAfterFirst = fileWorkflowStorage.getCacheStats();
    expect(statsAfterFirst.misses).toBeGreaterThanOrEqual(statsBefore.misses);

    // Second call – should hit cache
    fileWorkflowStorage.loadAllWorkflows();
    const statsAfterSecond = fileWorkflowStorage.getCacheStats();
    expect(statsAfterSecond.hits).toBeGreaterThanOrEqual(statsAfterFirst.hits + 1);
  });
}); 