import { describe, it, expect } from '@jest/globals';
import { JSONRPCServer } from 'json-rpc-2.0';

import { listWorkflows } from '../../src/application/use-cases/list-workflows';
import { getWorkflow } from '../../src/application/use-cases/get-workflow';
import { DefaultWorkflowService } from '../../src/services/workflow-service';
import { createDefaultWorkflowStorage } from '../../src/infrastructure/storage';
import { JSONRPCResponse } from '../../src/types/mcp-types';

// Helper to wrap tool handlers in the same shape used by createWorkflowLookupServer
function registerHandlers(server: JSONRPCServer) {
  const workflowService = new DefaultWorkflowService(createDefaultWorkflowStorage());
  server.addMethod('workflow_list', async (_params: any) => {
    return { workflows: await listWorkflows(workflowService) };
  });

  server.addMethod('workflow_get', async (params: any) => {
    return await getWorkflow(workflowService, params.id);
  });
}

describe('MCP Server – JSON-RPC integration', () => {
  const server = new JSONRPCServer();
  registerHandlers(server);

  it('workflow_list should return at least one workflow', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 1,
      method: 'workflow_list',
      params: {}
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.result).toBeDefined();
    expect(Array.isArray(response.result.workflows)).toBe(true);
    expect(response.result.workflows.length).toBeGreaterThan(0);
  });

  it('workflow_get should return WORKFLOW_NOT_FOUND error for invalid id', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 2,
      method: 'workflow_get',
      params: { id: 'non-existent' }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.error).toBeDefined();
    expect(response.error!.message.toLowerCase()).toContain('not found');
  });
}); 