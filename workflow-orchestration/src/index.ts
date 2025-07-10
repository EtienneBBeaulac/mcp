#!/usr/bin/env node

import { createWorkflowLookupServer } from './core/server';
import { DefaultWorkflowService } from './services/workflow-service';
import { createDefaultWorkflowStorage } from './workflow/storage';

async function main() {
  try {
    const workflowService = new DefaultWorkflowService(createDefaultWorkflowStorage());
    const server = createWorkflowLookupServer(workflowService);
    await server.start();
    console.log('Workflow Lookup MCP Server started successfully');

    // Graceful shutdown on SIGINT/SIGTERM
    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down...`);
      await server.stop();
      process.exit(0);
    };
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { createWorkflowLookupServer }; 