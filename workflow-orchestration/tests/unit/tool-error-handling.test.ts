import { WorkflowGetRequest } from '../../src/types/mcp-types';
import { workflowGetHandler } from '../../src/tools/workflow_get';
import { WorkflowNotFoundError } from '../../src/core/error-handler';
import { describe, it, expect } from '@jest/globals';


describe('Tool error handling', () => {
  it('workflow_get should throw WorkflowNotFoundError for missing id', async () => {
    const fakeRequest: WorkflowGetRequest = {
      jsonrpc: '2.0',
      id: 1,
      method: 'workflow_get',
      params: { id: 'non-existent' },
    };

    await expect(workflowGetHandler(fakeRequest)).rejects.toBeInstanceOf(WorkflowNotFoundError);
  });
}); 