import { createWorkflowLookupServer } from '../../src/core/server';

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
      
      expect(console.log).toHaveBeenCalledWith('Server starting...');
      expect(console.log).toHaveBeenCalledWith('Server stopping...');
    } finally {
      console.log = originalLog;
    }
  });
}); 