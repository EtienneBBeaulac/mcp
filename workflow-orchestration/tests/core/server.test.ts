/**
 * @jest-environment node
 */
import { createWorkflowLookupServer } from '../../src/core/server';
import { describe, it, expect, jest } from '@jest/globals';

describe('WorkflowLookupServer', () => {
  it('should create a server instance', () => {
    const server = createWorkflowLookupServer();
    expect(server).toBeDefined();
    expect(typeof server.start).toBe('function');
    expect(typeof server.stop).toBe('function');
  });

  it('should start and stop without errors', async () => {
    const server = createWorkflowLookupServer();
    
    // Mock console.log to avoid output during tests
    const originalLog = console.log;
    console.log = jest.fn();
    
    try {
      await server.start();
      await server.stop();
      
      expect(console.log).toHaveBeenCalledWith('Initializing Workflow Lookup MCP Server...');
      expect(console.log).toHaveBeenCalledWith('Server ready to accept JSON-RPC requests');
      expect(console.log).toHaveBeenCalledWith('Shutting down Workflow Lookup MCP Server...');
      expect(console.log).toHaveBeenCalledWith('Server stopped');
    } finally {
      console.log = originalLog;
    }
  });
}); 