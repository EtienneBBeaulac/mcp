import { describe, it, expect } from '@jest/globals';
import { JSONRPCServer } from 'json-rpc-2.0';

import { workflowListHandler } from '../../src/tools/workflow_list';
import { workflowGetHandler } from '../../src/tools/workflow_get';
import { JSONRPCResponse } from '../../src/types/mcp-types';

// Helper to wrap tool handlers in the same shape used by createWorkflowLookupServer
function registerHandlers(server: JSONRPCServer) {
  server.addMethod('workflow_list', async (params: any) => {
    return (
      await workflowListHandler({ jsonrpc: '2.0', id: 0, method: 'workflow_list', params } as any)
    ).result;
  });

  server.addMethod('workflow_get', async (params: any) => {
    try {
      return (
        await workflowGetHandler({ jsonrpc: '2.0', id: 0, method: 'workflow_get', params } as any)
      ).result;
    } catch (err: any) {
      // Preserve MCP error shape so JSONRPCServer can include it in the response
      throw err;
    }
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