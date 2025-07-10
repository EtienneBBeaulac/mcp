import { describe, it, expect } from '@jest/globals';
import { loadAllWorkflows, getWorkflowById, listWorkflowSummaries } from '../../src/workflow/storage';
import path from 'path';

describe('Workflow Storage', () => {
  it('should load all valid workflows from the examples directory', () => {
    const workflows = loadAllWorkflows();
    expect(Array.isArray(workflows)).toBe(true);
    expect(workflows.length).toBeGreaterThan(0);
    for (const wf of workflows) {
      expect(typeof wf.id).toBe('string');
      expect(typeof wf.name).toBe('string');
      expect(Array.isArray(wf.steps)).toBe(true);
    }
  });

  it('should get a workflow by ID if it exists', () => {
    const workflows = loadAllWorkflows();
    const first = workflows[0];
    const found = getWorkflowById(first.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(first.id);
  });

  it('should return null for a missing workflow ID', () => {
    const found = getWorkflowById('nonexistent-id-123');
    expect(found).toBeNull();
  });

  it('should list workflow summaries', () => {
    const summaries = listWorkflowSummaries();
    expect(Array.isArray(summaries)).toBe(true);
    expect(summaries.length).toBeGreaterThan(0);
    for (const summary of summaries) {
      expect(typeof summary.id).toBe('string');
      expect(typeof summary.name).toBe('string');
      expect(typeof summary.description).toBe('string');
    }
  });
}); 