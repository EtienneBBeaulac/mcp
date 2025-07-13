import { describe, it, expect } from '@jest/globals';
import { JSONRPCServer } from 'json-rpc-2.0';

import { listWorkflows } from '../../src/application/use-cases/list-workflows';
import { getWorkflow } from '../../src/application/use-cases/get-workflow';
import { getNextStep } from '../../src/application/use-cases/get-next-step';
import { validateStepOutput } from '../../src/application/use-cases/validate-step-output';
import { DefaultWorkflowService } from '../../src/application/services/workflow-service';
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

  server.addMethod('workflow_next', async (params: any) => {
    return await getNextStep(workflowService, params.workflowId, params.completedSteps || [], params.context);
  });

  server.addMethod('workflow_validate', async (params: any) => {
    return await validateStepOutput(workflowService, params.workflowId, params.stepId, params.output);
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

  it('workflow_get should return valid workflow for existing id', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 3,
      method: 'workflow_get',
      params: { id: 'coding-task-workflow' }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.result).toBeDefined();
    expect(response.result.id).toBe('coding-task-workflow');
    expect(response.result.name).toBeDefined();
    expect(response.result.description).toBeDefined();
  });

  it('workflow_next should return first step for new workflow', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 4,
      method: 'workflow_next',
      params: { workflowId: 'coding-task-workflow', completedSteps: [] }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.result).toBeDefined();
    expect(response.result.step).toBeDefined();
    expect(response.result.step.id).toBeDefined();
  });

  it('workflow_next should handle invalid workflow id', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 5,
      method: 'workflow_next',
      params: { workflowId: 'non-existent', completedSteps: [] }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.error).toBeDefined();
  });

  it('workflow_validate should validate step output', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 6,
      method: 'workflow_validate',
      params: { 
        workflowId: 'coding-task-workflow', 
        stepId: 'phase-0-intelligent-triage',
        output: 'Test output for validation'
      }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.result).toBeDefined();
    expect(typeof response.result.valid).toBe('boolean');
  });

  it('workflow_validate should handle missing parameters', async () => {
    const request = {
      jsonrpc: '2.0',
      id: 7,
      method: 'workflow_validate',
      params: { workflowId: 'test' }
    } as any;
    const response = (await server.receive(request)) as JSONRPCResponse;
    expect(response.error).toBeDefined();
  });

  describe('Server Configuration Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = [
        { jsonrpc: '2.0' as const, id: 8, method: 'workflow_list', params: {} },
        { jsonrpc: '2.0' as const, id: 9, method: 'workflow_get', params: { id: 'coding-task-workflow' } }
      ];

      const responses = await Promise.all(requests.map(req => server.receive(req as any)));
      
      expect(responses).toHaveLength(2);
      responses.forEach(response => {
        expect((response as JSONRPCResponse).result).toBeDefined();
      });
    });

    it('should handle invalid JSON-RPC requests gracefully', async () => {
      const invalidRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'invalid_method',
        params: {}
      } as any;
      
      const response = (await server.receive(invalidRequest)) as JSONRPCResponse;
      expect(response.error).toBeDefined();
      expect(response.error!.code).toBe(-32601); // Method not found
    });
  });
}); 