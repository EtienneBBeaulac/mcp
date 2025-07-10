import { InMemoryWorkflowStorage } from '../../src/workflow/in-memory-storage';
import { describe, it, expect } from '@jest/globals';


describe('InMemoryWorkflowStorage', () => {
  it('should return workflows provided at construction', () => {
    const storage = new InMemoryWorkflowStorage([
      {
        id: 'demo',
        name: 'Demo',
        description: 'Demo workflow',
        steps: [],
      },
    ] as any);

    const list = storage.loadAllWorkflows();
    expect(list).toHaveLength(1);
    expect(storage.getWorkflowById('demo')).not.toBeNull();
    expect(storage.getWorkflowById('missing')).toBeNull();
  });
}); 